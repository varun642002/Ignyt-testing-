/* =========================================================
   IGNYT BACKUP ENCRYPTION — end-to-end encryption for Google Drive
   backups using a user-generated passphrase. Pure WebCrypto (available
   in every modern WebView/browser, zero new dependency, zero native
   code) -- AES-256-GCM (authenticated encryption: a wrong passphrase or
   tampered file fails to decrypt loudly, never silently returns
   garbage) with a key derived via PBKDF2-SHA256 (250,000 iterations).

   "End-to-end" here means genuinely that: the passphrase is NEVER
   stored anywhere, NEVER sent anywhere, and NEVER included in the
   uploaded file. Only the random salt/IV/iteration count travel with
   the ciphertext (they aren't secret -- that's how PBKDF2/AES-GCM are
   designed to work). If the user forgets their passphrase, IGNYT has
   no way to recover their encrypted backups -- this is a real trade-off
   of real E2E encryption, not a bug, and the UI (app.js) says so.
========================================================= */

const IgnytBackupCrypto = (() => {

  const ITERATIONS = 250000;
  const ENC = new TextEncoder();
  const DEC = new TextDecoder();

  // btoa/atob only take binary strings, and spreading a large Uint8Array into
  // String.fromCharCode risks "Maximum call stack size exceeded" -- chunk it.
  function bytesToB64(bytes){
    const arr = new Uint8Array(bytes);
    let binary = "";
    const CHUNK = 0x8000;
    for(let i=0;i<arr.length;i+=CHUNK) binary += String.fromCharCode.apply(null, arr.subarray(i, i+CHUNK));
    return btoa(binary);
  }
  function b64ToBytes(str){
    const binary = atob(str);
    const out = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function deriveKey(passphrase, salt, iterations){
    const baseKey = await crypto.subtle.importKey("raw", ENC.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations, hash:"SHA-256" },
      baseKey,
      { name:"AES-GCM", length:256 },
      false,
      ["encrypt","decrypt"]
    );
  }

  async function encrypt(plaintext, passphrase){
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, ITERATIONS);
    const ciphertext = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, ENC.encode(plaintext));
    return JSON.stringify({
      ignytEncrypted: true, v: 1, kdf: "PBKDF2-SHA256", iterations: ITERATIONS,
      salt: bytesToB64(salt), iv: bytesToB64(iv), ciphertext: bytesToB64(ciphertext)
    });
  }

  function isEncryptedEnvelope(contentString){
    try{ const o = JSON.parse(contentString); return !!(o && o.ignytEncrypted===true); }
    catch(e){ return false; }
  }

  async function decrypt(envelopeString, passphrase){
    let env;
    try{ env = JSON.parse(envelopeString); }
    catch(e){ throw new Error("This file isn't a valid IGNYT encrypted backup."); }
    if(!env || !env.ignytEncrypted) throw new Error("This backup isn't encrypted.");
    const salt = b64ToBytes(env.salt), iv = b64ToBytes(env.iv), ciphertext = b64ToBytes(env.ciphertext);
    const key = await deriveKey(passphrase, salt, env.iterations || ITERATIONS);
    try{
      const plainBuf = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ciphertext);
      return DEC.decode(plainBuf);
    }catch(e){
      // AES-GCM's auth tag check failing is indistinguishable from "wrong key" -- which is
      // exactly what a wrong passphrase produces. Never surfaces raw crypto internals to the user.
      throw new Error("Incorrect passphrase — couldn't decrypt this backup.");
    }
  }

  return { encrypt, decrypt, isEncryptedEnvelope };
})();

window.IgnytBackupCrypto = IgnytBackupCrypto;
