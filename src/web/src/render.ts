/// <reference path='./types.d.ts' />

namespace angband {

  interface SpriteSheet {
    num: number,
    name: string,
    css: string,
    width: number, // width and height of a single cell
    height: number,
    columns: number,
    rows: number,
  };

  // Graphics settings, copied from graphics.txt.
  const SPRITE_SHEETS: SpriteSheet[] = [
    {
      num: 1,
      name: "old",
      css: 'angband-sprites-1',
      width: 8,
      height: 8,
      columns: 83,
      rows: 99,
    },
    {
      num: 2,
      name: "new",
      css: 'angband-sprites-2',
      width: 16,
      height: 16,
      columns: 32,
      rows: 60,
    },
    {
      num: 3,
      name: "david",
      css: 'angband-sprites-3',
      width: 32,
      height: 32,
      columns: 128,
      rows: 30,
    },
    {
      num: 4,
      name: "nomad",
      css: 'angband-sprites-4',
      width: 16,
      height: 16,
      columns: 32,
      rows: 60,
    },
    {
      num: 5,
      name: "shock",
      css: 'angband-sprites-5',
      width: 64,
      height: 64,
      columns: 128,
      rows: 32,
    }
  ];

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


  const CURSOR_CLASS = "angband-cursor";

  interface SpriteLoc {
    row: number;
    col: number;
  }

  // Optional graphics data associated with a cell.
  interface Pict {
    sprites: SpriteSheet;
    foreground: SpriteLoc;
    terrain: SpriteLoc | undefined;
  };

  // \return a background-position string for a pict.
  function spritePosition(sprites: SpriteSheet, loc: SpriteLoc): string {
    const xpos = loc.col / (sprites.columns - 1);
    const ypos = loc.row / (sprites.rows - 1);
    return `${xpos * 100}% ${ypos * 100}%`;
  }

  /* Helper to efficiently update CSS classes as sprite sheets change. */
  class SpriteClassUpdater {
    private lastDrawn: SpriteSheet | undefined = undefined;
    constructor(private element: HTMLElement) { }

    public setSprites(sprites: SpriteSheet | undefined) {
      if (sprites !== this.lastDrawn) {
        let classes = this.element.classList;
        if (this.lastDrawn) classes.remove(this.lastDrawn.css);
        if (sprites) classes.add(sprites.css);
        this.lastDrawn = sprites;
      }
    }
  };

  class Cell {
    public text: string = "";
    public rgb: number = 0;
    public pict: Pict | undefined = undefined;
    public dirty: boolean = false;
    public cursor: boolean = false;
    private lastDrawCursor: boolean = false;
    private foregroundUpdater: SpriteClassUpdater;
    private terrainUpdater: SpriteClassUpdater;

    // A Cell has a div inside of a td table cell.
    // The div draws on top of the td and is used for foreground pictures.
    constructor(public element: HTMLDivElement, public datacell: HTMLTableDataCellElement) {
      this.foregroundUpdater = new SpriteClassUpdater(element);
      this.terrainUpdater = new SpriteClassUpdater(datacell);
    }

    // Set our text and color, perhaps marking us dirty.
    // \return if we are dirty.
    public setTextAndColor(text: string, rgb: number): boolean {
      this.setPict(undefined);
      if (this.text !== text || this.rgb !== rgb) {
        this.text = text;
        this.rgb = rgb;
        this.dirty = true;
      }
      return this.dirty;
    }

    // Set a picture, or null.
    // \return if we are dirty.
    public setPict(pict: Pict | undefined) {
      if (this.pict !== pict) {
        this.pict = pict;
        this.dirty = true;
      }
      return this.dirty;
    }

    // \return a line like #FF0000 for our RGB.
    rgbString(): string {
      // Common case.
      if (this.rgb === 0) return "#000000";
      let rgbtext = this.rgb.toString(16);
      while (rgbtext.length < 6) rgbtext = '0' + rgbtext;
      return '#' + rgbtext;
    }

    // Mark ourselves as having the cursor.
    // \return true if dirty.
    public setHasCursor(flag: boolean) {
      if (flag !== this.cursor) {
        this.cursor = flag;
        this.dirty = true;
      }
      return this.dirty;
    }


    public drawIfDirty() {
      if (!this.dirty) return;
      this.dirty = false;
      if (this.pict) {
        const sprites = this.pict.sprites;
        this.element.textContent = "";
        this.element.style.backgroundPosition = spritePosition(sprites, this.pict.foreground);
        if (this.pict.terrain) {
          this.datacell.style.backgroundPosition = spritePosition(sprites, this.pict.terrain);
        }
        this.foregroundUpdater.setSprites(sprites);
        this.terrainUpdater.setSprites(this.pict.terrain ? sprites : undefined);
      } else {
        this.element.style.color = this.rgbString();
        this.element.textContent = this.text;
        this.foregroundUpdater.setSprites(undefined);
        this.terrainUpdater.setSprites(undefined);
      }

      if (this.cursor !== this.lastDrawCursor) {
        let classes = this.element.classList;
        this.cursor ? classes.add(CURSOR_CLASS) : classes.remove(CURSOR_CLASS);
        this.lastDrawCursor = this.cursor;
      }
    }
  }

  type Column = Cell;
  type Row = Column[];

  export class Grid {
    public columns: number = 80;
    public rows: number = 24;

    cells: Row[] = [];
    cursor: Cell | null = null;

    displayRequest: number | undefined = undefined;

    constructor(public element: HTMLTableElement) {
    }

    // Rebuild our table.
    rebuildCells() {
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
      this.cursor = null;

      this.cells.length = 0;
      for (let row = 0; row < this.rows; row++) {
        var tr = document.createElement('tr');
        let rowlist = [];
        for (let col = 0; col < this.columns; col++) {
          let td = document.createElement("td");
          tr.appendChild(td);

          let div = document.createElement("div");
          td.appendChild(div);
          div.textContent = "";
          rowlist.push(new Cell(div, td));
        }
        this.cells.push(rowlist);
        this.element.appendChild(tr);
      }
    }

    // Get a cell, or throw.
    getCell(msg: { row: number, col: number }): Cell {
      let cell = undefined;
      let row = this.cells[msg.row];
      if (row) cell = row[msg.col];
      if (!cell) throw (`Cell ${msg.row}, ${msg.col} out of bounds`);
      return cell;
    }

    // Mark ourselves as needing display: we have dirty cells, wait and redraw them in batch.
    private setNeedsDisplay() {
      if (this.displayRequest === undefined) {
        this.displayRequest = requestAnimationFrame(this.displayNow.bind(this));
      }
    }

    // Called by requestAnimationFrame to display dirty cells.
    private displayNow() {
      this.displayRequest = undefined;
      this.cells.forEach((row) => {
        row.forEach((cell) => {
          cell.drawIfDirty();
        });
      });
    }

    // Clear the cursor. Note angband expects drawing a cell to clear the cursor in that cell.
    private clearCursor() {
      if (this.cursor !== null) {
        if (this.cursor.setHasCursor(false)) this.setNeedsDisplay();
        this.cursor = null;
      }
    }

    // Set the cell at (row, col) to a character given by charCode, with the color rgb.
    public setCell(msg: SET_CELL_MSG) {
      let { charCode, rgb } = msg;
      // The cursor is transient and is cleared by any screen update.
      this.clearCursor();
      // No need to use a literal space.
      let text = (charCode === 0x20 ? "" : String.fromCharCode(charCode));
      if (this.getCell(msg).setTextAndColor(text, rgb)) this.setNeedsDisplay();
    }

    public setCellPict(msg: SET_CELL_PICT_MSG) {
      // mode is 1-based.
      const sprites: SpriteSheet = SPRITE_SHEETS[msg.mode - 1];
      if (!sprites) return;

      let { pictRow, pictCol, terrRow, terrCol } = msg;
      let terrain: SpriteLoc | undefined = undefined;
      if (terrRow >= 0) terrain = { row: terrRow, col: terrCol, };
      let pict: Pict = {
        sprites,
        foreground: { row: pictRow, col: pictCol },
        terrain,
      };
      if (this.getCell(msg).setPict(pict)) this.setNeedsDisplay();
    }

    // Set the cursor location.
    public setCursor(msg: SET_CURSOR_MSG) {
      this.clearCursor();
      let { row, col } = msg;
      if (row < this.cells.length && col < this.cells[row].length) {
        this.cursor = this.getCell({ row, col });
        if (this.cursor.setHasCursor(true)) this.setNeedsDisplay();
      }
    }

    // Wipe (clear) some cells.
    public wipeCells(msg: WIPE_CELLS_MSG) {
      this.clearCursor();
      let { row, col, count } = msg;
      for (let i = 0; i < msg.count; i++) {
        let cell = this.getCell({ row: row + i, col });
        if (cell.setTextAndColor("", 0)) this.setNeedsDisplay();
      }
    }

    // Wipe (clear) all cells.
    public wipeAllCells(_msg: CLEAR_SCREEN_MSG) {
      this.clearCursor();
      this.cells.forEach((row) => {
        row.forEach((cell) => {
          if (cell.setTextAndColor("", 0)) this.setNeedsDisplay();
        });
      });
    }

    public flushDrawing(_msg: FLUSH_DRAWING_MSG) {
      if (this.displayRequest !== undefined) {
        cancelAnimationFrame(this.displayRequest);
        this.displayNow();
      }
    }
  }

  export class Status {
    setProgressFraction(frac: number) {
      if (!isFinite(frac)) frac = 0;
      const length = this.progressRingElem.getTotalLength();
      this.progressRingElem.style.strokeDashoffset = (length * (1.0 - frac)).toFixed(4);
    }

    public setStatusText(text: string) {
      if (text === this.lastText) return;
      var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
      if (m) {
        text = m[1];
        const circle = this.progressRingElem;
        const curValue = parseInt(m[2]);
        const maxValue = parseInt(m[4]);
        this.setProgressFraction(curValue / maxValue);
        this.progressGroupElem.hidden = false;
      } else {
        // Hide after a delay to allow the progress to complete.
        this.setProgressFraction(1.0);
        setTimeout(() => this.progressGroupElem.hidden = true, 400);
      }
      this.statusTextElem.textContent = text;
      this.lastText = text;
    }

    // onerror handler.
    public globalReportError(evt: Event) {
      this.setStatusText('Exception thrown, see JavaScript console');
      this.progressGroupElem.hidden = true;
    }

    constructor(private progressGroupElem: HTMLElement, private progressRingElem: SVGCircleElement, private statusTextElem: HTMLElement) {
    }

    private lastText: string = "";
  }

  export class UI {
    worker: Worker;

    // Called when we receive a message from our WebWorker.
    onRenderEvent(msg: RenderEvent) {
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

        case 'SET_CELL_PICT':
          this.grid.setCellPict(msg as SET_CELL_PICT_MSG);
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

        case 'FLUSH_DRAWING':
          this.grid.flushDrawing(msg as FLUSH_DRAWING_MSG);
          break;

        case 'BATCH_RENDER':
          (msg as BATCH_RENDER_MSG).events.forEach((subevt) => {
            this.onRenderEvent(subevt);
          });
          break;

        case 'RESTART':
          /* Our worker has embarked upon a journey to the halls of Mandos. */
          this.worker = this.summonWorkerFromPureNonexistence();
          break;

        case 'PRINT':
          this.printOutput(msg as PRINT_MSG);
          break;

        default:
          console.log("Unknown message: " + JSON.stringify(msg));
          break;
      }
    }

    // Called when we receive a message from our WebWorker.
    onMessage(evt: MessageEvent) {
      this.onRenderEvent(evt.data as RenderEvent);
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
    }

    printOutput(evt: PRINT_MSG) {
      // Print some text.
      let { text, stderr } = evt;
      this.printOutputElement.value += text + "\n";
      this.printOutputElement.style.display = 'block';
      this.printOutputElement.scrollTop = this.printOutputElement.scrollHeight;
      (stderr ? console.error : console.log)(text);
    }

    // Wheee!
    public setTurbo(turbo: boolean) {
      this.postMessage({
        name: "SET_TURBO",
        value: turbo
      });
    }

    // Set graphics type. 0 means no graphics.
    public setGraphics(mode: number) {
      this.postMessage({
        name: "SET_GRAPHICS",
        mode,
      });
    }

    // Activate the borg.
    public unleashTheBorg() {
      this.postMessage({
        name: "ACTIVATE_BORG",
      });
    }

    sendEscape() {
      this.postMessage({
        name: "KEY_EVENT",
        key: "\x1b",
        code: 0x1b,
        modifiers: 0,
      });
    }

    summonWorkerFromPureNonexistence(): Worker {
      /* We serve the Secret Fire, the Flame Imperishable. */
      let worker = new Worker('assets/worker.js');
      worker.onmessage = this.onMessage.bind(this);
      return worker;
    }

    constructor(private grid: Grid, private status: Status, private printOutputElement: HTMLTextAreaElement) {
      // Touch triggers escape, so that the borg may be cancelled.
      this.grid.element.addEventListener('touchstart', this.sendEscape.bind(this));
      this.grid.rebuildCells();
      this.worker = this.summonWorkerFromPureNonexistence();
    }
  }
}

const ANGBAND_UI: angband.UI = (function () {
  function getBaseElem(id: string): Element {
    let elem = document.getElementById(id);
    if (!elem) throw new Error("No element with id " + id);
    return elem;
  };

  function getElem<T extends HTMLElement>(id: string): T {
    return getBaseElem(id) as Element as T;
  };

  let grid = new angband.Grid(getElem<HTMLTableElement>('main-angband-grid'));
  let status = new angband.Status(
    getElem('angband-loadings'),
    getBaseElem('progress-ring-circle') as SVGCircleElement,
    getElem('angband-status-text'));
  window.onerror = status.globalReportError.bind(status);

  let printOutput = getElem<HTMLTextAreaElement>('print-output');

  let ui = new angband.UI(grid, status, printOutput);
  document.addEventListener('keydown', ui.handleKeyEvent.bind(ui));
  return ui;
})();
