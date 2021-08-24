## Shelob: Angband on the Web

[![Build Actions Status](https://github.com/ridiculousfish/shelob/workflows/Build/badge.svg)](https://github.com/ridiculousfish/shelob/actions)

This is Angband 3.4.1 running on the web, in your browser. [Play it now!](https://ang.band/)

## Features

- Save files via IndexedDB
- Fonts
- Graphics
- The borg (as tagged in 3.4.1)
- Turbo!

## Desired stuff (you can help!)

- Grid resizing (currently always 80x24)
- Multiple savefiles
- Remember preferences (font, graphics) across sesssions
- Mobile support, somehow
- Mouse and sound support


## Build Requirements

Building on Linux and Mac is supported. You will need:

1. Emscripten 2.0.27 or later (earlier versions will NOT work).
2. Typescript (4.3.5 is known to work)

## Quickstart

From the root directory:

    make -C src -f Makefile.emscripten -j 8
    cd src/built
    python3 -m http.server 8080 # or any local web server

Now use your browser to visit your little local server (e.g. `localhost:8080`) and enjoy!

## Architecture

Shelob is Angband compiled to WASM using Emscripten. The WASM is run in a web worker, which exchanges messages with the render (main) thread. The savefile is backed by IndexedDB. The render thread draws the Angband text using an HTML table. The same table is also used in graphics mode, where we use a `background-image` and a sprite map. Logic around event handling, Angband hooks, etc. is implemented in TypeScript.

Shelob is pure static assets, hosted on GitHub pages. A [GitHub action](https://github.com/ridiculousfish/shelob/blob/v3.4.1-emscripten/.github/workflows/main-3.4.1.yaml) automatically deploys to GitHub pages on Push.

Some important files:

- [`render.ts`](https://github.com/ridiculousfish/shelob/blob/v3.4.1-emscripten/src/web/src/render.ts): glue code run on the main thread. This sends key events and receives rendering commands, which it translates into DOM updates.

- [`worker.ts`](https://github.com/ridiculousfish/shelob/blob/v3.4.1-emscripten/src/web/src/worker.ts): glue code run in the web worker, synchronously with the Angband C code. This receives events and issues rendering commands by sending messages to the main thread.

- [`main-emscripten.c`](https://github.com/ridiculousfish/shelob/blob/v3.4.1-emscripten/src/main-emscripten.c) is the new "front-end" C code, which talks to the rest of the Angband code base.
