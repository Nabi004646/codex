export class RequestTimeoutError extends Error {
  constructor() { super('The connection took too long. Please try again.'); this.name='TimeoutError'; }
}

// Bound each request and cancel it when its page/session is no longer active.
// Password submissions and other mutations are never automatically retried.
export async function boundedFetch(input, init={}, {signal, timeout=15000, fetcher=globalThis.fetch}={}) {
  const controller=new AbortController(), sources=[init.signal,signal].filter(Boolean);
  const cancel=event=>controller.abort(event.target.reason);
  for(const source of sources) {
    if(source.aborted) { controller.abort(source.reason); break; }
    source.addEventListener('abort',cancel,{once:true});
  }
  const timer=setTimeout(()=>controller.abort(new RequestTimeoutError()),timeout);
  try {
    controller.signal.throwIfAborted();
    const response=await fetcher(input,{...init,signal:controller.signal});
    // The small JSON APIs must finish their bodies before the deadline too.
    // A response that sends headers then stalls must not leave the UI waiting.
    await response.clone().arrayBuffer();
    controller.signal.throwIfAborted();
    return response;
  } catch(error) {
    if(controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    for(const source of sources) source.removeEventListener('abort',cancel);
  }
}

export function assertCurrentSession(active, current, version, currentVersion) {
  if(!active || active!==current || version!==currentVersion) throw new DOMException('This sign-in has been locked.','AbortError');
}

// In-page anchors create history entries too. Only leaving the document locks
// the admin; section navigation must not destroy an authenticated workspace.
export function leavesAdminDocument(initialHref,currentHref) {
  try {
    const initial=new URL(initialHref),current=new URL(currentHref);
    return initial.origin!==current.origin || initial.pathname!==current.pathname || initial.search!==current.search;
  } catch { return true; }
}

// Locking aborts the SDK transport. Provider logout must use its own transport
// so leaving a page can still revoke the provider session after that cancellation.
export async function revokeProviderSession(token,{url,publishableKey,fetcher=globalThis.fetch,timeout=8000}={}) {
  if(!token)return false;
  try {
    const response=await boundedFetch(url+'/auth/v1/logout?scope=local',{
      method:'POST',headers:{apikey:publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:'{}',keepalive:true,redirect:'manual',
    },{timeout,fetcher});
    return response.ok;
  } catch { return false; }
}

export function safeAuthError(error) {
  if(error?.name==='TimeoutError') return 'The connection took too long. Please try again.';
  if(error?.name==='AbortError') return 'Sign-in was cancelled. Please sign in again.';
  if(error?.name==='AuthRetryableFetchError'||error instanceof TypeError) return 'Could not reach the sign-in service. Check your connection and try again.';
  return error instanceof Error ? error.message : 'The operation could not finish. Please try again.';
}
