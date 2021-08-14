// We are run in a web worker.

// List of key codes, copied from ui-event.h
KEY_CODE_MAPPING = {
  ARROW_DOWN:    0x80,
  ARROW_LEFT:    0x81,
  ARROW_RIGHT:   0x82,
  ARROW_UP:      0x83,
  KC_F1:         0x84,
  KC_F2:         0x85,
  KC_F3:         0x86,
  KC_F4:         0x87,
  KC_F5:         0x88,
  KC_F6:         0x89,
  KC_F7:         0x8A,
  KC_F8:         0x8B,
  KC_F9:         0x8C,
  KC_F10:        0x8D,
  KC_F11:        0x8E,
  KC_F12:        0x8F,
  KC_F13:        0x90,
  KC_F14:        0x91,
  KC_F15:        0x92,
  KC_HELP:       0x93,
  KC_HOME:       0x94,
  KC_PGUP:       0x95,
  KC_END:        0x96,
  KC_PGDOWN:     0x97,
  KC_INSERT:     0x98,
  KC_PAUSE:      0x99,
  KC_BREAK:      0x9a,
  KC_BEGIN:      0x9b,
  KC_ENTER:      0x9c /* ASCII \r */,
  KC_TAB:        0x9d /* ASCII \t */,
  KC_DELETE:     0x9e,
  KC_BACKSPACE:  0x9f /* ASCII \h */,
  ESCAPE:        0xE000
};

function keyCodeForKey(key) {
  switch (key) {
    case 'ArrowLeft': return KEY_CODE_MAPPING.ARROW_LEFT;
    case 'ArrowRight': return KEY_CODE_MAPPING.ARROW_RIGHT;
    case 'ArrowUp': return KEY_CODE_MAPPING.ARROW_UP;
    case 'ArrowDown': return KEY_CODE_MAPPING.ARROW_DOWN;
    case 'F1': return KEY_CODE_MAPPING.KC_1;
    case 'F2': return KEY_CODE_MAPPING.KC_2;
    case 'F3': return KEY_CODE_MAPPING.KC_3;
    case 'F4': return KEY_CODE_MAPPING.KC_4;
    case 'F5': return KEY_CODE_MAPPING.KC_5;
    case 'F6': return KEY_CODE_MAPPING.KC_6;
    case 'F7': return KEY_CODE_MAPPING.KC_7;
    case 'F8': return KEY_CODE_MAPPING.KC_8;
    case 'F9': return KEY_CODE_MAPPING.KC_9;
    case 'F10': return KEY_CODE_MAPPING.KC_10;
    case 'F11': return KEY_CODE_MAPPING.KC_11;
    case 'F12': return KEY_CODE_MAPPING.KC_12;
    case 'F13': return KEY_CODE_MAPPING.KC_13;
    case 'F14': return KEY_CODE_MAPPING.KC_14;
    case 'F15': return KEY_CODE_MAPPING.KC_15;
    case 'F16': return KEY_CODE_MAPPING.KC_16;
    case 'Help': return KEY_CODE_MAPPING.KC_HELP;
    case 'Home': return KEY_CODE_MAPPING.KC_HOME;
    case 'PageUp': return KEY_CODE_MAPPING.KC_PGUP;
    case 'End': return KEY_CODE_MAPPING.KC_END;
    case 'PageDown': return KEY_CODE_MAPPING.KC_PGDOWN;
    case 'Insert': return KEY_CODE_MAPPING.KC_INSERT;
    case 'Pause': return KEY_CODE_MAPPING.KC_PAUSE;
    case 'Break': return KEY_CODE_MAPPING.KC_BREAK;
    case 'Begin': return KEY_CODE_MAPPING.KC_BEGIN;
    case 'Enter': return KEY_CODE_MAPPING.KC_ENTER;
    case 'Tab': return KEY_CODE_MAPPING.KC_TAB;
    case 'Delete': return KEY_CODE_MAPPING.KC_DELETE;
    case 'Backspace': return KEY_CODE_MAPPING.KC_BACKSPACE;
    case 'Escape': return KEY_CODE_MAPPING.ESCAPE;
    default: return key.charCodeAt(0);
  }
}

function AngbandThreadRunner() {
  const self = this;

  // Outgoing messages we support.
  let ERROR_MSG = {
    name: "ERROR",
    text: "An unknown error occurred",
  };

  let SET_CELL_MSG = {
    name: "SET_CELL",
    row: 0,
    col: 0,
    charCode: 0x40, // like '@'
    rgb: 0xFF0000,
  };

  // Incoming messages.
  let KEY_EVENT_MSG = {
    name: "KEY_EVENT",
    key: "x",
    modifiers: 0,
  };

  self.reportError = (text) => {
    ERROR_MSG.text = text;
    postMessage(ERROR_MSG);
  };

  // Helper to construct a promise for a timeout.
  function promiseTimeout(timeMs) {
    return new Promise((resolve) => setTimeout(resolve, timeMs));
  }

  // Our queue of incoming events, and a promise which is resolved and refreshed when an event is handled.
  self.eventQueue = [];
  self.eventPromise = undefined;
  self.eventPromiseCallback = undefined;

  // Call any event promise and refresh it.
  self.callAndRefreshEventPromise = () => {
    let cb = self.eventPromiseCallback;
    self.eventPromise = new Promise((resolve) => {
      self.eventPromiseCallback = resolve;
    });
    if (cb) cb();
  };
  
  self.gotEvent = (evt) => {
    console.log("Got key event: " + JSON.stringify(evt));
    self.eventQueue.push(evt);
    self.callAndRefreshEventPromise();
  };

  // Incoming message handler.
  self.onmessage = (msg) => {
    switch (msg.data.name) {
      case 'KEY_EVENT_MSG':
        self.gotEvent(msg.data);
        break;
    }
  };

  self.run = () => {
    // Initial promise setup.
    self.callAndRefreshEventPromise();
    try {
      importScripts('angband.js');
    } catch (error) {
      self.reportError(error.message);
    }
  };

  // The following functions are called from emscripten.
  
  // Set a cell at (row, col) to the given character code, with the given color.
  self.setCell = (row, col, charCode, rgb) => {
    SET_CELL_MSG.row = row;
    SET_CELL_MSG.col = col;
    SET_CELL_MSG.charCode = charCode;
    SET_CELL_MSG.rgb = rgb;
    postMessage(SET_CELL_MSG);
  };

  // \return whether we have at least one event.
  self.hasEvent = () => { return self.eventQueue.length > 0; };

  // Wait for events, optionally blocking.
  // Invoke the handler with whether we have an event.
  self.waitForEvent = (block, handler) => {
    console.log("Wait for event: " + block + " - " + handler);
    if (self.hasEvent()) return handler(true);
    cb = () => {
      handler(self.hasEvent());
    };
    if (block) {
      // Wait until we get an event.
      self.promiseTimeout = self.promiseTimeout.then(cb);
    } else {
      // Invoke the handler after returning to the event loop.
      setTimeout(cb);
    }
  };

  // \return the key code for the current event.
  self.eventKeyCode = () => {
    let evt = self.eventQueue[0];
    if (evt === undefined) throw new Error("No events");
    let code = keyCodeForKey(evt.key);
    return code;
  };

  // \return the modifier flags for the current event.
  self.eventModifiers = () => { return self.eventQueue[0].modifiers; };

  // Remove an event, which must exist.
  self.popEvent = () => {
    let evt = self.eventQueue.shift();
    if (evt === undefined) throw new Error("No events");
  };
};

ANGBAND = new AngbandThreadRunner();
onmessage = ANGBAND.onmessage.bind(ANGBAND);
ANGBAND.run();

