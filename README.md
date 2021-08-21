## Shelob: Angband on the Web

This is Angband 3.4.1 running on the web, in your browser.

## Features

- Saving
- Fonts
- Graphics
- The borg (as tagged in 3.4.1)
- Turbo!

## Desired stuff (you can help!)

- Grid resizing (currently always 80x24)
- [Updated borg](http://www.innovapain.com/borg/angband-341/)
- Multiple savefiles
- Allow downloading your savefile
- Remember preferences (font, graphics) across sesssions
- Better support on mobile (e.g. run the borg without a keyboard)
- Sound support


## Build Requirements

Building on Linux is recommended. You will need:

1. GNU Make version 4.3 or later
2. Emscripten 2.0.27 or later
3. Typescript (4.3.5 is known to work)

Earlier versions of gmake and emscripten will NOT work.

## Quickstart

From the root directory:

    make -C src -f Makefile.emscripten -j 8
    cd src/built
    python -m http.server 8080 # or any local web server

Now visit your little local server (e.g. `localhost:8080`) and enjoy!

## Architecture

Shelob is Angband compiled to WASM using Emscripten. The WASM is run in a web worker, which exchanges messages with the render (main) thread. The savefile is backed by IndexedDB.

The render thread draws Angband text using an HTML table. The same table is also used in graphics mode, where we use a `background-image` and a sprite map.

Logic around event handling, Angband hooks, etc. is implemented in TypeScript.

Shelob does not use WebGL, canvas, React, or any server-side components. It is pure static assets.
