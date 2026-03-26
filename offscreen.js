let audioCtx = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;

  if (message.type === "play_beep") {
    const { frequency, duration, volume } = message.data;
    playBeep(frequency, duration, volume);
  }
});

function playBeep(frequency, duration, volume = 0.1) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}
