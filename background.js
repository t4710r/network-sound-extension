let lastPlayed = 0;
const COOLDOWN = 50; // ms

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Playing sounds for network activity",
  });
}

async function sendBeep(frequency, duration, volume = 0.1) {
  await ensureOffscreenDocument();
  chrome.runtime.sendMessage({
    target: "offscreen",
    type: "play_beep",
    data: { frequency, duration, volume },
  });
}

function handleNetworkEvent(details, isOutgoing = false) {
  const now = Date.now();
  if (now - lastPlayed < COOLDOWN) return;

  // try to find content-length in headers
  let sizeFactor = 100; // Default
  if (details.responseHeaders) {
    const contentLength = details.responseHeaders.find((h) => h.name.toLowerCase() === "content-length");
    if (contentLength && contentLength.value) {
      sizeFactor = parseInt(contentLength.value, 10);
    }
  } else if (details.url) {
    sizeFactor = details.url.length;
  }

  // map size to frequency
  // outgoing: higher frequencies (800-2000 Hz)
  // incoming: lower frequencies (200-800 Hz)
  let frequency;
  if (isOutgoing) {
    frequency = Math.min(2000, Math.max(800, 800 + sizeFactor / 2));
  } else {
    frequency = Math.min(800, Math.max(200, 200 + sizeFactor / 2));
  }

  // map size to duration (approx 150ms to 2000ms)
  // use log10 so 100 bytes is ~500ms, 10KB is ~1000ms, 1MB is ~1500ms
  const duration = Math.min(2000, Math.max(150, Math.log10(Math.max(1, sizeFactor)) * 250));

  sendBeep(frequency, duration);
  lastPlayed = now;
}

// intercept outgoing requests
chrome.webRequest.onBeforeRequest.addListener((details) => handleNetworkEvent(details, true), { urls: ["<all_urls>"] });

// intercept incoming responses
chrome.webRequest.onCompleted.addListener((details) => handleNetworkEvent(details, false), { urls: ["<all_urls>"] }, [
  "responseHeaders",
]);
