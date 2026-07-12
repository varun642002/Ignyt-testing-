import { state } from '../storage.js';

/* =========================================================
   TOAST — a real, minimal non-blocking notification, replacing the
   native alert() calls that used to interrupt the whole page. State-
   backed (like the PR/achievement celebration banners elsewhere in
   this app) so it survives the normal render() cycle rather than
   needing separate DOM lifecycle management, and auto-dismisses.
   render is passed in by ui/index.js at call time to avoid a hard
   circular import at module-evaluation time.
========================================================= */
let _toastTimer = null;

export function showToast(message, type='info', renderFn){
  const id = Date.now();
  state.toast = { id, message, type };
  if(renderFn) renderFn();
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{
    if(state.toast && state.toast.id===id){
      state.toast = null;
      if(renderFn) renderFn();
    }
  }, 3200);
}

export function dismissToast(renderFn){
  clearTimeout(_toastTimer);
  state.toast = null;
  if(renderFn) renderFn();
}

export function renderToast(){
  if(!state.toast) return "";
  const t = state.toast;
  const color = t.type==='error' ? 'var(--accent)' : t.type==='success' ? 'var(--mint)' : 'var(--steel)';
  return `<div class="toast" style="border-left:3px solid ${color};" data-action="dismiss-toast">${t.message}</div>`;
}
