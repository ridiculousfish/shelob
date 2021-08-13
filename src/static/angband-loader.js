// We are run in a web worker.

function AngbandThreadRunner() {
  const self = this;

  // Messages we support.
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

  self.reportError = (txt) => {
    ERROR_MSG.text = text;
    postMessage(ERROR_MSG);
  };

  self.run = () => {
    try {
      importScripts('angband.js');
    } catch (error) {
      self.reportError(error.message);
    }
  };

  // The following functions are called from emscripten.
  self.setCell = (row, col, charCode, rgb) => {
    SET_CELL_MSG.row = row;
    SET_CELL_MSG.col = col;
    SET_CELL_MSG.charCode = charCode;
    SET_CELL_MSG.rgb = rgb;
    postMessage(SET_CELL_MSG);
  };

  self.nextEvent = (row, col, charCode, rgb) => {
  }
};

ANGBAND = new AngbandThreadRunner();
ANGBAND.run();

