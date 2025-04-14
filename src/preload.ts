import { contextBridge } from "electron";
import * as net from "net";
import { Buffer } from "buffer";

let screenSocket: net.Socket | null = null;
let inputSocket: net.Socket | null = null;

function setupSockets() {
  if (!screenSocket) {
    screenSocket = new net.Socket();
    screenSocket.connect(5051, "10.0.0.2");
    screenSocket.on("error", console.error);
  }

  if (!inputSocket) {
    inputSocket = new net.Socket();
    inputSocket.connect(5050, "10.0.0.2");
    inputSocket.on("error", console.error);
  }
}

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

  bufferAlloc: (size: number) => Buffer.alloc(size),
  bufferConcat: (chunks: Uint8Array[]) => Buffer.concat(chunks),
  readUInt32BE: (buf: Uint8Array, offset: number) => Buffer.from(buf).readUInt32BE(offset),
});
