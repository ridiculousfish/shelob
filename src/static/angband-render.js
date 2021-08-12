
function AngbandGrid(gridElement) {
  if (! gridElement) throw "Invalid grid element";

  const self = this;
  self.grid = gridElement;
  self.columns = 80;
  self.rows = 24;

  // A 2D array of (row, column) for our cells.
  self.cells = [];

  /// Non-breaking space char.
  const nbsp = "\xA0";

  self.rebuildCells = () => {
    while (self.grid.firstChild) {
      self.grid.removeChild(self.grid.firstChild);
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
      self.grid.appendChild(tr);
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

GRID = new AngbandGrid(document.getElementById('main-angband-grid'));
GRID.rebuildCells();

