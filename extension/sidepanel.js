import { getApiBaseUrl, getDeviceToken } from "./config.js";

const setupEl = document.getElementById("setup");
const controlsEl = document.getElementById("controls");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const jobRoleInput = document.getElementById("jobRoleInput");
const styleProseBtn = document.getElementById("styleProseBtn");
const styleBulletsBtn = document.getElementById("styleBulletsBtn");
const statusChip = document.getElementById("statusChip");
const feedEl = document.getElementById("feed");
const errorBanner = document.getElementById("errorBanner");
const phoneLinkRow = document.getElementById("phoneLinkRow");
const phoneLinkBtn = document.getElementById("phoneLinkBtn");

let sessionId = null;
let latestTurnEl = null;
let answerStyle = "prose";

styleProseBtn.addEventListener("click", () => {
  answerStyle = "prose";
  styleProseBtn.classList.add("active");
  styleBulletsBtn.classList.remove("active");
});
styleBulletsBtn.addEventListener("click", () => {
  answerStyle = "bullets";
  styleBulletsBtn.classList.add("active");
  styleProseBtn.classList.remove("active");
});

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
}

function setStatus(status) {
  statusChip.textContent = status;
}

function addTurn() {
  // Answer-only: the question isn't shown, since the interviewer just said
  // it live a moment ago - echoing it back read as Kloud Koach "repeating
  // the interview" back at the user.
  document.querySelectorAll(".turn.latest").forEach((el) => el.classList.remove("latest"));

  const el = document.createElement("div");
  el.className = "turn latest";
  el.innerHTML = `<div class="a"></div>`;
  feedEl.prepend(el);
  latestTurnEl = el;
  return el;
}

async function respondTo(question) {
  const apiBaseUrl = await getApiBaseUrl();
  const deviceToken = await getDeviceToken();
  if (!sessionId || !deviceToken) return;

  const turnEl = addTurn();
  const answerEl = turnEl.querySelector(".a");
  setStatus("thinking");

  try {
    const res = await fetch(`${apiBaseUrl}/api/coach/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deviceToken}` },
      body: JSON.stringify({ sessionId, question }),
    });
    if (!res.ok || !res.body) throw new Error("Failed to get a response.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      answerEl.textContent += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : "Failed to get a response.");
  } finally {
    setStatus("listening");
  }
}

startBtn.addEventListener("click", async () => {
  try {
    const apiBaseUrl = await getApiBaseUrl();
    const deviceToken = await getDeviceToken();
    if (!deviceToken) {
      showError("Connect your Kloud Koach account first (open the extension popup).");
      return;
    }

    const jobRole = jobRoleInput.value.trim() || "Live Interview";

    const sessionRes = await fetch(`${apiBaseUrl}/api/coach/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deviceToken}` },
      body: JSON.stringify({ type: "live_interview", jobRole, answerStyle }),
    });
    const sessionJson = await sessionRes.json();
    if (!sessionRes.ok || !sessionJson.success) {
      showError(sessionJson.message || "Could not start session.");
      return;
    }
    sessionId = sessionJson.data.sessionId;

    setupEl.style.display = "none";
    controlsEl.style.display = "flex";
    phoneLinkRow.style.display = "block";
    setStatus("connecting");

    // Without a callback here, any failure background.js reports via
    // sendResponse() (bad/uncapturable tab, tabCapture permission error,
    // etc.) was silently discarded - the panel just sat on "connecting"
    // forever with no visible error.
    chrome.runtime.sendMessage({ type: "START_CAPTURE" }, (response) => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }
      if (!response?.ok) {
        showError(response?.error || "Could not start tab capture.");
      }
    });
  } catch (err) {
    showError(err instanceof Error ? err.message : "Could not start session.");
  }
});

stopBtn.addEventListener("click", async () => {
  chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });

  const apiBaseUrl = await getApiBaseUrl();
  const deviceToken = await getDeviceToken();
  if (sessionId && deviceToken) {
    fetch(`${apiBaseUrl}/api/coach/session/${sessionId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${deviceToken}` },
    }).catch(() => {});
  }

  setStatus("stopped");
  setupEl.style.display = "block";
  controlsEl.style.display = "none";
  phoneLinkRow.style.display = "none";
  sessionId = null;
});

phoneLinkBtn.addEventListener("click", async () => {
  try {
    const apiBaseUrl = await getApiBaseUrl();
    const deviceToken = await getDeviceToken();
    if (!sessionId || !deviceToken) return;

    const res = await fetch(`${apiBaseUrl}/api/companion/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deviceToken}` },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      showError(json.message || "Could not create phone companion link.");
      return;
    }
    await navigator.clipboard.writeText(json.data.url);
    phoneLinkBtn.textContent = "Link copied — open it on your phone";
    setTimeout(() => (phoneLinkBtn.textContent = "Copy phone companion link"), 2500);
  } catch (err) {
    showError(err instanceof Error ? err.message : "Could not create phone companion link.");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CAPTURE_STATUS") setStatus(message.status);
  if (message.type === "CAPTURE_ERROR") showError(message.error);
  if (message.type === "TRANSCRIPT_QUESTION") respondTo(message.text);
});
