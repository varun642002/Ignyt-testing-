import { state } from '../storage.js';

/* =========================================================
   DIALOGS — a real, in-app confirmation dialog replacing the native
   confirm() calls used for destructive actions (delete workout, reset
   all data, abort race, etc.). Promise-based so call sites read almost
   the same as the confirm() they replace: `if(await confirmDialog(msg))`.
   State-backed and rendered as part of the normal render() output,
   positioned as a sibling overlay (not nested inside anything a click
   needs to bubble through) so the backdrop-click-to-cancel pattern
   works the same way the exercise-menu backdrop already does elsewhere.
========================================================= */
let _resolver = null;

export function confirmDialog(message, renderFn){
  return new Promise(resolve=>{
    _resolver = resolve;
    state.confirmDialog = { message };
    if(renderFn) renderFn();
  });
}

export function resolveConfirmDialog(result, renderFn){
  state.confirmDialog = null;
  const r = _resolver;
  _resolver = null;
  if(renderFn) renderFn();
  if(r) r(result);
}

export function renderConfirmDialog(){
  if(!state.confirmDialog) return "";
  return `
    <div class="dialog-backdrop" data-dialog-action="cancel"></div>
    <div class="dialog-box">
      <div class="dialog-message">${state.confirmDialog.message}</div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" data-dialog-action="cancel">Cancel</button>
        <button class="btn btn-accent" data-dialog-action="confirm">Confirm</button>
      </div>
    </div>
  `;
}
