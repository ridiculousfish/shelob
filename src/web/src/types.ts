/* Note this should have no actual JS logic, only interfaces. */
namespace angband {
  export type ModifierMask = number;

  // List of messages sent from AngbandWorker.
  export interface ERROR_MSG {
    name: "ERROR",
    text: string,
  }

  export interface STATUS_MSG {
    name: "STATUS",
    text: string,
  }

  export interface SET_CELL_MSG {
    name: "SET_CELL",
    row: number,
    col: number,
    charCode: number,
    rgb: number
  }

  export type RenderEvent = ERROR_MSG | STATUS_MSG | SET_CELL_MSG;

  // Messages sent from render.
  export interface KEY_EVENT_MSG {
    name: "KEY_EVENT",
    key: string,
    code: number,
    modifiers: number,
  }

  export type WorkerEvent = KEY_EVENT_MSG;
}
