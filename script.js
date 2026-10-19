const video            = document.getElementById("video");
const placeholder      = document.getElementById("videoPlaceholder");
const videoBadge       = document.getElementById("videoBadge");
const videoBadgeText   = document.getElementById("videoBadgeText");
const btnStart         = document.getElementById("btnStart");
const btnStop          = document.getElementById("btnStop");
const btnCapture       = document.getElementById("btnCapture");
const btnDownload      = document.getElementById("btnDownload");
const studentNameInput = document.getElementById("studentName");
const filterSelect     = document.getElementById("filterSelect");
const statusMessage    = document.getElementById("statusMessage");
const resultWrapper    = document.getElementById("resultWrapper");

let mediaStream = null;
let lastCanvas  = null;

function updateButtons(state) {
  const online   = state === "online" || state === "captured";
  const captured = state === "captured";

  btnStart.disabled    = online;
  btnStop.disabled     = !online;
  btnCapture.disabled  = !online;
  btnDownload.disabled = !captured;
}

function setStatus(msg, type = "error") {
  statusMessage.textContent = msg;
  statusMessage.className = "status " + type;
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status";
}

function setBadge(live) {
  videoBadge.classList.toggle("live", live);
  videoBadgeText.textContent = live ? "Ao Vivo" : "Offline";
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function startCamera() {
  clearStatus();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("❌ Seu navegador não suporta acesso à câmera (getUserMedia).");
    return;
  }

  if (mediaStream) {
    setStatus("⚠️ A câmera já está ligada.", "info");
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);

    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      setStatus("🚫 Permissão negada. Autorize o acesso à câmera nas configurações do navegador.");
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      setStatus("📷 Nenhuma câmera foi encontrada neste dispositivo.");
    } else if (err.name === "NotReadableError") {
      setStatus("⚠️ A câmera está em uso por outro aplicativo.");
    } else {
      setStatus("❌ Não foi possível acessar a câmera: " + err.message);
    }
    return;
  }

  video.srcObject = mediaStream;

  try {
    await video.play();
  } catch (playErr) {
    if (playErr.name !== "AbortError") {
      console.warn("Aviso do play():", playErr);
    }
  }

  video.classList.add("active");
  placeholder.style.display = "none";
  setBadge(true);

  updateButtons(lastCanvas ? "captured" : "online");
  setStatus("✅ Câmera ligada. Você já pode capturar.", "success");
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  video.srcObject = null;
  video.classList.remove("active");
  placeholder.style.display = "block";
  setBadge(false);

  updateButtons("offline");
  setStatus("⏹️ Câmera desligada. Recursos liberados.", "info");
}

function capturePhoto() {
  clearStatus();

  if (!mediaStream || !video.videoWidth) {
    setStatus("⚠️ Ligue a câmera antes de capturar.");
    return;
  }

  const width  = video.videoWidth;
  const height = video.videoHeight;

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.filter = filterSelect.value;
  ctx.drawImage(video, 0, 0, width, height);
  ctx.filter = "none";

  const name = (studentNameInput.value.trim() || "Aluno(a) PFE");
  const now  = new Date();
  const dateStr = formatDateTime(now);

  const barHeight = Math.max(70, height * 0.14);
  const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height - barHeight, width, barHeight);

  const fontSize = Math.max(18, Math.round(height * 0.042));
  ctx.font = `700 ${fontSize}px "Inter", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;

  const padding = Math.round(width * 0.025);
  const line1Y  = height - barHeight + padding * 0.6;
  const line2Y  = line1Y + fontSize + 8;

  ctx.fillText(`👤 ${name}`, padding, line1Y);

  ctx.font = `500 ${Math.round(fontSize * 0.8)}px "Inter", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#22d3ee";
  ctx.fillText(`🕒 ${dateStr}`, padding, line2Y);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = Math.max(4, width * 0.008);
  ctx.strokeRect(0, 0, width, height);

  lastCanvas = canvas;
  resultWrapper.innerHTML = "";
  resultWrapper.classList.add("has-image");
  resultWrapper.appendChild(canvas);

  updateButtons("captured");
  setStatus("✅ Captura realizada com filtro e identificação!", "success");
}

function downloadPhoto() {
  if (!lastCanvas) return;
  const link = document.createElement("a");
  link.download = `camera_pfe_${Date.now()}.png`;
  link.href = lastCanvas.toDataURL("image/png");
  link.click();
}

updateButtons("offline");

btnStart.addEventListener("click", startCamera);
btnStop.addEventListener("click", stopCamera);
btnCapture.addEventListener("click", capturePhoto);
btnDownload.addEventListener("click", downloadPhoto);

window.addEventListener("beforeunload", () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
  }
});