
function AngbandGrid(gridElement) {
  if (! gridElement) throw "Invalid grid element";

  const self = this;
  self.element = gridElement;
  self.columns = 80;
  self.rows = 24;

  // A 2D array of (row, column) for our cells.
  self.cells = [];

  /// Non-breaking space char.
  const nbsp = "\xA0";

  self.rebuildCells = () => {
    while (self.element.firstChild) {
      self.element.removeChild(self.element.firstChild);
    }
    self.cells.length = 0;
    for (let row = 0; row < self.rows; row++) {
      var tr = document.createElement('tr');
      let rowlist = [];
      for (let col = 0; col < self.columns; col++) {
        let td = document.createElement("td");
        td.textContent = nbsp;
        tr.appendChild(td);
        rowlist.push(td);
      }
      self.cells.push(rowlist);
      self.element.appendChild(tr);
    }
  };

  // Set the cell at (row, column) to a character given by charCode, with the color rgb.
  self.setCell = (row, col, charCode, rgb) => {
    if (row > self.rows.length || col > self.cells[row].length) throw (`Cell ${row}, ${col} out of bounds`);
    let cell = self.cells[row][col];
    cell.style.color = '#' + rgb.toString(16);
    if (charCode == 0x20) charCode = nbsp;
    cell.textContent = String.fromCharCode(charCode);
  };
};

function AngbandRunner(grid) {
  const self = this;
  self.grid = grid;
  self.grid.rebuildCells();

  self.worker = new Worker('angband-loader.js');
  self.worker.onmessage = function(e) {
    const msg = e.data;
    switch (msg.name) {
      case 'ERROR':
        // TODO: display this.
        console.log("Got error: " + msg.text);
        break;

      case 'SET_CELL':
        self.grid.setCell(msg.row, msg.col, msg.charCode, msg.rgb);
        break;

      default:
        console.log("Unknown message: " + JSON.stringify(msg));
    }
  };

  self.handleKeyEvent = (evt) => {
    console.log("Posting " + evt.key);
    self.worker.postMessage({
      name: "KEY_EVENT",
      key: evt.key,
      modifiers: 0,
    });
    if (evt.preventDefault) evt.preventDefault();
  };
  document.addEventListener('keydown', self.handleKeyEvent.bind(self));
}

const RUNNER = new AngbandRunner(new AngbandGrid(document.getElementById('main-angband-grid')));
