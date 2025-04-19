import { contextBridge, ipcRenderer  } from "electron";
import * as net from "net";
import { Buffer } from "buffer";
import { KeyCode } from "./keyCode";

let screenSocket: net.Socket | null = null;
let inputSocket: net.Socket | null = null;
let currentIP = "10.0.0.2"; // Default fallback


function setupSockets(ipOverride?: string) {
  const ip = ipOverride || currentIP;

  if (!screenSocket) {
    screenSocket = new net.Socket();
    screenSocket.connect(5051, ip);
    screenSocket.on("error", console.error);
  }

  if (!inputSocket) {
    inputSocket = new net.Socket();
    inputSocket.connect(5050, ip);
    inputSocket.on("error", console.error);
  }

  screenSocket.setNoDelay(true);
  inputSocket.setNoDelay(true);
}


contextBridge.exposeInMainWorld('keyboard', { 
  getKeyCode: (winKeyCode: number) => {
    return KeyCode.getKeyCode(winKeyCode);
  }
});

contextBridge.exposeInMainWorld("MacBridge", {
  onStreamData: (callback: (chunk: Uint8Array) => void) => {
    setupSockets();
    screenSocket?.on("data", callback);
  },

  sendInput: (event: object) => {
    setupSockets();
    if (inputSocket?.writable) {
      inputSocket.write(JSON.stringify(event) + "\n");
    }
  },

  connectTo: (ip: string) => {
    console.log("🔌 Reconnecting to:", ip);
    currentIP = ip;

    // Close previous sockets
    screenSocket?.destroy();
    inputSocket?.destroy();

    screenSocket = null;
    inputSocket = null;

    setupSockets(ip);
  },

  bufferAlloc: (size: number) => Buffer.alloc(size),
  bufferConcat: (chunks: Uint8Array[]) => Buffer.concat(chunks),
  readUInt32BE: (buf: Uint8Array, offset: number) => Buffer.from(buf).readUInt32BE(offset),
});


contextBridge.exposeInMainWorld('electron', {
  ipcRenderer
});