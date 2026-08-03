# IGNYT — Security posture

Written against the 14-point brief. Status per item is what the code actually does today,
not what is planned. Where something is not done, the blocker is named.

---

## Summary

| # | Requirement | Status |
|---|---|---|
| 1 | AES-256 encryption of sensitive data at rest | **Partial** — engine done and used by backups; not yet wrapping the main store |
| 2 | Encryption keys in Android Keystore | **Done** |
| 3 | HTTPS/TLS 1.2+ for all network traffic | **Done** |
| 4 | Backend verification of Play subscriptions | **Not done** — blocked, needs a Google service account |
| 5 | Firebase Auth, never manual password handling | **Done** |
| 6 | API keys and secrets backend-only, in env vars | **Done** |
| 7 | Encrypt sensitive Firestore fields | **Not done** |
| 8 | Certificate pinning | **Not done** — blocked, needs the production domain |
| 9 | Root / tamper detection | **Done**, with a caveat that matters |
| 10 | Encrypted backups | **Done** |
| 11 | Replay and token-theft protection | **Partial** — inherited from Firebase; nothing app-specific |
| 12 | Security logging without exposing user data | **Done** |
| 13 | OWASP MASVS alignment | **Partial** — see the section below |
| 14 | Production-ready for health data | **Not yet** — three items above must land first |

---

## What is done

### 2. Keys in the Android Keystore

`android/.../security/CryptoPlugin.kt`. Keys are *generated inside* the Keystore, never
generated in app memory and imported. The distinction is the whole point: a key created with
`KeyGenParameterSpec` against the `AndroidKeyStore` provider has no exportable form, so there
is no API — for this app or for anything that compromises it — that returns the bytes. The
private material lives in the TEE, or in StrongBox on hardware that has it.

StrongBox is requested and falls back silently if the device lacks it. `keystoreInfo()` reports
which level was actually obtained (`strongbox` / `tee` / `software`) so the answer is
observable rather than assumed.

Three separate aliases — `ignyt.datastore.v1`, `ignyt.field.v1`, `ignyt.backup.v1` — so one can
be rotated or destroyed without invalidating the others.

### 1. AES-256-GCM (engine complete, main store not yet wrapped)

GCM, not CBC: it authenticates as well as encrypts, so modified ciphertext fails loudly instead
of decrypting to plausible garbage. A fresh 12-byte IV comes from the `Cipher` on every encrypt
and is prefixed to the output; `setRandomizedEncryptionRequired(true)` makes the Keystore refuse
a caller-supplied IV outright. 128-bit tag.

**What is not done:** `LS.get`/`LS.set` in `app.js` are synchronous and called on the order of
forty times per render, while Capacitor plugin calls are asynchronous. Wrapping the main store
means a decrypt-once-at-boot-into-memory layer with debounced re-encryption on write, plus a
migration that reads plaintext when no ciphertext exists and — critically — never overwrites
data it merely failed to read. That is a real piece of work with a real data-loss failure mode,
and it is not written yet. Today the engine is proven by the backup path only.

### 3. TLS

`network_security_config.xml` permits cleartext only for local development addresses; everything
else is HTTPS. Android 8+ (minSdk 26) negotiates TLS 1.2 as a floor, and TLS 1.3 where the
server offers it.

### 5. Firebase Auth

The app never stores, hashes, or transmits a password itself. Credentials go to the Firebase SDK
and what comes back is a token. The backend (`backend/app/auth/firebase.py`) verifies that token
against Google's public keys and derives the uid from the verified claims — it never accepts a
client-supplied uid, which is the mistake that makes the whole scheme decorative.

### 6. Secrets

Backend-only, read from environment variables, with `backend/.env.example` documenting the shape
and `.env` gitignored.

### 9. Root and tamper detection — read the caveat

`IntegrityPlugin.kt` reports `suBinaryPresent`, `rootPackageInstalled`, `testKeysBuild`,
`debuggerAttached`, `debuggableBuild`, `emulator`, `installer`, `expectedInstaller`,
`signatureSha256` and a `rootSignalCount`.

**These checks run inside the process they are vetting.** Anything with root can defeat all of
them — Magisk's DenyList exists precisely to hide from this class of check, and Frida can patch
the results on the way out. So the plugin deliberately exposes no `isSafe` boolean, and the app
uses the result for exactly one thing: a line in the local security log. Nothing is gated on it.

Gating on it would be worse than useless. It would inconvenience honest users on unlocked
developer phones and custom ROMs while anyone actually hiding walks straight past. The real
integrity boundary is server-side, and the signing hash is *reported* rather than compared
locally for the same reason — a local comparison is patched by whoever patched the client. The
backend should compare it. Play Integrity API is the supported answer for attestation and is
deliberately not reimplemented badly here.

### 10. Encrypted backups

`www/js/security/security.js`, exposed as "Encrypted Backup" in Settings → Export Data.
AES-256-GCM with the key derived from a user passphrase by PBKDF2-SHA256 at 210,000 iterations
(OWASP's 2023 floor), fresh salt and IV per file, parameters carried in the envelope so a future
version can still open it.

Deliberately **not** the Keystore key. That key cannot leave the handset, so a backup encrypted
with it could never be restored to a new phone — which is most of what a backup is for. The
consequence is that a lost passphrase means a lost backup, with no reset. The sheet says so in
those words rather than burying it.

Import detects the envelope, asks for the passphrase, and then runs the decrypted contents
through the *same* validation as any other import. Encryption establishes who wrote a file, not
that its contents are well-formed.

### 12. Security event logging

Rolling 200-entry local log. Events: `auth.signin`, `auth.signup`, `auth.signout`,
`device.integrity`, `backup.encrypted`, `backup.restored`, `backup.decrypt.failed`.

The detail payload is filtered by an **allowlist of key names**. Everything else is dropped
whole — the name as well as the value, because `hasDiabetes: "[redacted]"` redacts nothing.

This is worth explaining, because the first version was wrong. It tried to *recognise* user data:
drop anything containing an `@`, anything with a long run of digits, anything over 24 characters.
A test walked through it immediately — a 24-character Firebase uid has no `@`, no digit run, and
fits the length bound, so it was stored verbatim; and `weightKg: 72.5` is a finite number, so it
passed the rule that admitted counters. Both are precisely what the function exists to stop.

The lesson generalises, so the design changed rather than the patterns. You cannot write a rule
for what user data looks like, because the next field will not look like it. An allowlist inverts
the default: a new call site that invents `bodyFatPct` gets it dropped silently instead of leaking
until someone happens to read the log.

Numbers are rounded and clamped, so an allowlisted key cannot smuggle a measurement's precision
through — `72.5` is data, `72` is a count. No email, uid, or Firebase error string is ever
recorded; "there is no user record for that identifier" is a user-enumeration answer and a log is
a bad place to keep one.

---

## What is not done, and why

### 4. Backend verification of Play subscriptions — **blocked on you**

The route does not exist. Writing it needs a Google Play service account with
`androidpublisher` scope, and the JSON credential for it, which only you can create in the Google
Cloud console and grant in Play Console. Until then, subscription state is client-asserted, which
means it is not verified at all.

### 7. Firestore field encryption

Not implemented. `CryptoPlugin`'s `ignyt.field.v1` alias exists for it. Note the real trade
before this lands: an encrypted field cannot be queried or range-filtered server-side, so this
needs a decision about which fields are genuinely sensitive versus which ones sync and sort needs
in the clear.

### 8. Certificate pinning — **blocked on you**

Needs the production backend's real domain and its certificate pins. `js/config.js` currently
records that nothing in the app calls the backend at all, so there is no live connection to pin.
Pinning also needs a backup pin and a rotation plan; a single pin plus a certificate renewal is a
self-inflicted outage that only an app update can fix.

### 11. Replay and token-theft protection

What exists is what Firebase provides: short-lived ID tokens (one hour), refresh tokens revocable
server-side, and backend verification of `exp`/`iat`/`aud`/`iss` on every request. There is no
app-specific nonce or device-binding layer, and nothing in the app currently detects a token used
from two devices at once. Doing better than Firebase's defaults here needs a server that sees
enough traffic to judge, which is the same blocker as #4.

---

## 13. OWASP MASVS

Honest reading by category:

- **STORAGE** — partial. Backups are encrypted; the main store is not yet. Nothing sensitive goes
  to logs.
- **CRYPTO** — good. AES-256-GCM, keys generated non-exportably in hardware, no home-grown
  primitives, no hardcoded keys, IVs from the platform CSPRNG and never reused.
- **AUTH** — good on the client, gated on #4 server-side.
- **NETWORK** — TLS enforced; pinning outstanding (#8).
- **PLATFORM** — no exported components beyond what Capacitor requires; no `addJavascriptInterface`
  beyond the Capacitor bridge.
- **CODE** — dependencies pinned; Health Connect held at 1.1.0 deliberately.
- **RESILIENCE** — signals only, by design and by argument (see #9). MASVS-R is explicitly the tier
  that assumes a determined attacker with the device, and this app does not claim that tier.

## 14. Production readiness for health data

Not yet, and the gap is specific rather than general: **#1 wrapping the main store**, **#4 backend
subscription verification**, and **#8 pinning** once there is a backend to pin to.

One more thing, outside the 14 points and larger than most of them: **your Firestore Security
Rules are not in this repository and have never been reviewed.** Every client-side control here is
advisory; the rules are the thing that actually decides which uid can read which document. If they
are permissive, none of the above matters. That is the highest-value security review available to
this project right now, and it cannot be done from this repo.
