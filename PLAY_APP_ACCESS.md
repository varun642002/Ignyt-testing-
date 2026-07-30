# Google Play — App Access declaration

For **Play Console → App content → App access**.

IGNYT requires an account to reach any feature, so the correct selection is
**"All or some functionality is restricted"**, with one credential set covering the whole app.

---

## Step 1 — create the account (you, ~60 seconds)

It has to be you: creating it means choosing a password, and that is not something to hand to a
tool or paste into a chat log. It is one flow in the app.

1. Install `IGNYT-1.0.40-vc9.apk` on any device.
2. On the sign-in screen tap **Create account**.
3. Enter the address and a password you choose.
   - Policy: **at least 8 characters, with a letter and a number.**
   - Suggested address: `reviewer@ignyt.app` (or any address you control).
4. Tap **Create Account**. The account exists in Firebase from that moment.

Do not use a personal address — these credentials go into a Play Console form and are visible
to Google's review team.

Confirm it in Firebase Console → Authentication → Users. The account should be listed with
provider "Password".

---

## Step 2 — paste this into App Access

**Access requirements:** All or some functionality is restricted

**Name:** `Full app access`

**Username:** `reviewer@ignyt.app`
**Password:** *(the one you chose)*

**Any other instructions:**

> Launch IGNYT. The sign-in screen appears immediately.
>
> Enter the email address and password above and tap Continue.
>
> Every feature is available straight after sign-in. There is no email verification step, no
> phone number, no SMS, and no paid tier — the account reaches the whole app.
>
> The app is a local fitness tracker: workouts, food logging, diet plans, fasting, supplements,
> progress photos and reminders. Health Connect and notification permissions are requested
> during onboarding and can both be declined without losing access to anything.

---

## Verified, so the reviewer is not blocked

Checked in the shipped build rather than assumed:

| Condition | Result |
|---|---|
| Is email verification enforced? | **No.** An unverified account gets full access. The only effect is a dismissible "Email not verified" banner in Settings, next to a Resend button. |
| Is a phone number needed anywhere? | **No.** Phone/SMS authentication was removed entirely — a reviewer with no Indian number is unaffected. |
| Is Google Sign-In needed? | **No.** Removed; email and password is the only method. Briefly restored during testing and removed again — it does not appear in any shipped build. |
| What does the gate actually check? | `isSignedIn()` returns whether a cached account exists. Nothing else — no verification flag, no subscription, no entitlement. |
| Is there a paid tier to unlock? | **No.** The app has no billing library and no subscription. |

---

## Two things that must be done before submitting

Neither is in the app, and email sign-in will fail for Play-installed users without the first.

1. **Register the Play App Signing SHA-256 in Firebase.**
   The AAB is signed with the upload key, but Google re-signs it before shipping, so users run
   under a *third* certificate. Copy its SHA-256 from
   **Play Console → Setup → App integrity → App signing key certificate** and add it under
   **Firebase Console → Project settings → Your apps → com.varun.ignyt**.

   **Done.** All six are now registered — SHA-1 and SHA-256 for the debug (`B7:55:60:B3…`),
   upload (`F7:90:11:16…`) and Play App Signing (`94:1F:08:4F…`) certificates.

2. **Enable the Play Integrity API** on the Cloud project `ignyt-fitness2`:
   https://console.cloud.google.com/apis/library/playintegrity.googleapis.com?project=ignyt-fitness2

   Less critical now that phone auth is gone — it was that path which depended on it — but Play
   expects it for an app using Firebase Auth.

---

## Build this documents

| | |
|---|---|
| Version | 1.0.40 (versionCode 9) |
| Bundle | `IGNYT-1.0.40-vc9.aab` |
| APK | `IGNYT-1.0.40-vc9.apk` |
| Package | `com.varun.ignyt` |
| Auth | Email and password only |
