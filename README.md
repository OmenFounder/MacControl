## 🖥️ MacControl – Ultra Low-Latency Mac Remote Viewer

This is a high-performance Mac remote control system with **instant input** and **JPEG streaming**, optimized for **developer-grade responsiveness**. Built as a lightweight alternative to VNC with better drag precision and lower input delay.

---

## 📦 Project Structure

```
MacControl/
├── MacInputForwarder/     # Swift-based Mac server
└── Viewer/                # Electron-based PC viewer
```

---

## 🚀 Getting Started

### 🧠 Prerequisites

#### 🔗 Ethernet Direct Connect (REQUIRED for ultra-low latency)

To achieve sub-50ms responsiveness:

1. Connect your **PC and Mac directly via an Ethernet cable**.
2. Manually assign the following IPs:

   - **Mac**: `10.0.0.1`
   - **PC**: `10.0.0.2`

   On macOS:  
   - Go to `System Settings → Network → Ethernet`  
   - Set to **Manual IP** with:  
     - IP Address: `10.0.0.1`  
     - Subnet: `255.255.255.0`

   On Windows:  
   - Go to `Control Panel → Network & Sharing Center → Change adapter settings`  
   - Right-click Ethernet → Properties → IPv4 Settings  
   - Set:
     - IP Address: `10.0.0.2`  
     - Subnet Mask: `255.255.255.0`

3. Disable firewall for local 10.0.0.X traffic if needed.
4. Test connectivity with `ping 10.0.0.1` from PC.

---

### ✅ Software Requirements

- **MacInputForwarder**
  - macOS (tested on Monterey & Ventura)
  - Xcode + Swift command line tools

- **PC Viewer**
  - Node.js v18+
  - Windows (or any platform with Electron support)

---

## 🍏 MacInputForwarder

### ✅ What it does

- Streams your Mac display as JPEG frames at ~30 FPS
- Forwards mouse and keyboard input from the PC
- Handles mouse drag, right-click, and multi-key combinations
- Stays alive and reconnects cleanly when the PC disconnects

### 🛠️ Build & Run

```bash
cd MacInputForwarder
swift build
.build/debug/MacInputForwarder
```

To run it on boot (optional), you can install it as a **LaunchDaemon** later.

---

## 💻 PC Viewer (Electron App)

### ✅ What it does

- Connects to your Mac via sockets
- Displays JPEG stream in a canvas
- Sends input events back to Mac instantly
- Locks aspect ratio and scales perfectly to window

### 🛠️ Setup & Run

```bash
cd Viewer
npm install
npm run dev
```

You can also build it with:

```bash
npm run build
```

---

## 🖱️ Controls

| Action                 | Behavior                                |
|------------------------|-----------------------------------------|
| Mouse Move            | Moves the Mac cursor                    |
| Left Click            | Select / drag / move items              |
| Right Click           | Shows context menu (macOS style)        |
| Keyboard Input        | Sends keydown and keyup events          |
| Drag (Hold + Move)    | Fully supported with accurate mapping   |
| Shift/Control + Click | Combo keys work properly (for select)   |

---

## 🧪 Debugging

If the app **closes unexpectedly** on the Mac:
- Make sure `SIGPIPE` is ignored in Swift (`signal(SIGPIPE, SIG_IGN)`)
- Confirm `RunLoop.main.run()` or `DispatchGroup().wait()` is keeping the app alive

If **drag breaks after resize**:
- Ensure the Electron viewer locks the window aspect ratio
- Canvas must resize to exactly fill the window with no black bars

If **input lag returns**:
- Ensure the PC isn’t scaling the canvas past native resolution
- Avoid resizing the window too far beyond the captured Mac screen resolution

---

## 📌 Future Improvements (Optional)

- Add support for **audio streaming**
- Add a **file transfer panel**
- Toggle fullscreen mode in viewer
- UI to manage IP address of the Mac from the viewer


