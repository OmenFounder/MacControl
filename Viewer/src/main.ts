import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

app.disableHardwareAcceleration(); // 🔥 Prevent GPU crashes

let win: BrowserWindow | null = null;
let currentAspectRatio = 16 / 9;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('dist/index.html');
  win.webContents.openDevTools({ mode: 'detach' });
  win.on('will-resize', (event, newBounds) => {
    if (!currentAspectRatio) return;
  
    const contentBounds = win!.getContentBounds(); // ← This gives actual drawable area
    const chromeHeight = newBounds.height - contentBounds.height;
    const chromeWidth = newBounds.width - contentBounds.width;
  
    const newWidth = newBounds.width;
    const newHeight = Math.round((newWidth - chromeWidth) / currentAspectRatio) + chromeHeight;
  
    event.preventDefault();
    win!.setBounds({
      x: newBounds.x,
      y: newBounds.y,
      width: newWidth,
      height: newHeight
    });
  });
  
}

app.whenReady().then(createWindow);

ipcMain.on('set-aspect', (event, { width, height }) => {
  if (win && width > 0 && height > 0) {
    currentAspectRatio = width / height;
    win.setAspectRatio(currentAspectRatio);
  }
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (win) {
    win.setSize(width, height);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
