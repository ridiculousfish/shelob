// List of key codes, copied from ui-event.h
export const KEY_CODE_MAPPING = {
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
};

export function keyCodeForKey(key: string) {
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

export type ModifierMask = number;

// List of messages sent from AngbandWorker.
export interface ERROR_MSG {
  name: "ERROR",
  text: string,
};

export interface SET_CELL_MSG {
  name: "SET_CELL",
  row: number,
  col: number,
  charCode: number,
  rgb: number
};

export type RenderEvent = ERROR_MSG | SET_CELL_MSG;

// Messages sent from angband-render.
export interface KEY_EVENT_MSG {
  name: "KEY_EVENT",
  key: string,
  code: number,
  modifiers: number,
};

export type WorkerEvent = KEY_EVENT_MSG;
