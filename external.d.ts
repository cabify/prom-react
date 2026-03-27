declare module 'events' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Listener = (...args: any[]) => void;

  export default class EventEmitter {
    addListener(event: string, listener: Listener): this;
    on(event: string, listener: Listener): this;
    once(event: string, listener: Listener): this;
    removeListener(event: string, listener: Listener): this;
    off(event: string, listener: Listener): this;
    removeAllListeners(event?: string): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): boolean;
    listeners(event: string): Listener[];
    listenerCount(event: string): number;
  }
}
