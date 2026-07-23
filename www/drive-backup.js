/* =========================================================
   IGNYT DRIVE BACKUP — manual cloud backup/restore to the user's own
   Google Drive, via the hand-rolled native IgnytDrive plugin (Google
   Identity Services Authorization API for a drive.file-scoped OAuth
   grant + a raw Drive v3 REST client -- no @capacitor/* filesystem/
   share plugin, no google-api-services-drive client library; same
   "no third-party Capacitor plugin, minimal new deps" convention as
   every other IGNYT native plugin).

   Scope: connect/disconnect, Back Up Now (full JSON backup -- same
   payload buildFullBackupPayload() in app.js already produces for local
   export), list backups in the "IGNYT Backups" Drive folder (newest
   first, auto-pruned to the 10 most recent), Restore a chosen backup
   with Merge or Replace (validateBackupPayload/applyBackupPayload/
   mergeStoredValue in app.js -- shared with local JSON import so both
   paths behave identically), Delete a backup, and scheduled Daily/
   Weekly/Monthly automatic backups with Wi-Fi-only/charging-only
   constraints and a backup reminder notification.

   HOW SCHEDULING ACTUALLY WORKS (important, not a shortcut): a real
   Drive upload needs the app's live localStorage data, which only the
   WebView can produce. There is no reliable way to run that from a
   plain background BroadcastReceiver in a Capacitor app without either
   reverse-engineering the WebView's on-disk storage format or running a
   heavy, intrusive foreground-service-hosted headless WebView. So the
   native side (BackupReminderScheduler) only arms an AlarmManager alarm
   that shows a "time for your backup" notification; tapping it opens
   the app, and maybeRunScheduledBackup() below (called once at boot)
   does the real work -- checks whether enough time has passed for the
   chosen frequency AND (if set) that Wi-Fi/charging constraints are
   currently true, then silently runs backupNow(). This is the same
   honest "runs when the app is next opened" trade-off already
   documented elsewhere in this app (Health Connect refresh, cloud sync
   foreground triggers) -- not literally a 2am background upload.

   END-TO-END ENCRYPTION (backup-encryption.js, IgnytBackupCrypto): optional,
   off by default. When enabled, the JSON payload is AES-256-GCM encrypted
   (PBKDF2-derived key) client-side before upload and decrypted client-side
   after download -- Drive only ever sees ciphertext. The passphrase is
   NEVER persisted anywhere, only cached in a module-level JS variable for
   the current app session (cleared on app close/reload). Manual Back Up
   Now / Restore prompt for it via app.js's promptPassphrase() when not
   already cached; the silent scheduled-backup path (maybeRunScheduledBackup)
   deliberately does NOT prompt -- it just skips that cycle if no passphrase
   is cached, since popping a passphrase dialog at cold-start boot would be
   startling, and tries again next time the app is opened.

   DELIBERATELY NOT IN THIS INCREMENT (queued, not silently dropped):
   incremental (diff) uploads, a dedicated version-history/rollback UI
   beyond list+restore, and true multi-device real-time sync (a different
   feature from backup -- would extend the EXISTING Firestore-based
   CloudSyncPlugin/cloud-sync.js, not Drive).
========================================================= */

const IgnytDriveBackup = (() => {

  const STATE_KEY = "hx_drive_backup_state"; // {lastBackupAt, lastBackupSizeBytes, account:{...}, schedule:{...}, encryption:{enabled}}
  let _busy = false;
  let _lastError = null;
  let _sessionPassphrase = null; // NEVER persisted -- cleared whenever the app process ends

  function isNative(){
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function plugin(){
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytDrive) || null;
  }

  function loadState(){ return LS.get(STATE_KEY, {}); }
  function saveState(patch){ LS.set(STATE_KEY, Object.assign(loadState(), patch)); }

  async function isConfigured(){
    const p = plugin();
    if(!p) return false;
    try{ const res = await p.isConfigured(); return !!(res && res.configured); }
    catch(e){ return false; }
  }

  async function connect(){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    _busy = true; _lastError = null;
    try{
      const res = await p.connect();
      if(res && res.success && res.data && res.data.account){
        saveState({ account: res.data.account });
        return { success:true, account: res.data.account };
      }
      _lastError = (res && res.error) || "Couldn't connect to Google Drive.";
      return { success:false, error:_lastError };
    }catch(e){
      _lastError = e && e.message || "Couldn't connect to Google Drive.";
      return { success:false, error:_lastError };
    }finally{ _busy = false; }
  }

  async function disconnect(){
    const p = plugin();
    try{ if(p) await p.disconnect(); }catch(e){ /* local state clears regardless */ }
    saveState({ account: null, lastBackupAt: null, lastBackupSizeBytes: null });
  }

  function getAccountInfo(){
    return loadState().account || null;
  }

  function isConnected(){
    return !!getAccountInfo();
  }

  function getEncryptionSettings(){
    return Object.assign({ enabled:false }, loadState().encryption || {});
  }
  function setEncryptionEnabled(enabled){
    saveState({ encryption: { enabled: !!enabled } });
    if(!enabled) _sessionPassphrase = null; // nothing left to decrypt for this session -- drop it
  }
  function hasSessionPassphrase(){ return !!_sessionPassphrase; }
  function setSessionPassphrase(p){ _sessionPassphrase = p || null; }
  function forgetSessionPassphrase(){ _sessionPassphrase = null; }

  async function backupNow(){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    if(_busy) return { success:false, error:"A Drive operation is already in progress." };
    const enc = getEncryptionSettings();
    if(enc.enabled && !_sessionPassphrase){
      return { success:false, needsPassphrase:true, error:"Enter your backup passphrase first." };
    }
    _busy = true; _lastError = null;
    try{
      let payload = JSON.stringify(buildFullBackupPayload());
      if(enc.enabled){
        payload = await window.IgnytBackupCrypto.encrypt(payload, _sessionPassphrase);
      }
      const fileName = "ignyt-backup-"+new Date().toISOString().replace(/[:.]/g,"-")+(enc.enabled?".enc":"")+".json";
      const res = await p.backupNow({ content: payload, fileName });
      if(res && res.success){
        saveState({ lastBackupAt: Date.now(), lastBackupSizeBytes: payload.length });
        return { success:true, data: res.data };
      }
      _lastError = (res && res.error) || "Backup failed.";
      return { success:false, error:_lastError };
    }catch(e){
      _lastError = e && e.message || "Backup failed.";
      return { success:false, error:_lastError };
    }finally{ _busy = false; }
  }

  async function listBackups(){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app.", backups:[] };
    try{
      const res = await p.listBackups();
      if(res && res.success) return { success:true, backups: (res.data && res.data.backups) || [] };
      return { success:false, error:(res && res.error) || "Couldn't list backups.", backups:[] };
    }catch(e){
      return { success:false, error: e && e.message || "Couldn't list backups.", backups:[] };
    }
  }

  /** mode: "merge" or "replace". Downloads the chosen backup, transparently decrypts it if it's
   *  an IgnytBackupCrypto envelope (passphrase from the session cache, or {needsPassphrase:true}
   *  if not cached -- caller should prompt and retry), validates it (same rules as local JSON
   *  import), and applies it via applyBackupPayload (app.js). Reloads the app on success so
   *  every screen picks up the restored data, same as local Import already does. */
  async function restoreBackup(fileId, mode, passphraseOverride){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    if(_busy) return { success:false, error:"A Drive operation is already in progress." };
    _busy = true; _lastError = null;
    try{
      const res = await p.downloadBackup({ fileId });
      if(!res || !res.success){
        _lastError = (res && res.error) || "Couldn't download that backup.";
        return { success:false, error:_lastError };
      }
      let contentStr = res.data.content;
      if(window.IgnytBackupCrypto && window.IgnytBackupCrypto.isEncryptedEnvelope(contentStr)){
        const passphrase = passphraseOverride || _sessionPassphrase;
        if(!passphrase){
          return { success:false, needsPassphrase:true, error:"This backup is encrypted — enter your passphrase." };
        }
        try{
          contentStr = await window.IgnytBackupCrypto.decrypt(contentStr, passphrase);
          _sessionPassphrase = passphrase; // confirmed correct -- cache for the rest of the session
        }catch(e){
          _lastError = e.message || "Incorrect passphrase.";
          return { success:false, error:_lastError, wrongPassphrase:true };
        }
      }
      let parsed;
      try{ parsed = JSON.parse(contentStr); }
      catch(e){ _lastError = "That backup file isn't valid JSON."; return { success:false, error:_lastError }; }
      const v = validateBackupPayload(parsed);
      if(!v.ok){ _lastError = v.error; return { success:false, error:v.error }; }
      applyBackupPayload(v.staged, mode==="merge" ? "merge" : "replace");
      return { success:true, restoredKeys: Object.keys(v.staged).length };
    }catch(e){
      _lastError = e && e.message || "Restore failed.";
      return { success:false, error:_lastError };
    }finally{ _busy = false; }
  }

  async function deleteBackup(fileId){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    try{
      const res = await p.deleteBackup({ fileId });
      return res && res.success ? { success:true } : { success:false, error:(res && res.error) || "Couldn't delete that backup." };
    }catch(e){
      return { success:false, error: e && e.message || "Couldn't delete that backup." };
    }
  }

  function getStatus(){
    const s = loadState();
    return {
      connected: !!s.account,
      account: s.account || null,
      lastBackupAt: s.lastBackupAt || null,
      lastBackupSizeBytes: s.lastBackupSizeBytes || null,
      busy: _busy,
      lastError: _lastError
    };
  }

  function getScheduleSettings(){
    return Object.assign({ frequency:"manual", wifiOnly:false, chargingOnly:false }, loadState().schedule || {});
  }

  async function scheduleBackups({ frequency, wifiOnly, chargingOnly }){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    try{
      const res = await p.scheduleBackupReminder({ frequency, wifiOnly:!!wifiOnly, chargingOnly:!!chargingOnly });
      if(res && res.success){
        saveState({ schedule: { frequency, wifiOnly:!!wifiOnly, chargingOnly:!!chargingOnly } });
        return { success:true };
      }
      return { success:false, error:(res && res.error) || "Couldn't set the backup schedule." };
    }catch(e){
      return { success:false, error: e && e.message || "Couldn't set the backup schedule." };
    }
  }

  const FREQUENCY_MS = { daily: 86400000, weekly: 7*86400000, monthly: 30*86400000 };

  function dueForScheduledBackup(){
    const sched = getScheduleSettings();
    const ms = FREQUENCY_MS[sched.frequency];
    if(!ms) return false; // "manual"
    const last = loadState().lastBackupAt || 0;
    return (Date.now() - last) >= ms;
  }

  /** Called once at boot (app.js). Silently runs the scheduled backup if due and any
   *  Wi-Fi-only/charging-only constraint is currently satisfied; otherwise a no-op that will
   *  simply be checked again next time the app opens. Never shows its own UI -- returns a
   *  result the caller can toast if it wants. */
  async function maybeRunScheduledBackup(){
    const p = plugin();
    if(!p || !isConnected() || !dueForScheduledBackup()) return { ran:false };
    if(getEncryptionSettings().enabled && !_sessionPassphrase){
      return { ran:false, reason:"encryption passphrase not entered this session" };
    }
    const sched = getScheduleSettings();
    if(sched.wifiOnly || sched.chargingOnly){
      try{
        const res = await p.checkConstraints();
        const c = (res && res.data) || {};
        if(sched.wifiOnly && !c.wifiConnected) return { ran:false, reason:"waiting for Wi-Fi" };
        if(sched.chargingOnly && !c.charging) return { ran:false, reason:"waiting for charging" };
      }catch(e){ return { ran:false }; } // can't confirm constraints -- skip rather than risk a metered upload
    }
    const res = await backupNow();
    return { ran:true, success: res.success, error: res.error };
  }

  return {
    isNativeAndroid: isNative,
    isConfigured,
    connect,
    disconnect,
    isConnected,
    getAccountInfo,
    backupNow,
    listBackups,
    restoreBackup,
    deleteBackup,
    getStatus,
    getScheduleSettings,
    scheduleBackups,
    maybeRunScheduledBackup,
    getEncryptionSettings,
    setEncryptionEnabled,
    hasSessionPassphrase,
    setSessionPassphrase,
    forgetSessionPassphrase
  };
})();

window.IgnytDriveBackup = IgnytDriveBackup;
