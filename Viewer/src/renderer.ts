const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) throw new Error("Could not get canvas context");

let buffer = window.MacBridge.bufferAlloc(0);
let currentImageWidth = 0;
let currentImageHeight = 0;

function resizeCanvasToMatchWindow() {
  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(canvas.clientWidth * pixelRatio);
  canvas.height = Math.floor(canvas.clientHeight * pixelRatio);
}

window.MacBridge.onStreamData((chunk: Uint8Array) => {
  buffer = window.MacBridge.bufferConcat([buffer, chunk]);

  while (buffer.length >= 4) {
    const frameSize = window.MacBridge.readUInt32BE(buffer, 0);
    if (buffer.length < 4 + frameSize) break;

    const frameData = buffer.slice(4, 4 + frameSize);
    buffer = buffer.slice(4 + frameSize);

    const blob = new Blob([frameData], { type: "image/jpeg" });

    createImageBitmap(blob).then((bitmap) => {
      // ✅ Always update currentImageWidth/Height
      currentImageWidth = bitmap.width;
      currentImageHeight = bitmap.height;

      // Lock aspect ratio once
      window.electron.ipcRenderer.send("set-aspect", {
        width: bitmap.width,
        height: bitmap.height,
      });

      resizeCanvasToMatchWindow();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }).catch(console.error);
  }
});

function getScaledMouseCoords(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = currentImageWidth / rect.width;
  const scaleY = currentImageHeight / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  return { x, y };
}

let isDragging = false;
let lastSentTime = 0;
const minInterval = 1000 / 60; // 60fps

canvas.addEventListener("mousemove", (e) => {
  const now = performance.now();
  if (now - lastSentTime < minInterval) return;
  lastSentTime = now;

  const { x, y } = getScaledMouseCoords(e);
  window.MacBridge.sendInput({ type: "mouseMove", x, y });
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // Prevent native context menu
});

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = getScaledMouseCoords(e);
  console.log("Sending Input:", { type: "mouseDown", x: x, y: y });
  if (e.button === 2) {
    window.MacBridge.sendInput({ type: "mouseRightDown", x, y });
  } else {
    window.MacBridge.sendInput({ type: "mouseDown", x, y });
  }
});

canvas.addEventListener("mouseup", (e) => {
  const { x, y } = getScaledMouseCoords(e);
  if (e.button === 2) {
    window.MacBridge.sendInput({ type: "mouseRightUp", x, y });
  } else {
    window.MacBridge.sendInput({ type: "mouseUp", x, y });
  }
});

window.addEventListener("keydown", (e) => {
  window.MacBridge.sendInput({ type: "keyDown", keyCode: e.keyCode });
});

window.addEventListener("keyup", (e) => {
  window.MacBridge.sendInput({ type: "keyUp", keyCode: e.keyCode });
});

window.addEventListener("resize", () => {
  resizeCanvasToMatchWindow();
});
