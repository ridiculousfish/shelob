/// <reference path='./types.ts' />

namespace angband {

  // List of key codes, copied from ui-event.h
  const KEY_CODE_MAPPING = {
    ARROW_DOWN: 0x80,
    ARROW_LEFT: 0x81,
    ARROW_RIGHT: 0x82,
    ARROW_UP: 0x83,
    KC_F1: 0x84,
    KC_F2: 0x85,
    KC_F3: 0x86,
    KC_F4: 0x87,
    KC_F5: 0x88,
    KC_F6: 0x89,
    KC_F7: 0x8A,
    KC_F8: 0x8B,
    KC_F9: 0x8C,
    KC_F10: 0x8D,
    KC_F11: 0x8E,
    KC_F12: 0x8F,
    KC_F13: 0x90,
    KC_F14: 0x91,
    KC_F15: 0x92,
    KC_HELP: 0x93,
    KC_HOME: 0x94,
    KC_PGUP: 0x95,
    KC_END: 0x96,
    KC_PGDOWN: 0x97,
    KC_INSERT: 0x98,
    KC_PAUSE: 0x99,
    KC_BREAK: 0x9a,
    KC_BEGIN: 0x9b,
    KC_ENTER: 0x9c /* ASCII \r */,
    KC_TAB: 0x9d /* ASCII \t */,
    KC_DELETE: 0x9e,
    KC_BACKSPACE: 0x9f /* ASCII \h */,
    ESCAPE: 0xE000
  }

  // \return an Angband key code for the given JS keyboard event, or null if the event should be dropped (e.g. just shift key).
  function angbandKeyCodeForEvent(evt: KeyboardEvent): number | null {
    // On Mac, meta key maps to command, and so this interferes with native command key handling.
    // Do not try to handle these.
    if (evt.metaKey) return null;

    // This is probably an ordinary ASCII character like 3 or w.
    if (evt.key.length == 1) {
      let asciiCode = evt.key.charCodeAt(0);
      if (0 <= asciiCode && asciiCode <= 127) return asciiCode;
    }

    // Check more exotic keys.
    switch (evt.code) {
      case 'ArrowLeft': return KEY_CODE_MAPPING.ARROW_LEFT;
      case 'ArrowRight': return KEY_CODE_MAPPING.ARROW_RIGHT;
      case 'ArrowUp': return KEY_CODE_MAPPING.ARROW_UP;
      case 'ArrowDown': return KEY_CODE_MAPPING.ARROW_DOWN;
      case 'F1': return KEY_CODE_MAPPING.KC_F1;
      case 'F2': return KEY_CODE_MAPPING.KC_F2;
      case 'F3': return KEY_CODE_MAPPING.KC_F3;
      case 'F4': return KEY_CODE_MAPPING.KC_F4;
      case 'F5': return KEY_CODE_MAPPING.KC_F5;
      case 'F6': return KEY_CODE_MAPPING.KC_F6;
      case 'F7': return KEY_CODE_MAPPING.KC_F7;
      case 'F8': return KEY_CODE_MAPPING.KC_F8;
      case 'F9': return KEY_CODE_MAPPING.KC_F9;
      case 'F10': return KEY_CODE_MAPPING.KC_F10;
      case 'F11': return KEY_CODE_MAPPING.KC_F11;
      case 'F12': return KEY_CODE_MAPPING.KC_F12;
      case 'F13': return KEY_CODE_MAPPING.KC_F13;
      case 'F14': return KEY_CODE_MAPPING.KC_F14;
      case 'F15': return KEY_CODE_MAPPING.KC_F15;
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

      // Do not report pure modifier key changes.
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'AltLeft':
      case 'AltRight':
      // fall through
      default:
        return null;
    }
  }

  // Key modifiers copied from ui-event.h
  const KEY_MODIFIER_MAPPING = {
    KC_MOD_CONTROL: 0x01,
    KC_MOD_SHIFT: 0x02,
    KC_MOD_ALT: 0x04,
    KC_MOD_META: 0x08,
    KC_MOD_KEYPAD: 0x10,
  };

  // \return an Angband modifier mask for the given JS keyboard event.
  function angbandKeyModifiersForEvent(evt: KeyboardEvent): number {
    let res = 0;
    if (evt.ctrlKey) res |= KEY_MODIFIER_MAPPING.KC_MOD_CONTROL;
    if (evt.shiftKey) res |= KEY_MODIFIER_MAPPING.KC_MOD_SHIFT;
    if (evt.altKey) res |= KEY_MODIFIER_MAPPING.KC_MOD_ALT;
    if (evt.metaKey) res |= KEY_MODIFIER_MAPPING.KC_MOD_META;
    // This handles numpad digit keys and numpad enter.
    if (evt.code.startsWith("Numpad")) res |= KEY_MODIFIER_MAPPING.KC_MOD_KEYPAD;
    return res;
  }


  type Column = HTMLTableDataCellElement;
  type Row = Column[];

  export class Grid {
    public columns: number;
    public rows: number;

    cells: Row[];
    cursor: HTMLTableDataCellElement | null;
    nbsp: "\xA0";

    constructor(public element: HTMLTableElement) {
      this.columns = 80;
      this.rows = 24;
      this.cursor = null;
    }

    // Rebuild our table.
    rebuildCells() {
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
      this.cursor = null;

      this.cells = [];
      for (let row = 0; row < this.rows; row++) {
        var tr = document.createElement('tr');
        let rowlist = [];
        for (let col = 0; col < this.columns; col++) {
          let td = document.createElement("td");
          td.textContent = this.nbsp;
          tr.appendChild(td);
          rowlist.push(td);
        }
        this.cells.push(rowlist);
        this.element.appendChild(tr);
      }
    }

    // Clear the cursor. Note angband expects drawing a cell to clear the cursor in that cell.
    private clearCursor() {
      if (this.cursor !== null) this.cursor.classList.remove("angband-cursor");
    }

    // Set the cell at (row, col) to a character given by charCode, with the color rgb.
    public setCell(msg: SET_CELL_MSG) {
      let { row, col, charCode, rgb } = msg;
      if (row >= this.cells.length || col >= this.cells[row].length) {
        throw (`Cell ${row}, ${col} out of bounds`);
      }
      let cell = this.cells[row][col];
      if (cell === this.cursor) this.clearCursor();
      let rgbtext = rgb.toString(16);
      while (rgbtext.length < 6) rgbtext = '0' + rgbtext;
      cell.style.color = '#' + rgbtext;
      cell.textContent = (charCode === 0x20 ? this.nbsp : String.fromCharCode(charCode));
    }

    // Set the cursor location.
    public setCursor(msg: SET_CURSOR_MSG) {
      this.clearCursor();
      let { row, col } = msg;
      if (row < this.cells.length && col < this.cells[row].length) {
        this.cursor = this.cells[row][col];
        this.cursor.classList.add("angband-cursor");
      }
    }

    // Wipe (clear) some cells.
    public wipeCells(msg: WIPE_CELLS_MSG) {
      let { row, col, count } = msg;
      if (row >= this.cells.length || col + count > this.cells[row].length)
        throw (`Cell ${row}, ${col} out of bounds`);
      for (let i = 0; i < count; i++) {
        let cell = this.cells[row][col + i];
        cell.textContent = this.nbsp;
        if (cell === this.cursor) this.clearCursor();
      }
    }

    // Wipe (clear) all cells.
    public wipeAllCells(_msg: CLEAR_SCREEN_MSG) {
      this.clearCursor();
      this.cells.forEach((row) => {
        row.forEach((cell) => {
          cell.textContent = this.nbsp;
        });
      });
    }
  }

  export class Status {
    public setStatusText(text: string) {
      if (text === this.lastText) return;
      var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
      if (m) {
        text = m[1];
        this.progressElement.value = parseInt(m[2]) * 100;
        this.progressElement.max = parseInt(m[4]) * 100;
        this.progressElement.hidden = false;
        this.spinnerElement.hidden = false;
      } else {
        this.progressElement.value = 0;
        this.progressElement.max = 0;
        this.progressElement.hidden = true;
        if (!text) this.spinnerElement.style.display = 'none';
      }
      this.statusElement.textContent = text;
      this.lastText = text;
    }

    // onerror handler.
    public globalReportError(evt: Event) {
      this.setStatusText('Exception thrown, see JavaScript console');
      this.spinnerElement.style.display = 'none';
    }

    constructor(private statusElement: HTMLElement, private progressElement: HTMLProgressElement, private spinnerElement: HTMLElement) {
      this.lastText = "";
    }

    private lastText: string;
  }

  export class UI {
    worker: Worker;

    // Called when we receive a message from our WebWorker.
    onMessage(evt: MessageEvent) {
      const msg = evt.data as RenderEvent;
      switch (msg.name) {
        case 'ERROR':
          // TODO: display this.
          console.log("Got error: " + msg.text);
          break;

        case 'STATUS':
          this.status.setStatusText(msg.text);
          break;

        case 'SET_CELL':
          this.grid.setCell(msg as SET_CELL_MSG);
          break;

        case 'SET_CURSOR':
          this.grid.setCursor(msg as SET_CURSOR_MSG);
          break;

        case 'WIPE_CELLS':
          this.grid.wipeCells(msg as WIPE_CELLS_MSG);
          break;

        case 'CLEAR_SCREEN':
          this.grid.wipeAllCells(msg as CLEAR_SCREEN_MSG);
          break;

        default:
          console.log("Unknown message: " + JSON.stringify(msg));
          break;
      }
    }

    // Called to send a message to our WebWorker.
    postMessage(msg: WorkerEvent) {
      this.worker.postMessage(msg);
    }

    // Called when we receive a key event.
    public handleKeyEvent(evt: KeyboardEvent) {
      let angbandCode = angbandKeyCodeForEvent(evt);
      if (angbandCode !== null) {
        this.postMessage({
          name: "KEY_EVENT",
          key: evt.key,
          code: angbandCode,
          modifiers: angbandKeyModifiersForEvent(evt),
        });
        if (evt.preventDefault)
          evt.preventDefault();
      }
    };

    constructor(private grid: Grid, private status: Status) {
      this.grid.rebuildCells();
      this.worker = new Worker('assets/worker.js');
      this.worker.onmessage = this.onMessage.bind(this);
    }
  }
}

const ANGBAND_UI: angband.UI = (function () {
  function getElem<T extends HTMLElement>(id: string): T {
    let elem = document.getElementById(id);
    if (!elem) throw new Error("No element with id " + id);
    return elem as T;
  };
  let grid = new angband.Grid(getElem<HTMLTableElement>('main-angband-grid'));
  let status = new angband.Status(
    getElem('main-angband-status'),
    getElem('main-angband-progress'),
    getElem('main-angband-spinner'));

  window.onerror = status.globalReportError.bind(status);

  let ui = new angband.UI(grid, status);
  document.addEventListener('keydown', ui.handleKeyEvent.bind(ui));
  return ui;
})();
