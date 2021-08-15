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

  function keyCodeForKey(key: string) {
    switch (key) {
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
      default: return key.charCodeAt(0);
    }
  }


  type Column = HTMLTableDataCellElement;
  type Row = Column[];

  export class AngbandGrid {
    public columns: number;
    public rows: number;

    cells: Row[];
    nbsp: "\xA0";

    constructor(public element: HTMLTableElement) {
      this.columns = 80;
      this.rows = 24;
    }

    // Rebuild our table.
    rebuildCells() {
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
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

    // Set the cell at (row, col) to a character given by charCode, with the color rgb.
    public setCell(msg: SET_CELL_MSG) {
      let { row, col, charCode, rgb } = msg;
      if (row > this.cells.length || col > this.cells[row].length)
        throw (`Cell ${row}, ${col} out of bounds`);
      let cell = this.cells[row][col];
      cell.style.color = '#' + rgb.toString(16);
      cell.textContent = (charCode === 0x20 ? this.nbsp : String.fromCharCode(charCode));
    }
  }

  export class AngbandUI {
    worker: Worker;

    // Called when we receive a message from our WebWorker.
    onMessage(evt: MessageEvent) {
      const msg = evt.data as RenderEvent;
      switch (msg.name) {
        case 'ERROR':
          // TODO: display this.
          console.log("Got error: " + msg.text);
          break;
        case 'SET_CELL':
          this.grid.setCell(msg as SET_CELL_MSG);
          break;
        default:
          console.log("Unknown message: " + JSON.stringify(msg));
          break;
      }
    }

    // Called when we receive a key event.
    public handleKeyEvent(evt: KeyboardEvent) {
      this.worker.postMessage({
        name: "KEY_EVENT",
        key: evt.key,
        modifiers: 0,
      });
      if (evt.preventDefault)
        evt.preventDefault();
    };

    constructor(public grid: AngbandGrid) {
      this.grid.rebuildCells();
      this.worker = new Worker('assets/worker.js');
      this.worker.onmessage = this.onMessage.bind(this);
    }
  }
}

const ANGBAND_UI = new angband.AngbandUI(new angband.AngbandGrid(document.getElementById('main-angband-grid') as HTMLTableElement));
document.addEventListener('keydown', ANGBAND_UI.handleKeyEvent.bind(ANGBAND_UI));
