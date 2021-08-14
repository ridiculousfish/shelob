import * as shared from "./angband-shared.js";

type Column = HTMLTableDataCellElement;
type Row = Column[];

class AngbandGrid {
  public columns: number;
  public rows: number;

  cells: Row[];
  nbsp: "\xA0";

  constructor(public element: HTMLTableElement) { }

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
  public setCell(msg: shared.SET_CELL_MSG) {
    let { row, col, charCode, rgb } = msg;
    if (row > this.cells.length || col > this.cells[row].length)
      throw (`Cell ${row}, ${col} out of bounds`);
    let cell = this.cells[row][col];
    cell.style.color = '#' + rgb.toString(16);
    cell.textContent = (charCode === 0x20 ? this.nbsp : String.fromCharCode(charCode));
  };
}

class AngbandUI {
  worker: Worker;

  // Called when we receive a message from our WebWorker.
  onMessage(evt: MessageEvent) {
    const msg = evt.data as shared.RenderEvent;
    switch (msg.name) {
      case 'ERROR':
        // TODO: display this.
        console.log("Got error: " + msg.text);
        break;
      case 'SET_CELL':
        this.grid.setCell(msg as shared.SET_CELL_MSG);
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
    this.worker = new Worker('angband-loader.js');
    this.worker.onmessage = this.onMessage.bind(this);
  }
};

const ANGBAND_UI = new AngbandUI(new AngbandGrid(document.getElementById('main-angband-grid') as HTMLTableElement));
document.addEventListener('keydown', ANGBAND_UI.handleKeyEvent.bind(ANGBAND_UI));
