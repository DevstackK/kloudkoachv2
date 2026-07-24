// Runs in the offscreen document (the only MV3 context that can touch
// getUserMedia/MediaRecorder). Captures the meeting tab's audio via the
// stream ID minted by the background service worker, streams it to
// Deepgram directly (short-lived token minted by our backend), and posts
// finalized questions up to the side panel for Claude to answer.
//
// NOTE: apiBaseUrl/deviceToken arrive via the OFFSCREEN_START message
// payload rather than being read from chrome.storage here - offscreen
// documents don't have access to chrome.storage (or most chrome.* APIs),
// only chrome.runtime for messaging. The background service worker reads
// storage and passes the values along.

let mediaStream = null;
let mediaRecorder = null;
let ws = null;
let interim = "";
let audioContext = null;

async function startCapture({ streamId, apiBaseUrl, deviceToken }) {
  await stopCapture();

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // Capturing a tab's audio stops Chrome from also sending it to the
  // speakers - without this, you'd either hear silence (you still need to
  // hear the interviewer!) or get audio glitches from the unconsumed
  // stream. Routing it through a real audio graph back to the output
  // restores normal playback.
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(audioContext.destination);

  if (!deviceToken) {
    chrome.runtime.sendMessage({ type: "CAPTURE_ERROR", error: "Extension is not connected to your Kloud Koach account yet." });
    return;
  }

  const tokenRes = await fetch(`${apiBaseUrl}/api/deepgram-token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deviceToken}` },
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.success) {
    chrome.runtime.sendMessage({ type: "CAPTURE_ERROR", error: tokenJson.message || "Could not start live transcription." });
    return;
  }

  ws = new WebSocket(
    "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&utterance_end_ms=1200&vad_events=true",
    ["token", tokenJson.data.key]
  );

  ws.onopen = () => {
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    mediaRecorder.start(250);
    chrome.runtime.sendMessage({ type: "CAPTURE_STATUS", status: "listening" });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "UtteranceEnd") {
        if (interim.trim()) {
          chrome.runtime.sendMessage({ type: "TRANSCRIPT_QUESTION", text: interim.trim() });
        }
        interim = "";
        return;
      }
      const alt = msg.channel?.alternatives?.[0];
      if (alt && msg.is_final) {
        interim = `${interim} ${alt.transcript}`.trim();
      }
    } catch {
      // ignore malformed frames
    }
  };

  ws.onerror = () => {
    chrome.runtime.sendMessage({ type: "CAPTURE_ERROR", error: "Live transcription connection error." });
  };
}

async function stopCapture() {
  mediaRecorder?.stop();
  mediaRecorder = null;
  mediaStream?.getTracks().forEach((t) => t.stop());
  mediaStream = null;
  ws?.close();
  ws = null;
  interim = "";
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "OFFSCREEN_START") {
    // Any rejection here (CORS, permissions, network) would otherwise be a
    // silent unhandled rejection - the side panel would just sit on
    // "connecting" forever with no visible error. Always report it.
    startCapture(message).catch((err) => {
      chrome.runtime.sendMessage({
        type: "CAPTURE_ERROR",
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
  if (message.type === "OFFSCREEN_STOP") {
    stopCapture();
    chrome.runtime.sendMessage({ type: "CAPTURE_STATUS", status: "stopped" });
  }
});
