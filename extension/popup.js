import { getApiBaseUrl, getDeviceToken, setDeviceToken, clearDeviceToken } from "./config.js";

const connectPanel = document.getElementById("connectPanel");
const controlPanel = document.getElementById("controlPanel");
const codeInput = document.getElementById("codeInput");
const connectBtn = document.getElementById("connectBtn");
const openPairingLink = document.getElementById("openPairingLink");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const status2 = document.getElementById("status2");

async function render() {
  const token = await getDeviceToken();
  connectPanel.style.display = token ? "none" : "block";
  controlPanel.style.display = token ? "block" : "none";
}

openPairingLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const apiBaseUrl = await getApiBaseUrl();
  chrome.tabs.create({ url: `${apiBaseUrl}/dashboard/extension` });
});

connectBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code) return;
  await setDeviceToken(code);
  await render();
});

disconnectBtn.addEventListener("click", async () => {
  await clearDeviceToken();
  await render();
});

startBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    status2.textContent = "No active tab found.";
    return;
  }

  // Must happen directly in this click handler, before any other work -
  // chrome.sidePanel.open() only works within a user-gesture call stack,
  // it can't be delegated to the background service worker after a
  // message-passing round trip (see background.js for the long version).
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    status2.textContent = "Could not open side panel: " + (err instanceof Error ? err.message : String(err));
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: "START_CAPTURE", tabId: tab.id });
  status2.textContent = res?.ok ? "Listening… check the side panel." : res?.error || "Could not start.";
});

stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
  status2.textContent = "Stopped";
});

render();
