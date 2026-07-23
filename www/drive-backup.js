/* =========================================================
   IGNYT DRIVE BACKUP — manual cloud backup/restore to the user's own
   Google Drive, via the hand-rolled native IgnytDrive plugin (Google
   Identity Services Authorization API for a drive.file-scoped OAuth
   grant + a raw Drive v3 REST client -- no @capacitor/* filesystem/
   share plugin, no google-api-services-drive client library; same
   "no third-party Capacitor plugin, minimal new deps" convention as
   every other IGNYT native plugin).

   Scope (this increment): connect/disconnect, Back Up Now (full JSON
   backup -- same payload buildFullBackupPayload() in app.js already
   produces for local export), list backups in the "IGNYT Backups"
   Drive folder (newest first, auto-pruned to the 10 most recent),
   Restore a chosen backup with Merge or Replace (validateBackupPayload/
   applyBackupPayload/mergeStoredValue in app.js -- shared with local
   JSON import so both paths behave identically), Delete a backup.

   DELIBERATELY NOT IN THIS INCREMENT (queued, not silently dropped):
   Wi-Fi-only/charging-only/scheduled Daily-Weekly-Monthly automatic
   backups, incremental (diff) uploads, a dedicated version-history/
   rollback UI beyond list+restore, user-passphrase end-to-end
   encryption, and true multi-device real-time sync (a different
   feature from backup -- would extend the EXISTING Firestore-based
   CloudSyncPlugin/cloud-sync.js, not Drive).
========================================================= */

const IgnytDriveBackup = (() => {

  const STATE_KEY = "hx_drive_backup_state"; // {lastBackupAt, lastBackupSizeBytes, account:{email,displayName,photoUrl}}
  let _busy = false;
  let _lastError = null;

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

  async function backupNow(){
    const p = plugin();
    if(!p) return { success:false, error:"Drive backup is only available in the IGNYT Android app." };
    if(_busy) return { success:false, error:"A Drive operation is already in progress." };
    _busy = true; _lastError = null;
    try{
      const payload = JSON.stringify(buildFullBackupPayload());
      const fileName = "ignyt-backup-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
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

  /** mode: "merge" or "replace". Downloads the chosen backup, validates it (same rules as
   *  local JSON import), and applies it via applyBackupPayload (app.js). Reloads the app on
   *  success so every screen picks up the restored data, same as local Import already does. */
  async function restoreBackup(fileId, mode){
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
      let parsed;
      try{ parsed = JSON.parse(res.data.content); }
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
    getStatus
  };
})();

window.IgnytDriveBackup = IgnytDriveBackup;
