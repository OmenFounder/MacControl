import { app, BrowserWindow, ipcMain, Menu, MenuItem} from 'electron';
import * as path from 'path';
import * as url from 'url';

app.setAsDefaultProtocolClient('macviewer'); // <-- REGISTER CUSTOM PROTOCOL
app.disableHardwareAcceleration(); // 🔥 Prevent GPU crashes

let win: BrowserWindow | null = null;
let currentAspectRatio = 16 / 9;

function createWindow(ipToConnect?: string) {
  win = new BrowserWindow({
    width: 2560,
    height: 1440,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = ipToConnect
    ? `file://${__dirname}/index.html?ip=${ipToConnect}`
    : `file://${__dirname}/index.html`;

  win.loadURL(startUrl);

  //win.webContents.openDevTools({ mode: 'detach' });
  createMenu(win);

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

function createMenu(win: BrowserWindow) {
  const currentMenu = Menu.getApplicationMenu();
  const newMenu = new Menu();

  // Rebuild existing items into newMenu
  if (currentMenu) {
    currentMenu.items.forEach(item => {
      newMenu.append(item);
    });
  }

  // Add to existing "Window" menu if it exists
  const windowItem = currentMenu?.items.find(item => item.label === 'Window');

  if (windowItem?.submenu) {
    windowItem.submenu.append(new MenuItem({
      label: 'Debug Tools',
      click: () => {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    }));
  } else {
    // Or add a whole new "Window" menu section
    newMenu.append(new MenuItem({
      label: 'Window',
      submenu: Menu.buildFromTemplate([
        {
          label: 'Debug Tools',
          accelerator: 'F12',
          click: () => {
            win.webContents.openDevTools({ mode: 'detach' });
          }
        }
      ])
    }));
  }

  Menu.setApplicationMenu(newMenu);
}


app.whenReady().then(() => {
  const argv = process.argv;
  const protocolArg = argv.find(arg => arg.startsWith('macviewer://'));
  if (protocolArg) {
    const parsed = new URL(protocolArg);
    const ip = parsed.searchParams.get('ip');
    createWindow(ip ?? undefined);
  } else {
    createWindow();
  }
});

app.on('open-url', (event, urlStr) => {
  event.preventDefault();
  const parsed = new URL(urlStr);
  const ip = parsed.searchParams.get('ip');
  if (ip) {
    if (win) {
      win.webContents.send('connect-to-ip', ip);
    } else {
      createWindow(ip);
    }
  }
});

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
