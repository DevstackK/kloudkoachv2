// MV3 service worker. Owns tabCapture stream-ID minting and the offscreen
// document lifecycle (service workers can't touch media APIs directly -
// audio capture/processing has to happen in an offscreen document).
//
// Offscreen documents don't have access to chrome.storage (or most chrome.*
// APIs) - only chrome.runtime for messaging. So this service worker reads
// config out of storage itself and passes it along in the message, rather
// than letting offscreen.js read storage directly (which throws
// "Cannot read properties of undefined (reading 'local')").

import { getApiBaseUrl, getDeviceToken } from "./config.js";

const OFFSCREEN_PATH = "offscreen.html";

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });
  if (existing.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Capture the active meeting tab's audio for live transcription.",
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "START_CAPTURE") {
      try {
        const tab = message.tabId
          ? await chrome.tabs.get(message.tabId)
          : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

        if (!tab?.id) throw new Error("No active tab found to capture.");

        const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
        await ensureOffscreenDocument();

        const [apiBaseUrl, deviceToken] = await Promise.all([getApiBaseUrl(), getDeviceToken()]);

        // NOTE: chrome.sidePanel.open() is NOT called here on purpose - it
        // requires being invoked directly within a user-gesture call stack,
        // and by the time a message reaches this async service-worker
        // listener (through sendMessage, after further awaits), that
        // gesture context is long gone ("sidePanel.open() may only be
        // called in response to a user gesture"). popup.js opens the panel
        // itself, synchronously with the click, before sending this message.

        chrome.runtime.sendMessage({ type: "OFFSCREEN_START", streamId, apiBaseUrl, deviceToken });
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (message.type === "STOP_CAPTURE") {
      chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP" });
      sendResponse({ ok: true });
    }
  })();

  return true; // keep the message channel open for the async response
});
