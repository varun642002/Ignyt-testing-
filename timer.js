import { formatDuration, formatTime } from './utils.js';
import { state } from './storage.js';
import { render } from './ui/index.js';

/* =========================================================
   TIMER — rest timer, active-session elapsed timer, race-mode timer,
   wake lock, and the audio/vibration feedback helpers.
========================================================= */

export let raceTimerHandle = null;

export function ensureRaceTimerRunning(){
  if(raceTimerHandle) return;
  raceTimerHandle = setInterval(()=>{
    if(!state.raceActive){ clearInterval(raceTimerHandle); raceTimerHandle = null; return; }
    const totalEl = document.getElementById("race-total-elapsed");
    if(totalEl) totalEl.textContent = formatDuration(Date.now()-state.raceActive.startedAt);
    const segEl = document.getElementById("race-segment-elapsed");
    if(segEl) segEl.textContent = formatDuration(Date.now()-state.raceActive.segmentStartedAt);
  }, 1000);
}

export function stopRaceTimer(){
  if(raceTimerHandle){ clearInterval(raceTimerHandle); raceTimerHandle = null; }
}

export let elapsedTimerHandle = null;

export function ensureElapsedTimerRunning(){
  if(elapsedTimerHandle) return;
  elapsedTimerHandle = setInterval(()=>{
    if(!state.session){ clearInterval(elapsedTimerHandle); elapsedTimerHandle = null; return; }
    const el = document.getElementById("session-elapsed");
    if(el) el.textContent = formatDuration(Date.now()-state.session.startedAt);
  }, 1000);
}

export function stopElapsedTimer(){
  if(elapsedTimerHandle){ clearInterval(elapsedTimerHandle); elapsedTimerHandle = null; }
}

export function startTimer(seconds){
  if(state.timer && state.timer.handle) clearInterval(state.timer.handle);
  state.timer = {remaining:seconds, total:seconds, handle:null};
  render();
  const handle = setInterval(()=>{
    if(!state.timer){ clearInterval(handle); return; } // safety net: never crash on a stray tick after external cleanup
    state.timer.remaining--;
    if(state.timer.remaining<=0){
      clearInterval(state.timer.handle);
      playBeep(); vibrate();
      state.timer = null;
      render();
      return;
    }
    if(state.timer.remaining<=3){ vibrate(80); }
    const ring = document.querySelector(".timer-ring");
    if(ring) ring.textContent = formatTime(state.timer.remaining);
  },1000);
  state.timer.handle = handle;
}

export function playBeep(){
  if(!state.settings.sounds) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    for(let i=0;i<3;i++){
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type="sine"; o.frequency.value=880;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i*0.28;
      g.gain.setValueAtTime(0.15,t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
      o.start(t); o.stop(t+0.25);
    }
  }catch{}
}

export function vibrate(ms=200){ if(!state.settings.vibration) return; try{ navigator.vibrate && navigator.vibrate(ms); }catch{} }

/* Wake lock — keeps screen on during an active session when enabled */

export let wakeLockHandle = null;

export async function applyWakeLock(){
  try{
    const shouldHold = state.settings.keepAwake && !!state.session;
    if(shouldHold && !wakeLockHandle && "wakeLock" in navigator){
      wakeLockHandle = await navigator.wakeLock.request("screen");
      wakeLockHandle.addEventListener("release", ()=>{ wakeLockHandle = null; });
    } else if(!shouldHold && wakeLockHandle){
      await wakeLockHandle.release();
      wakeLockHandle = null;
    }
  }catch{ wakeLockHandle = null; }
}
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") applyWakeLock(); });

/* =========================================================
   LIBRARY TAB
========================================================= */
/* =========================================================
   EXERCISE DETAIL SCREEN — muscles, form, and a lazy-loaded looping
   demonstration video with graceful fallback when none exists.
========================================================= */
