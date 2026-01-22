interface Navigator {
  serial: {
    requestPort(options?: { filters?: any[] }): Promise<SerialPort | null>;
    getPorts(): Promise<SerialPort[]>;
  };
}

// Optional: Extend USB if needed
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}
