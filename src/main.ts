import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

app.disableHardwareAcceleration(); // 🔥 Prevent GPU crashes

let win: BrowserWindow | null = null;

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
}

app.whenReady().then(createWindow);

ipcMain.on('resize-window', (event, { width, height }) => {
  if (win) {
    const bounds = win.getBounds();
    win.setBounds({
      x: bounds.x,
      y: bounds.y,
      width,
      height
    });
  }
});

ipcMain.on('set-aspect', (event, { width, height }) => {
  if (win && width > 0 && height > 0) {
    const ratio = width / height;
    win.setAspectRatio(ratio);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
