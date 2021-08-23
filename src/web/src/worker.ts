/// <reference path='./types.d.ts' />
/// <reference path='./emscripten.d.ts' />

/// Emscripten gives us this.
declare function callMain(args?: string[]): void;

namespace angband {
  interface KeyEvent {
    readonly key: string;
    readonly code: number;
    readonly modifiers: number;
  }

  // A special "wake up" event which is ignored on the C side.
  const WAKE_UP_EVENT: KeyEvent = {
    key: "",
    code: -1,
    modifiers: 0,
  };

  // A class which gets called from C source.
  export class ThreadWorker {
    // List of queued events.
    eventQueue: KeyEvent[] = [];

    // Promise resolved when a new event is received.
    eventPromise: Promise<boolean>;

    // Callback to resolve the promise.
    eventPromiseCallback: (val: boolean) => void;

    // Enqueued render events, to be sent in flushDrawing().
    enqueuedRenderEvents: RenderEvent[] = [];

    // Emscripten gets salty if we have multiple fsyncs going at once.
    fsyncRequested: boolean = false;
    fsyncInFlight: boolean = false;

    // Graphics mode, or 0 for ASCII.
    public desiredGraphicsMode: number = 0;

    // Whether FS initialization has been performed.
    fsInitialized: boolean = false;

    // If set, activate the borg (and clear this flag) on next check.
    activateBorg: boolean = false;

    // Whee!
    public turbo: boolean = false;

    // \return whether we have at least one event.
    hasEvent(): boolean { return this.eventQueue.length > 0; }

    constructor(private worker: Worker) {
      this.eventPromiseCallback = (_b) => { }; // satisfy the compiler that this is assigned.
      this.eventPromise = new Promise((resolve) => {
        this.eventPromiseCallback = resolve;
      });
    }

    // Post a message to our renderer.
    postMessage(msg: RenderEvent) {
      this.worker.postMessage(msg);
    }

    // Post an error message to our renderer.
    public reportError(text: string): void {
      const msg: ERROR_MSG = {
        name: "ERROR",
        text,
      };
      this.postMessage(msg);
    }

    // Post a key event to our queue.
    postKeyEvent(evt: KeyEvent) {
      this.eventQueue.push(evt);
      let cb = this.eventPromiseCallback;
      this.eventPromise = new Promise((resolve) => {
        this.eventPromiseCallback = resolve;
      });
      cb(this.hasEvent());
    }

    // Called when we receive an event.
    gotEvent(evt: KEY_EVENT_MSG) {
      this.postKeyEvent(<KeyEvent>{
        key: evt.key,
        code: evt.code,
        modifiers: evt.modifiers,
      });
    }

    // Update the desired graphics mode.
    setGraphicsMode(mode: number) {
      if (mode !== this.desiredGraphicsMode) {
        this.desiredGraphicsMode = mode;
        this.postKeyEvent(WAKE_UP_EVENT);
      }
    }

    setActivateBorg(_msg: ACTIVATE_BORG_MSG) {
      this.activateBorg = true;
      this.postKeyEvent(WAKE_UP_EVENT);
    }

    // Incoming message handler.
    public onMessage = (msg: MessageEvent) => {
      let evt = msg.data as WorkerEvent;
      switch (evt.name) {
        case 'KEY_EVENT':
          this.gotEvent(evt as KEY_EVENT_MSG);
          break;
        case 'SET_TURBO':
          this.turbo = (evt as SET_TURBO_MSG).value;
          break;
        case 'SET_GRAPHICS':
          this.setGraphicsMode((evt as SET_GRAPHICS_MSG).mode);
          break;
        case 'ACTIVATE_BORG':
          this.setActivateBorg(evt as ACTIVATE_BORG_MSG);
          break;
        default:
          this.reportError("Unknown event: " + JSON.stringify(evt));
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

    // Reflect anything printed to stdout.
    public modulePrint(text: string) {
      const msg: PRINT_MSG = {
        name: "PRINT",
        text,
        stderr: false,
      };
      this.postMessage(msg);
    }

    public modulePrintErr(text: string) {
      const msg: PRINT_MSG = {
        name: "PRINT",
        text,
        stderr: true,
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

    /** The following functions are called from emscripten **/

    // Called from C to perform any initial setup.
    public initializeFilesystem() {
      if (this.fsInitialized) return;
      this.fsInitialized = true;
      /* Mount our writable filesystem. Do this here instead in loader.ts to satisfy TypeScript, which doesn't know about FS. */
      FS.mkdir("/lib/save");
      FS.mount(IDBFS, {}, "/lib/save");
      this.fsync(true /* populate */);
    }

    // Called to trigger an syncfs().
    public fsync(populate: boolean | undefined) {
      if (this.fsyncInFlight) {
        this.fsyncRequested = true;
        return;
      }

      // Collapse undefined to false.
      this.fsyncRequested = false;
      this.fsyncInFlight = true;
      FS.syncfs(populate || false, (err) => {
        if (err) ANGBAND.reportError(JSON.stringify(err));

        // fsync is complete. Perhaps run another one.
        this.fsyncInFlight = false;
        if (this.fsyncRequested) {
          setTimeout(() => {
            if (this.fsyncRequested && !this.fsyncInFlight) this.fsync(false);
          }, 0);
        }
      });
    }

    // Called when quitting from C.
    // Emscripten is salty about calling main again.
    // We just drop our entire WebWorker and reincarnate.
    public quitWithGreatForce() {
      const msg: RESTART_MSG = {
        name: "RESTART",
      };
      this.postMessage(msg);
      this.worker.terminate();
    }

    // Set a cell at (row, col) to the given character code, with the given color.
    public setCell(row: number, col: number, charCode: number, rgb: number) {
      const msg: SET_CELL_MSG = {
        name: "SET_CELL",
        row,
        col,
        charCode,
        rgb,
      };
      this.enqueuedRenderEvents.push(msg);
    }

    // Draw a picture in a cell. The 'mode' is an index into the "graphics.txt" document.
    public setCellPict(row: number, col: number, mode: number, pictRow: number, pictCol: number, terrRow: number, terrCol: number) {
      const msg: SET_CELL_PICT_MSG = {
        name: "SET_CELL_PICT",
        row,
        col,
        mode,
        pictRow,
        pictCol,
        terrRow,
        terrCol,
      };
      this.enqueuedRenderEvents.push(msg);
    }

    // Wipe N cells at (row, column).
    public wipeCells(row: number, col: number, count: number) {
      if (count <= 0) return;
      const msg: WIPE_CELLS_MSG = {
        name: "WIPE_CELLS",
        row,
        col,
        count,
      };
      this.enqueuedRenderEvents.push(msg);
    }

    // Clear the entire screen.
    public clearScreen() {
      const msg: CLEAR_SCREEN_MSG = {
        name: "CLEAR_SCREEN"
      };
      this.enqueuedRenderEvents.push(msg);
    }

    // Flush all drawing to the screen. Note this can affect frame rates.
    public flushDrawing() {
      const flush: FLUSH_DRAWING_MSG = {
        name: "FLUSH_DRAWING"
      };
      this.enqueuedRenderEvents.push(flush);
      const batch: BATCH_RENDER_MSG = {
        name: "BATCH_RENDER",
        events: this.enqueuedRenderEvents,
      };
      this.enqueuedRenderEvents = [];
      this.postMessage(batch);
    }

    // Move the cursor to a cell.
    public setCursor(row: number, col: number) {
      const msg: SET_CURSOR_MSG = {
        name: "SET_CURSOR",
        row,
        col,
      };
      this.enqueuedRenderEvents.push(msg);
    }

    // Wait for events, optionally blocking.
    public gatherEvent(block: boolean): Promise<boolean> {
      if (this.hasEvent()) {
        // Already have one.
        //console.log("Already had event");
        return new Promise((resolve) => resolve(true));
      } else if (block) {
        // Wait until we get the next event.
        //console.log("Waiting for event");
        return this.eventPromise;
      } else {
        // Pump the event loop and then see.
        //console.log("Briefly checking for event");
        return new Promise((resolve) => {
          setTimeout(() => resolve(this.hasEvent()), 0)
        });
      }
    }

    // \return the key code for the current event.
    public eventKeyCode(): number {
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

    // \return if we should activate the borg, clearing the flag.
    public checkActivateBorg() {
      let res = this.activateBorg;
      this.activateBorg = false;
      return res;
    }
  }

  // Hack: we rename angband-gen.data to angband-gen.data.bmp so github pages will gzip it.
  export function locateFile(path: string, directory: string) {
    if (path === 'angband-gen.data') path += '.bmp';
    return directory + path;
  }
}

var ANGBAND: angband.ThreadWorker = new angband.ThreadWorker(self as unknown as Worker);

// JS has a global worker onmessage hook.
onmessage = ANGBAND.onMessage.bind(ANGBAND);

// Set up our Module object for emscripten.
var Module: any = {};
Module['setStatus'] = ANGBAND.moduleSetStatus.bind(ANGBAND);
Module['monitorRunDependencies'] = ANGBAND.getModuleDependencyMonitor();
Module['print'] = ANGBAND.modulePrint.bind(ANGBAND);
Module['printErr'] = ANGBAND.modulePrintErr.bind(ANGBAND);
Module['locateFile'] = angband.locateFile;

try {
  importScripts('angband-gen.js');
} catch (error) {
  ANGBAND.reportError(error.message);
}
