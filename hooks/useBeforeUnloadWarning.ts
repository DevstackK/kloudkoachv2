"use client";

import * as React from "react";

// Refreshing or closing the tab mid-session drops the live mic/tab capture
// and WebSocket - any turn already answered is safely in the database, but
// the session itself can't be resumed, so warn before that happens.
export function useBeforeUnloadWarning(active: boolean) {
  React.useEffect(() => {
    if (!active) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set for the native prompt to show;
      // the string itself is ignored by modern browsers, which show their
      // own generic message instead.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
