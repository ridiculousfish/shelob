/* Note this should have no actual JS logic, only interfaces. */
declare namespace angband {
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

  export interface SET_CELL_PICT_MSG {
    name: "SET_CELL_PICT",
    row: number,
    col: number,
    mode: number, // index into "graphics.txt"
    pictRow: number, // foreground location
    pictCol: number,
    terrRow: number, // terrain location
    terrCol: number,
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

  export interface RESTART_MSG {
    name: "RESTART",
  }

  export interface GOT_SAVEFILE_MSG {
    name: "GOT_SAVEFILE",
    contents: ArrayBuffer | undefined,
  }

  // List of messages sent from ThreadWorker to Render.
  export type RenderEvent =
    ERROR_MSG | STATUS_MSG | PRINT_MSG | SET_CELL_MSG | SET_CELL_PICT_MSG |
    SET_CURSOR_MSG | WIPE_CELLS_MSG | CLEAR_SCREEN_MSG | FLUSH_DRAWING_MSG |
    BATCH_RENDER_MSG | RESTART_MSG | GOT_SAVEFILE_MSG;

  export interface KEY_EVENT_MSG {
    name: "KEY_EVENT",
    key: string,
    code: number,
    modifiers: number,
  }

  export interface SET_TURBO_MSG {
    name: "SET_TURBO",
    value: boolean,
  }

  export interface SET_GRAPHICS_MSG {
    name: "SET_GRAPHICS",
    mode: number,
  }

  export interface ACTIVATE_BORG_MSG {
    name: "ACTIVATE_BORG",
  }

  export interface GET_SAVEFILE_CONTENTS_MSG {
    name: "GET_SAVEFILE_CONTENTS",
  }

  // Messages sent from Render to ThreadWorker.
  export type WorkerEvent = KEY_EVENT_MSG | SET_TURBO_MSG | SET_GRAPHICS_MSG | ACTIVATE_BORG_MSG | GET_SAVEFILE_CONTENTS_MSG;
}
