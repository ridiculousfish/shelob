/// <reference path='./types.ts' />
/// <reference path='./font-type.ts' />

namespace angband {
  let KNOWN_MONO_FONTS = [
    'Andale Mono',
    'Arial',
    'Consolas',
    'Comic Sans MS',
    'Courier',
    'Courier New',
    'Droid Sans Mono',
    'Helvetica',
    'Inconsolata',
    'Lucida Console',
    'Menlo',
    'Monaco',
    'Roboto Mono',
  ];

  function getSupportedFonts(): string[] {
    if (!document.fonts) return [];
    let result: string[] = [];
    KNOWN_MONO_FONTS.forEach((name) => {
      if (document.fonts.check('12px ' + name)) {
        result.push(name);
      }
    });
    return result;
  }


  export class Settings {
    public setFont(name: string) {
      this.angbandGrid.style.fontFamily = name + ', mono';
    }

    populateFonts() {
      let fonts = getSupportedFonts();
      if (fonts.length === 0) {
        this.fontSelectElem.hidden = false;
        return;
      }
      fonts.sort();
      fonts.forEach((name) => {
        let elem = document.createElement('option');
        elem.text = name;
        this.fontSelectElem.add(elem);
      });
    }

    public setControlsShown(flag: boolean) {
      this.controlsElem.hidden = !flag;
    }

    public setBold(flag: boolean) {
      this.angbandGrid.style.fontWeight = flag ? 'bold' : 'normal';
    }

    constructor(private controlsElem: HTMLElement, private fontSelectElem: HTMLSelectElement, private angbandGrid: HTMLTableElement) {
      document.fonts.ready.then(this.populateFonts.bind(this));
    }
  }
}

const SETTINGS: angband.Settings = (function () {
  function getElem<T extends HTMLElement>(id: string): T {
    let elem = document.getElementById(id);
    if (!elem) throw new Error("No element with id " + id);
    return elem as T;
  };

  let settings = new angband.Settings(
    getElem('controls'),
    getElem('font-select'),
    getElem('main-angband-grid'),
  );
  return settings;
})();
