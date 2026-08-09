export const LIVE_WORKFLOW_PAGE_STATE_EVENT = "activ-live-workflow:page-state";
export const LIVE_WORKFLOW_REMOTE_PAGE_STATE_EVENT = "activ-live-workflow:remote-page-state";

export const publishLiveWorkflowPageState = (state) => {
  if (typeof window === "undefined" || !state || typeof state !== "object") return;
  window.dispatchEvent(new CustomEvent(LIVE_WORKFLOW_PAGE_STATE_EVENT, { detail: state }));
};

export const subscribeToRemoteLiveWorkflowPageState = (listener) => {
  if (typeof window === "undefined" || typeof listener !== "function") return () => {};
  const handler = (event) => listener(event.detail || {});
  window.addEventListener(LIVE_WORKFLOW_REMOTE_PAGE_STATE_EVENT, handler);
  return () => window.removeEventListener(LIVE_WORKFLOW_REMOTE_PAGE_STATE_EVENT, handler);
};
