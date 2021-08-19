/*
 * File: main-emscripten.c
 * Purpose: Core game initialisation for UNIX (and other) machines
 **
 * This work is free software; you can redistribute it and/or modify it
 * under the terms of either:
 *
 * a) the GNU General Public License as published by the Free Software
 *    Foundation, version 2, or
 *
 * b) the "Angband licence":
 *    This software may be copied and distributed for educational, research,
 *    and not for profit purposes provided that this copyright and statement
 *    are included in all such copies.  Other copyrights may also apply.
 */

#include "angband.h"
#include "files.h"
#include "init.h"

/* locale junk */
#include "locale.h"
#include "langinfo.h"

/*
 * Some machines have a "main()" function in their "main-xxx.c" file,
 * all the others use this file for their "main()" function.
 */

#include "main.h"
#include "textui.h"
#include "init.h"

#ifdef USE_GRAPHICS
#include "grafmode.h"
#endif

#include <stdint.h>
#include <emscripten/emscripten.h>

/*
 * A hook for "quit()".
 *
 * Close down, then fall back into "quit()".
 */
static void quit_hook(const char *s)
{
	int j;

	/* Unused parameter */
	(void)s;

	/* Scan windows */
	for (j = ANGBAND_TERM_MAX - 1; j >= 0; j--)
	{
		/* Unused */
		if (!angband_term[j]) continue;

		/* Nuke it */
		term_nuke(angband_term[j]);
	}
}

/*
 * Information about a term
 */
typedef struct term_data {
	term t;                 /* All term info */
} term_data;

/* Return an RGB color for a given attribute index. */
uint32_t rgb_from_table_index(byte idx) {
    uint32_t r = angband_color_table[idx][1];
    uint32_t g = angband_color_table[idx][2];
    uint32_t b = angband_color_table[idx][3];
	return (r << 16) | (g << 8) | (b);
}

/* Max number of windows on screen */
#define MAX_TERM_DATA 1

/* Information about our windows */
static term_data data[MAX_TERM_DATA];

static void Term_init_emscripten(term *t) {
}

static void Term_nuke_emscripten(term *t) {
}
/*
 * Place some text on the screen using an attribute
 */
static errr Term_text_emscripten(int x, int y, int n, byte a, const wchar_t *s) {
	uint32_t color = rgb_from_table_index(a);
	for (int i=0; i < n; i++) {
		int row = y;
		int col = x + i;
		wchar_t c = s[i];
		EM_ASM({
			ANGBAND.setCell($0, $1, $2, $3);
		}, row, col, c, color);
		// TODO: "the high bit of the attribute indicates a reversed fg/bg"?
	}
	return 0;
}


/*
 * "Move" the "hardware" cursor.
 */
static errr Term_curs_emscripten(int x, int y) {
	EM_ASM({
		ANGBAND.setCursor($0, $1, $2);
	}, y, x);
	return 0;
}


/*
 * Erase a grid of space
 */
static errr Term_wipe_emscripten(int x, int y, int n) {
	EM_ASM({
		ANGBAND.wipeCells($0, $1, $2);
	}, y, x, n);
	return 0;
}

/*
 * React to changes
 */
static errr Term_xtra_emscripten_react(void) {
	// This is an opportunity to react to settings from JS, e.g. switching to graphics mode.
	printf("React!\n");
	return 0;
}

/*
 * Wait for an event, optionally blocking.
 */
EM_ASYNC_JS(int, emscripten_gather_event, (int wait), {
	return ANGBAND.gatherEvent(wait);
});

/*
 * Return true if we have an event ready to go.
 */
EM_JS(int, emscripten_has_event, (), {
	return ANGBAND.hasEvent();
});

/*
 * Are we in turbo mode?
 */
EM_JS(int, emscripten_turbo, (), {
	return ANGBAND.turbo;
});

/*
 * Check for Events, return 1 if we process any.
 */
static int Term_xtra_emscripten_event(int wait)
{
	if (! emscripten_gather_event(wait)) return 0;
	int ch = EM_ASM_INT({ return ANGBAND.eventKeyCode(); });
	int mods = EM_ASM_INT({ return ANGBAND.eventModifiers(); });
	EM_ASM({ ANGBAND.popEvent(); });

	// Apply the MODS_INCLUDE_CONTROL logic, but in reverse.
	// This is because the web does not encode ctrl in key event character key codes.
	if (! (mods & KC_MOD_KEYPAD)) {
		if (! MODS_INCLUDE_SHIFT(ch)) mods &= ~KC_MOD_SHIFT;
		if (mods & KC_MOD_CONTROL) {
			// Do what the the tty would have done if we had a tty.
			// Note we must manually check for lowercase letters; MODS_INCLUDE_CONTROL assumes we'll only get uppercase.
			if (!MODS_INCLUDE_CONTROL(ch) || ('a' <= ch && ch <= 'z')) {
				ch = KTRL(ch);
				mods &= ~KC_MOD_CONTROL;
			}
		}
	}
	Term_keypress(ch, mods);	
	return 1;
}

/*
 * Handle a "special request"
 */
static errr Term_xtra_emscripten(int n, int v) {
	term_data *td = (term_data *)(Term->data);
	(void)td;

	/* Analyze the request */
	switch (n) {
		/* Clear screen */
		case TERM_XTRA_CLEAR:
			EM_ASM({ ANGBAND.clearScreen(); });
			return 0;

		/* Make a noise */
		case TERM_XTRA_NOISE:
			//write(1, "\007", 1);
			return 0;

		/* Flush the drawing buffer */
		case TERM_XTRA_FRESH:
			EM_ASM({ ANGBAND.flushDrawing(); });
			return 0;

		/* Change the cursor visibility */
		case TERM_XTRA_SHAPE:
			//printf("Ignoring TERM_XTRA_SHAPE %d\n", v);
			return 0;

		/* Process events */
		case TERM_XTRA_EVENT:
			return Term_xtra_emscripten_event(v);

		/* Flush events */
		case TERM_XTRA_FLUSH:
			while (Term_xtra_emscripten_event(FALSE)) continue;
			return 0;

		/* Delay */
		case TERM_XTRA_DELAY:
			if (v > 0 && ! emscripten_turbo()) emscripten_sleep(v);
			return 0;

		/* React to events */
		case TERM_XTRA_REACT:
			Term_xtra_emscripten_react();
			return 0;
	}

	/* Unknown event */
	return 1;
}


/*
 * Create a window for the given "term_data" argument.
 */
static errr term_data_init_emscripten(term_data *td, int rows, int cols, int y, int x) {
	term *t = &td->t;

	/* Initialize the term */
	term_init(t, cols, rows, 256);

	/* Erase with "white space" */
	t->attr_blank = TERM_WHITE;
	t->char_blank = ' ';

	/* Differentiate between BS/^h, Tab/^i, etc. */
	t->complex_input = TRUE;

    /* Use a "software" cursor */
    t->soft_cursor = TRUE;

	/* No need to flush individual rows. */
	t->never_frosh = TRUE;

	/* Special text! */
	t->higher_pict = TRUE;

	/* Set some hooks */
	t->init_hook = Term_init_emscripten;
	t->nuke_hook = Term_nuke_emscripten;

	/* Set some more hooks */
	t->text_hook = Term_text_emscripten;
	t->wipe_hook = Term_wipe_emscripten;
	t->curs_hook = Term_curs_emscripten;
	t->xtra_hook = Term_xtra_emscripten;

	/* Save the data */
	t->data = td;

	/* Activate it */
	Term_activate(t);

	/* Success */
	return (0);
}

errr init_emscripten()
{
	/* Make one term. */
	int x = 0;
	int y = 0;
	term_data_init_emscripten(&data[0], 24 /* rows */, 80 /* cols */, y, x);
	angband_term[0] = &data[0].t;
	Term_activate(&data[0].t);
	term_screen = &data[0].t;
	return 0;
}

/*
 * Initialize and verify the file paths, and the score file.
 *
 * Use the ANGBAND_PATH environment var if possible, else use
 * DEFAULT_PATH, and in either case, branch off appropriately.
 *
 * First, we'll look for the ANGBAND_PATH environment variable,
 * and then look for the files in there.  If that doesn't work,
 * we'll try the DEFAULT_PATH constants.  So be sure that one of
 * these two things works...
 *
 * We must ensure that the path ends with "PATH_SEP" if needed,
 * since the "init_file_paths()" function will simply append the
 * relevant "sub-directory names" to the given path.
 *
 * Make sure that the path doesn't overflow the buffer.  We have
 * to leave enough space for the path separator, directory, and
 * filenames.
 */
static void init_stuff(void)
{
	char configpath[512];
	char libpath[512];
	char datapath[512];

	/* Use the angband_path, or a default */
	my_strcpy(configpath, DEFAULT_CONFIG_PATH, sizeof(configpath));
	my_strcpy(libpath, DEFAULT_LIB_PATH, sizeof(libpath));
	my_strcpy(datapath, DEFAULT_DATA_PATH, sizeof(datapath));

	/* Make sure they're terminated */
	configpath[511] = '\0';
	libpath[511] = '\0';
	datapath[511] = '\0';

	/* Hack -- Add a path separator (only if needed) */
	if (!suffix(configpath, PATH_SEP)) my_strcat(configpath, PATH_SEP, sizeof(configpath));
	if (!suffix(libpath, PATH_SEP)) my_strcat(libpath, PATH_SEP, sizeof(libpath));
	if (!suffix(datapath, PATH_SEP)) my_strcat(datapath, PATH_SEP, sizeof(datapath));

	/* Initialize */
	init_file_paths(configpath, libpath, datapath);
}

static bool new_game;

/*
 * Pass the appropriate "Initialisation screen" command to the game,
 * getting user input if needed.
 */
static errr get_init_cmd(void)
{
	/* Wait for response */
	pause_line(Term);

	if (new_game)
		cmd_insert(CMD_NEWGAME);
	else
		/* This might be modified to supply the filename in future. */
		cmd_insert(CMD_LOADFILE);

	/* Everything's OK. */
	return 0;
}

/* Command dispatcher for curses, etc builds */
static errr default_get_cmd(cmd_context context, bool wait)
{
	if (context == CMD_INIT) 
		return get_init_cmd();
	else 
		return textui_get_cmd(context, wait);
}

int main(int argc, char *argv[])
{
	/* Save the "program name" XXX XXX XXX */
	argv0 = argv[0];

	/* Mount our writable filesystem. Do this here instead in loader.ts to satisfy TypeScript, which doesn't know about FS. */
	EM_ASM({
		FS.mkdir("/lib/save");
		FS.mount(IDBFS, {}, "/lib/save");
		FS.syncfs(true /* populate */, function (err) {
            if (err) console.error(err); // TODO: something better.
        });
	});

	/* Install "quit" hook */
	quit_aux = quit_hook;

	ANGBAND_SYS = "emscripten";

	if (setlocale(LC_CTYPE, "")) {
		/* Require UTF-8 */
		if (strcmp(nl_langinfo(CODESET), "UTF-8") != 0)
			quit("Angband requires UTF-8 support");
	}

	/* Get the file paths */
	init_stuff();

	/* Our initializer */
	init_emscripten();

	/* Process the player name */
	process_player_name(TRUE);

	/* Catch nasty signals */
	signals_init();

	/* load possible graphics modes */
	init_graphics_modes("graphics.txt");

	/* Set up the command hook */
	cmd_get_hook = default_get_cmd;

	/* Set up the display handlers and things. */
	init_display();


	/* Play the game */
	play_game();

	/* Free resources */
	cleanup_angband();

	/* Quit */
	quit(NULL);

	/* Exit */
	return (0);
}