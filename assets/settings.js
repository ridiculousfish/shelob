"use strict";
/// <reference path='./types.d.ts' />
/// <reference path='./font-type.d.ts' />
var angband;
(function (angband) {
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
    function getSupportedFonts() {
        if (!document.fonts)
            return [];
        let result = [];
        KNOWN_MONO_FONTS.forEach((name) => {
            if (document.fonts.check('12px ' + name)) {
                result.push(name);
            }
        });
        return result;
    }
    class Settings {
        constructor(controlsElem, fontSelectElem, angbandGrid) {
            this.controlsElem = controlsElem;
            this.fontSelectElem = fontSelectElem;
            this.angbandGrid = angbandGrid;
            document.fonts.ready.then(this.populateFonts.bind(this));
        }
        setFont(name) {
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
        setControlsShown(flag) {
            this.controlsElem.hidden = !flag;
        }
        setBold(flag) {
            this.angbandGrid.style.fontWeight = flag ? 'bold' : 'normal';
        }
    }
    angband.Settings = Settings;
})(angband || (angband = {}));
const SETTINGS = (function () {
    function getElem(id) {
        let elem = document.getElementById(id);
        if (!elem)
            throw new Error("No element with id " + id);
        return elem;
    }
    ;
    let settings = new angband.Settings(getElem('controls'), getElem('font-select'), getElem('main-angband-grid'));
    return settings;
})();
