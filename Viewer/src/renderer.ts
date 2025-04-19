
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
      currentImageWidth = bitmap.width;
      currentImageHeight = bitmap.height;

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

let lastSentTime = 0;
const minInterval = 1000 / 60; // 60fps throttle

canvas.addEventListener("mousemove", (e) => {
  const now = performance.now();
  if (now - lastSentTime < minInterval) return;
  lastSentTime = now;

  const { x, y } = getScaledMouseCoords(e);
  window.MacBridge.sendInput([{ type: "mouseMove", x, y }]);
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // Disable default right-click menu
});

canvas.addEventListener("mousedown", (e) => {
  const { x, y } = getScaledMouseCoords(e);

  const events = [{ type: "mouseMove", x, y }];
  if (e.button === 2) {
    events.push({ type: "mouseRightDown", x, y });
  } else {
    events.push({ type: "mouseDown", x, y });
  }

  window.MacBridge.sendInput(events);
});

canvas.addEventListener("mouseup", (e) => {
  const { x, y } = getScaledMouseCoords(e);

  const events = [{ type: "mouseMove", x, y }];
  if (e.button === 2) {
    events.push({ type: "mouseRightUp", x, y });
  } else {
    events.push({ type: "mouseUp", x, y });
  }

  window.MacBridge.sendInput(events);
});

let escPressCount = 0;
let lastEscTime = 0;
window.addEventListener("keydown", (e) => {
  const macKeyCode = window.keyboard.getKeyCode(e.keyCode);
  if (macKeyCode !== undefined) {
    window.MacBridge.sendInput({ type: "keyDown", keyCode: macKeyCode });
  }

  // ESC x3 detection logic
  const now = performance.now();
  if (e.key === "Escape") {
    if (now - lastEscTime < 500) {
      escPressCount++;
      if (escPressCount === 3) {
        console.warn("🧯 ESC x3 → Triggering modifier reset!");
        window.MacBridge.sendInput({ type: "forceModifierReset" });
        escPressCount = 0;
      }
    } else {
      escPressCount = 1;
    }
    lastEscTime = now;
  } else {
    escPressCount = 0;
  }
});

window.addEventListener("keyup", (e) => {
  const macKeyCode = window.keyboard.getKeyCode(e.keyCode);
  if (macKeyCode !== undefined) {
    //console.log("Sending Mac Key Code: ", macKeyCode);
    window.MacBridge.sendInput({ type: "keyUp", keyCode: macKeyCode });
  }
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault(); // prevent default scroll behavior
  const deltaY = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120); // ✅ Flip direction
  window.MacBridge.sendInput({ type: "mouseScroll", deltaY });
}, { passive: false });

window.addEventListener("resize", () => {
  resizeCanvasToMatchWindow();
});

window.electron.ipcRenderer.on("connect-to-ip", (_event, ip: string) => {
  console.log("🌐 [Protocol] Received connect-to-ip:", ip);
  window.MacBridge.connectTo(ip);
});

