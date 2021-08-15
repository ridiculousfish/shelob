/// <reference path='./types.ts' />

namespace angband {
  interface KeyEvent {
    readonly key: string;
    readonly code: number;
    readonly modifiers: number;
  }

  // A class which gets called from C source.
  export class ThreadWorker {
    // List of queued events.
    eventQueue: KeyEvent[];

    // Promise resolved when a new event is received.
    eventPromise: Promise<boolean>;

    // Callback to resolve the promise.
    eventPromiseCallback: (val: boolean) => void;

    // \return whether we have at least one event.
    hasEvent(): boolean { return this.eventQueue.length > 0; }

    constructor(private worker: Worker) {
      this.eventQueue = [];
      this.eventPromise = new Promise((resolve) => {
        this.eventPromiseCallback = resolve;
      });
    }

    // Post a message to our renderer.
    postMessage(msg: RenderEvent) {
      this.worker.postMessage(msg);
    }

    // Post an error message to our renderer.
    reportError(text: string): void {
      const msg: ERROR_MSG = {
        name: "ERROR",
        text,
      };
      this.postMessage(msg);
    }

    // Called when we receive an event.
    gotEvent(evt: KEY_EVENT_MSG) {
      let keyevt: KeyEvent = {
        key: evt.key,
        code: evt.code,
        modifiers: evt.modifiers,
      };
      this.eventQueue.push(keyevt);
      let cb = this.eventPromiseCallback;
      this.eventPromise = new Promise((resolve) => {
        this.eventPromiseCallback = resolve;
      });
      cb(this.hasEvent());
    }

    // Incoming message handler.
    public onMessage = (msg: MessageEvent) => {
      let evt = msg.data as WorkerEvent;
      switch (evt.name) {
        case 'KEY_EVENT':
          this.gotEvent(evt as KEY_EVENT_MSG);
          break;
        default:
          this.reportError("Unknown event name: " + evt.name);
          break;
      }
    }

    // Report status in our Emscripten module.
    public moduleSetStatus(text: string) {
      const msg: STATUS_MSG = {
        name: "STATUS",
        text,
      };
      this.postMessage(msg);
    }

    // Report run dependencies.
    public getModuleDependencyMonitor(): (a: number) => void {
      let totalDependencies = 0;
      return (left: number) => {
        if (totalDependencies < left) totalDependencies = left;
        this.moduleSetStatus(left ? 'Preparing... (' + (totalDependencies - left) + '/' + totalDependencies + ')' : 'All downloads complete.');
      };
    }

    // Entry point.
    public run() {
      try {
        importScripts('angband-gen.js');
      } catch (error) {
        this.reportError(error.message);
      }
    }


    // The following functions are called from emscripten.
    // Set a cell at (row, col) to the given character code, with the given color.
    public setCell(row: number, col: number, charCode: number, rgb: number) {
      const msg: SET_CELL_MSG = {
        name: "SET_CELL",
        row,
        col,
        charCode,
        rgb,
      };
      this.postMessage(msg);
    }

    // Wait for events, optionally blocking.
    public gatherEvent(block: boolean): Promise<boolean> {
      if (this.hasEvent()) {
        // Already have one.
        console.log("Already had event");
        return new Promise((resolve) => resolve(true));
      } else if (block) {
        // Wait until we get the next event.
        console.log("Waiting for event");
        return this.eventPromise;
      } else {
        // Pump the event loop and then see.
        console.log("Briefly checking for event");
        return new Promise((resolve) => {
          setTimeout(() => resolve(this.hasEvent()), 0)
        });
      }
    }

    // \return the key code for the current event.
    public eventKeyCode(): number {
      console.log("eventKeyCode: " + this.eventQueue[0].code);
      return this.eventQueue[0].code;
    }

    // \return the event modifiers for the current event.
    public eventModifiers(): number {
      return this.eventQueue[0].modifiers;
    }

    // Remove the current event.
    public popEvent() {
      let evt = this.eventQueue.shift();
      if (evt === undefined) throw new Error("No events");
    }
  }
}
var ANGBAND: angband.ThreadWorker = new angband.ThreadWorker(self as unknown as Worker);

// JS has a global worker onmessage hook.
onmessage = ANGBAND.onMessage.bind(ANGBAND);

// Set up our Module object for emscripten.
var Module: any = {};
Module['setStatus'] = ANGBAND.moduleSetStatus.bind(ANGBAND);
Module['monitorRunDependencies'] = ANGBAND.getModuleDependencyMonitor();

ANGBAND.run();
