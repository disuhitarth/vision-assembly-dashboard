import { EventEmitter } from 'events';

export interface PlcDriver extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readTag(tag: string): Promise<any>;
  writeTag(tag: string, value: any): Promise<void>;
  isConnected(): boolean;
  getStatus(): {
    connected: boolean;
    lastError?: string;
    connectionTime?: Date;
  };
}