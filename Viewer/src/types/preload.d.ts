export {};

declare global {
  interface Window {
    MacBridge: {
      onStreamData(callback: (chunk: Uint8Array) => void): void;
      sendInput(event: object): void;
      connectTo(ip: string): void; 
      bufferAlloc(size: number): Uint8Array;
      bufferConcat(chunks: Uint8Array[]): Uint8Array;
      readUInt32BE(buf: Uint8Array, offset: number): number;
    };
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void;
        on(channel: string, listener: (event: any, data: any) => void): void;
      };
    };
    keyboard: {
      getKeyCode (winKeyCode:number) : number;
    };
  }
}
 