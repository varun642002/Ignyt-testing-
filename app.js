import { runMigrations, resolveOnboardingStatus, state } from './storage.js';
import { rebuildWeeks } from './workout.js';
import { render, renderErrorScreen } from './ui/index.js';

/* =========================================================
   APP — entry point. Boots the app: runs migrations, resolves onboarding
   status, builds the initial HYROX week structure, wires up the global
   safety nets (uncaught errors, unhandled rejections, accidental-exit
   protection), does the first render, and registers the service worker.
   Every other module is imported (directly or transitively) from here.
========================================================= */

/* =========================================================
   BOOTSTRAP
========================================================= */
runMigrations();
resolveOnboardingStatus();
rebuildWeeks();

// Global safety net: catches errors thrown outside render() (e.g. inside an
// event handler before it calls render again). Never worse than the blank
// screen the browser default would leave, so only intervene if #app is empty.
window.addEventListener("error", (e)=>{
  console.error("Ignyt uncaught error:", e.error||e.message);
  const root = document.getElementById("app");
  if(root && root.innerHTML.trim()==="") renderErrorScreen(e.error||new Error(e.message||"Unknown error"));
});
window.addEventListener("unhandledrejection", (e)=>{
  console.error("Ignyt unhandled promise rejection:", e.reason);
});

// Accidental-exit protection. Note: an active session is already persisted to
// localStorage on every render, so closing/reloading never actually loses data —
// this is just an extra confirmation prompt to avoid an accidental navigation
// interrupting a workout in progress.
window.addEventListener("beforeunload", (e)=>{
  const hasData = state.session && state.session.exercises.some(ex=>
    ex.sets.some(s=> s.weight || s.reps)
  );
  if(hasData){
    e.preventDefault();
    e.returnValue = "";
  }
});

try{
  render();
}catch(err){
  console.error("Ignyt failed to boot:", err);
  renderErrorScreen(err);
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}
