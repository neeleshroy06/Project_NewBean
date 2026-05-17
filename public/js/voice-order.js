import { applyCartActions } from "./cart.js";

const STATES = {
  idle: "Tap to speak your order",
  recording: "Listening... tap again when done",
  processing: "Adding to your cart..."
};

export function initVoiceOrder({ onSuccess, onError }) {
  const button = document.querySelector("[data-voice-order]");
  const label = document.querySelector("[data-voice-label]");
  const transcriptEl = document.querySelector("[data-voice-transcript]");

  if (!button) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    button.disabled = true;
    label.textContent = "Voice ordering needs a modern browser";
    return;
  }

  let mediaRecorder = null;
  let chunks = [];
  let stream = null;
  let status = "idle";

  function setStatus(nextStatus, detail = "") {
    status = nextStatus;
    button.classList.toggle("is-recording", nextStatus === "recording");
    button.classList.toggle("is-processing", nextStatus === "processing");
    button.disabled = nextStatus === "processing";
    label.textContent = STATES[nextStatus] || detail;

    if (transcriptEl) {
      transcriptEl.textContent = detail;
      transcriptEl.hidden = !detail || nextStatus === "recording";
    }
  }

  async function ensureMicrophone() {
    if (stream) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  }

  function stopTracks() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  async function startRecording() {
    const mic = await ensureMicrophone();
    chunks = [];
    const mimeType = pickMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(mic, { mimeType }) : new MediaRecorder(mic);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    mediaRecorder.start();
    setStatus("recording");
  }

  async function finishRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    const recorder = mediaRecorder;
    const mimeType = recorder.mimeType || "audio/webm";

    await new Promise((resolve) => {
      recorder.addEventListener("stop", resolve, { once: true });
      recorder.stop();
    });

    mediaRecorder = null;
    setStatus("processing");

    const blob = new Blob(chunks, { type: mimeType });
    chunks = [];
    stopTracks();

    try {
      const formData = new FormData();
      formData.append("audio", blob, "order.webm");

      const response = await fetch("/api/voice-order", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Voice order failed.");
      }

      if (payload.actions?.length) {
        applyCartActions(payload.actions);
      }

      setStatus("idle", payload.transcript ? `You said: "${payload.transcript}"` : "");
      onSuccess?.(payload);
    } catch (error) {
      setStatus("idle");
      onError?.(error instanceof Error ? error.message : "Voice order failed.");
    }
  }

  button.addEventListener("click", async () => {
    if (status === "processing") return;

    try {
      if (status === "recording") {
        await finishRecording();
        return;
      }

      await startRecording();
    } catch {
      setStatus("idle");
      onError?.("Microphone access is required for voice ordering.");
      stopTracks();
    }
  });

  fetch("/api/health")
    .then((response) => response.json())
    .then((health) => {
      if (!health.voiceEnabled) {
        button.disabled = true;
        label.textContent = "Voice ordering unavailable (add API keys)";
      }
    })
    .catch(() => {
      label.textContent = "Run npm start for voice ordering";
    });

  setStatus("idle");
}

function pickMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}
