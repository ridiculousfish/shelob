"use strict";
/// <reference path='./types.d.ts' />
/// <reference path='./emscripten.d.ts' />
var angband;
(function (angband) {
    // A special "wake up" event which is ignored on the C side.
    const WAKE_UP_EVENT = {
        key: "",
        code: -1,
        modifiers: 0,
    };
    // A class which gets called from C source.
    class ThreadWorker {
        constructor(worker) {
            this.worker = worker;
            // List of queued events.
            this.eventQueue = [];
            // Enqueued render events, to be sent in flushDrawing().
            this.enqueuedRenderEvents = [];
            // Emscripten gets salty if we have multiple fsyncs going at once.
            this.fsyncRequested = false;
            this.fsyncInFlight = false;
            // Graphics mode, or 0 for ASCII.
            this.desiredGraphicsMode = 0;
            // Whether FS initialization has been performed.
            this.fsInitialized = false;
            // If set, activate the borg (and clear this flag) on next check.
            this.activateBorg = false;
            // Whee!
            this.turbo = false;
            // The module object.
            // This is set once the module is loaded.
            this.module = undefined;
            // Incoming message handler.
            this.onMessage = (msg) => {
                let evt = msg.data;
                switch (evt.name) {
                    case 'KEY_EVENT':
                        this.gotEvent(evt);
                        break;
                    case 'SET_TURBO':
                        this.turbo = evt.value;
                        break;
                    case 'SET_GRAPHICS':
                        this.setGraphicsMode(evt.mode);
                        break;
                    case 'ACTIVATE_BORG':
                        this.setActivateBorg(evt);
                        break;
                    case 'GET_SAVEFILE_CONTENTS':
                        this.getSavefileContents(evt);
                        break;
                    default:
                        this.reportError("Unknown event: " + JSON.stringify(evt));
                        break;
                }
            };
            this.eventPromiseCallback = (_b) => { }; // satisfy the compiler that this is assigned.
            this.eventPromise = new Promise((resolve) => {
                this.eventPromiseCallback = resolve;
            });
        }
        // \return whether we have at least one event.
        hasEvent() { return this.eventQueue.length > 0; }
        // Post a message to our renderer.
        postMessage(msg) {
            this.worker.postMessage(msg);
        }
        // Post an error message to our renderer.
        reportError(text) {
            const msg = {
                name: "ERROR",
                text,
            };
            this.postMessage(msg);
        }
        // Post a key event to our queue.
        postKeyEvent(evt) {
            this.eventQueue.push(evt);
            let cb = this.eventPromiseCallback;
            this.eventPromise = new Promise((resolve) => {
                this.eventPromiseCallback = resolve;
            });
            cb(this.hasEvent());
        }
        // Called when we receive an event.
        gotEvent(evt) {
            this.postKeyEvent({
                key: evt.key,
                code: evt.code,
                modifiers: evt.modifiers,
            });
        }
        // Update the desired graphics mode.
        setGraphicsMode(mode) {
            if (mode !== this.desiredGraphicsMode) {
                this.desiredGraphicsMode = mode;
                this.postKeyEvent(WAKE_UP_EVENT);
            }
        }
        setActivateBorg(_msg) {
            this.activateBorg = true;
            this.postKeyEvent(WAKE_UP_EVENT);
        }
        getSavefileContents(_msg) {
            // We could go through C but it is easier to just use the FS API.
            // Here we hard-code the Angband savefile name.
            let contents;
            try {
                let data = this.fs().readFile("/lib/save/PLAYER");
                contents = data.buffer.slice(data.byteOffset, data.byteLength + data.byteOffset);
            }
            catch (_err) {
                // e.g. file not found
                contents = undefined;
            }
            const msg = {
                name: "GOT_SAVEFILE",
                contents,
            };
            this.postMessage(msg);
        }
        // Report status in our Emscripten module.
        moduleSetStatus(text) {
            const msg = {
                name: "STATUS",
                text,
            };
            this.postMessage(msg);
        }
        // Reflect anything printed to stdout.
        modulePrint(text) {
            const msg = {
                name: "PRINT",
                text,
                stderr: false,
            };
            this.postMessage(msg);
        }
        modulePrintErr(text) {
            const msg = {
                name: "PRINT",
                text,
                stderr: true,
            };
            this.postMessage(msg);
        }
        // Report run dependencies.
        getModuleDependencyMonitor() {
            let totalDependencies = 0;
            return (left) => {
                if (totalDependencies < left)
                    totalDependencies = left;
                this.moduleSetStatus(left ? 'Preparing... (' + (totalDependencies - left) + '/' + totalDependencies + ')' : 'All downloads complete.');
            };
        }
        // \return our filesystem, asserting that we have one.
        fs() {
            if (this.module === undefined)
                throw new Error("No module set");
            return this.module.FS;
        }
        /** The following functions are called from emscripten **/
        // Called from C to perform any initial setup.
        initializeFilesystem() {
            if (this.fsInitialized)
                return;
            if (this.module === undefined)
                throw new Error("Module not set");
            this.fsInitialized = true;
            this.fs().mkdir("/lib/save");
            this.fs().mount(this.module.IDBFS, {}, "/lib/save");
            this.fsync(true /* populate */);
        }
        // Called to trigger an syncfs().
        fsync(populate) {
            if (this.fsyncInFlight) {
                this.fsyncRequested = true;
                return;
            }
            // Collapse undefined to false.
            this.fsyncRequested = false;
            this.fsyncInFlight = true;
            this.fs().syncfs(populate || false, (err) => {
                if (err)
                    ANGBAND.reportError(JSON.stringify(err));
                // fsync is complete. Perhaps run another one.
                this.fsyncInFlight = false;
                if (this.fsyncRequested) {
                    setTimeout(() => {
                        if (this.fsyncRequested && !this.fsyncInFlight)
                            this.fsync(false);
                    }, 0);
                }
            });
        }
        // Called when quitting from C.
        // Emscripten is salty about calling main again.
        // We just drop our entire WebWorker and reincarnate.
        quitWithGreatForce() {
            const msg = {
                name: "RESTART",
            };
            this.postMessage(msg);
            this.worker.terminate();
        }
        // Set a cell at (row, col) to the given character code, with the given color.
        setCell(row, col, charCode, rgb) {
            const msg = {
                name: "SET_CELL",
                row,
                col,
                charCode,
                rgb,
            };
            this.enqueuedRenderEvents.push(msg);
        }
        // Draw a picture in a cell. The 'mode' is an index into the "graphics.txt" document.
        setCellPict(row, col, mode, pictRow, pictCol, terrRow, terrCol) {
            const msg = {
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
        wipeCells(row, col, count) {
            if (count <= 0)
                return;
            const msg = {
                name: "WIPE_CELLS",
                row,
                col,
                count,
            };
            this.enqueuedRenderEvents.push(msg);
        }
        // Clear the entire screen.
        clearScreen() {
            const msg = {
                name: "CLEAR_SCREEN"
            };
            this.enqueuedRenderEvents.push(msg);
        }
        // Flush all drawing to the screen. Note this can affect frame rates.
        flushDrawing() {
            const flush = {
                name: "FLUSH_DRAWING"
            };
            this.enqueuedRenderEvents.push(flush);
            const batch = {
                name: "BATCH_RENDER",
                events: this.enqueuedRenderEvents,
            };
            this.enqueuedRenderEvents = [];
            this.postMessage(batch);
        }
        // Move the cursor to a cell.
        setCursor(row, col) {
            const msg = {
                name: "SET_CURSOR",
                row,
                col,
            };
            this.enqueuedRenderEvents.push(msg);
        }
        // Wait for events, optionally blocking.
        gatherEvent(block) {
            if (this.hasEvent()) {
                // Already have one.
                //console.log("Already had event");
                return new Promise((resolve) => resolve(true));
            }
            else if (block) {
                // Wait until we get the next event.
                //console.log("Waiting for event");
                return this.eventPromise;
            }
            else {
                // Pump the event loop and then see.
                //console.log("Briefly checking for event");
                return new Promise((resolve) => {
                    setTimeout(() => resolve(this.hasEvent()), 0);
                });
            }
        }
        // \return the key code for the current event.
        eventKeyCode() {
            return this.eventQueue[0].code;
        }
        // \return the event modifiers for the current event.
        eventModifiers() {
            return this.eventQueue[0].modifiers;
        }
        // Remove the current event.
        popEvent() {
            let evt = this.eventQueue.shift();
            if (evt === undefined)
                throw new Error("No events");
        }
        // \return if we should activate the borg, clearing the flag.
        checkActivateBorg() {
            let res = this.activateBorg;
            this.activateBorg = false;
            return res;
        }
    }
    angband.ThreadWorker = ThreadWorker;
    // Hack: we rename angband-gen.data to angband-gen.data.bmp so github pages will gzip it.
    function locateFile(path, directory) {
        if (path === 'angband-gen.data')
            path += '.bmp';
        return directory + path;
    }
    angband.locateFile = locateFile;
})(angband || (angband = {}));
var ANGBAND = new angband.ThreadWorker(self);
// JS has a global worker onmessage hook.
onmessage = ANGBAND.onMessage.bind(ANGBAND);
try {
    importScripts('angband-gen.js');
    // Set up our Module object for emscripten.
    var moduleDefaults = {
        setStatus: ANGBAND.moduleSetStatus.bind(ANGBAND),
        monitorRunDependencies: ANGBAND.getModuleDependencyMonitor(),
        print: ANGBAND.modulePrint.bind(ANGBAND),
        printErr: ANGBAND.modulePrintErr.bind(ANGBAND),
        locateFile: angband.locateFile,
        noInitialRun: true,
    };
    createAngbandModule(moduleDefaults).then((module) => {
        ANGBAND.module = module;
        module.callMain();
    });
}
catch (error) {
    ANGBAND.reportError(error.message);
}
