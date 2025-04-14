const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("Could not get canvas context");
}

let buffer = window.MacBridge.bufferAlloc(0);
let aspectSet = false;

function resizeCanvasToWindow() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
}

resizeCanvasToWindow();
window.addEventListener("resize", resizeCanvasToWindow);

window.MacBridge.onStreamData((chunk: Uint8Array) => {
  buffer = window.MacBridge.bufferConcat([buffer, chunk]);

  while (buffer.length >= 4) {
    const frameSize = window.MacBridge.readUInt32BE(buffer, 0);
    if (buffer.length < 4 + frameSize) break;

    const frameData = buffer.slice(4, 4 + frameSize);
    buffer = buffer.slice(4 + frameSize);

    const blob = new Blob([frameData], { type: "image/jpeg" });
    createImageBitmap(blob).then((bitmap) => {
      // Lock aspect ratio ONCE
      if (!aspectSet) {
        window.electron.ipcRenderer.send("set-aspect", {
          width: bitmap.width,
          height: bitmap.height,
        });
        aspectSet = true;
      }

      const canvasRatio = canvas.width / canvas.height;
      const imageRatio = bitmap.width / bitmap.height;

      let sx = 0, sy = 0, sWidth = bitmap.width, sHeight = bitmap.height;

      // Crop to match aspect
      if (imageRatio > canvasRatio) {
        sWidth = bitmap.height * canvasRatio;
        sx = (bitmap.width - sWidth) / 2;
      } else {
        sHeight = bitmap.width / canvasRatio;
        sy = (bitmap.height - sHeight) / 2;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    }).catch(console.error);
  }
});

canvas.addEventListener("mousemove", (e) => {
  window.MacBridge.sendInput({ type: "mouseMove", x: e.clientX, y: e.clientY });
});

canvas.addEventListener("mousedown", () => {
  window.MacBridge.sendInput({ type: "mouseDown" });
});

canvas.addEventListener("mouseup", () => {
  window.MacBridge.sendInput({ type: "mouseUp" });
});

window.addEventListener("keydown", (e) => {
  window.MacBridge.sendInput({ type: "keyDown", keyCode: e.keyCode });
});

window.addEventListener("keyup", (e) => {
  window.MacBridge.sendInput({ type: "keyUp", keyCode: e.keyCode });
});
