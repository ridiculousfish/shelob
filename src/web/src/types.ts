/* Note this should have no actual JS logic, only interfaces. */
namespace angband {
  export interface ERROR_MSG {
    name: "ERROR",
    text: string,
  }

  export interface STATUS_MSG {
    name: "STATUS",
    text: string,
  }

  export interface PRINT_MSG {
    name: "PRINT",
    text: string,
    stderr: boolean,
  }

  export interface SET_CELL_MSG {
    name: "SET_CELL",
    row: number,
    col: number,
    charCode: number,
    rgb: number,
  }

  export interface SET_CURSOR_MSG {
    name: "SET_CURSOR",
    row: number,
    col: number,
  }

  export interface WIPE_CELLS_MSG {
    name: "WIPE_CELLS",
    row: number,
    col: number,
    count: number,
  }

  export interface CLEAR_SCREEN_MSG {
    name: "CLEAR_SCREEN",
  }

  export interface FLUSH_DRAWING_MSG {
    name: "FLUSH_DRAWING";
  }

  export interface BATCH_RENDER_MSG {
    name: "BATCH_RENDER",
    events: RenderEvent[],
  }

  // List of messages sent from ThreadWorker to Render.
  export type RenderEvent = ERROR_MSG | STATUS_MSG | PRINT_MSG | SET_CELL_MSG | SET_CURSOR_MSG | WIPE_CELLS_MSG | CLEAR_SCREEN_MSG | FLUSH_DRAWING_MSG | BATCH_RENDER_MSG;

  export interface KEY_EVENT_MSG {
    name: "KEY_EVENT",
    key: string,
    code: number,
    modifiers: number,
  }

  // Messages sent from Render to ThreadWorker.
  export type WorkerEvent = KEY_EVENT_MSG;
}
