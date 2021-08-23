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
#include "birth.h"
#include "cmds.h"
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

/* Some borg guts. */
extern bool borg_active;
extern bool borg_cheat_death;

/* Called before we start the borg from the UI. This causes us to return a 'z' (start) command. */
static bool wants_start_borg = FALSE;

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

static errr Term_pict_emscripten(int x, int y, int n, const byte *ap,
                            const wchar_t *cp, const byte *tap,
                            const wchar_t *tcp)
{
	int row = y;
	int col = x;
	for (int i = 0; i < n; i++)
	{
        byte a = *ap++;
        wchar_t c = *cp++;        
        byte ta = *tap++;
        wchar_t tc = *tcp++;
		if (use_graphics && (a & 0x80) && (c & 0x80))
		{
            /* Primary Row and Col */
            int pict_row = ((byte)a & 0x7F);
            int pict_col = ((byte)c & 0x7F);

            /* Terrain Row and Col. alphablend is never set, so do something lame. */
			int draw_terrain = (current_graphics_mode->grafID > 1);
            int terr_row = draw_terrain ? ((byte)ta & 0x7F) : -1;
            int terr_col = draw_terrain ? ((byte)tc & 0x7F) : -1;

			EM_ASM({
				ANGBAND.setCellPict($0, $1, $2, $3, $4, $5, $6);
			}, row, col, current_graphics_mode->grafID, pict_row, pict_col, terr_row, terr_col);
		}
	}
	return 0;
}

/*
 * Check to see if we should activate the borg from the web UI.
 */
 static void check_activate_borg()
 {
	int do_borg = EM_ASM_INT({ return ANGBAND.checkActivateBorg(); });
	if (do_borg)
	{
		// Turn on some hacks in our event loop.
		wants_start_borg = TRUE;
	}
 }

/*
 * Check to see if requested graphics modes have changed.
 */
static void check_graphics_changes()
{
	int current = current_graphics_mode ? current_graphics_mode->grafID : GRAPHICS_NONE;
	int requested = EM_ASM_INT({ return ANGBAND.desiredGraphicsMode; });
	if (current != requested)
	{
        graphics_mode *new_mode = NULL;
		if (requested != GRAPHICS_NONE)
		{
			new_mode = get_graphics_mode(requested);
		}
        use_graphics = (new_mode != NULL);
        use_transparency = (new_mode != NULL);
        ANGBAND_GRAF = (new_mode ? new_mode->pref : NULL);
        current_graphics_mode = new_mode;

		/* Hack -- Force redraw */
		reset_visuals(TRUE);
        do_cmd_redraw();
	}
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

EM_JS(void, emscripten_quit_with_great_force, (), {
	ANGBAND.quitWithGreatForce();
})

/*
 * Helper to sync after file operations.
 */
EM_JS(void, emscripten_file_sync, (), {
	ANGBAND.fsync();
});

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
 * Check for Events, return true if we process any.
 */
static bool Term_xtra_emscripten_event(int wait)
{
	if (wants_start_borg)
	{
		if (borg_active)
		{
			// Hooray, we did it.
			wants_start_borg = FALSE;
			return FALSE;
		}

		// We're still in the process of starting the borg.
		// Wait until it wants us to block.
		if (! wait) return FALSE;

		if (!p_ptr->playing)
		{
			// Hit return until we have a character.
			Term_keypress(KC_ENTER, 0);
		}
		else
		{
			// Suppress the "are you sure" message.
			p_ptr->noscore |= NOSCORE_BORG;

			// Allow our borg to never die.
			op_ptr->opt[OPT_cheat_live] = TRUE;

			// Send the right keypresses to start it.
			Term_keypress(ESCAPE, 0);
			Term_keypress(KTRL('Z'), 0);
			Term_keypress('z', 0);
			wants_start_borg = FALSE;
		}
		return TRUE;
	}

	if (! emscripten_gather_event(wait)) return FALSE;
	int ch = EM_ASM_INT({ return ANGBAND.eventKeyCode(); });
	int mods = EM_ASM_INT({ return ANGBAND.eventModifiers(); });
	EM_ASM({ ANGBAND.popEvent(); });

	// A negative key code indicates a "wake up" event, where we react to some external change.
	if (ch < 0)
	{
		check_activate_borg();
		check_graphics_changes();
		return TRUE;
	}

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
	return TRUE;
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
			(void)Term_xtra_emscripten_event(v);
			return 0;

		/* Flush events */
		case TERM_XTRA_FLUSH:
			while (Term_xtra_emscripten_event(FALSE)) {
				continue;
			}
			return 0;

		/* Delay */
		case TERM_XTRA_DELAY:
			if (v > 0 && !emscripten_turbo()) emscripten_sleep(v);
			return 0;

		/* React to events */
		case TERM_XTRA_REACT:
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

	/* Suppress these unneeded calls. */
	t->never_bored = TRUE;

	/* Differentiate between BS/^h, Tab/^i, etc. */
	t->complex_input = TRUE;

    /* Use a "software" cursor */
    t->soft_cursor = TRUE;

	/* No need to flush individual rows. */
	t->never_frosh = TRUE;

	/* Yes to graphics. */
	t->always_pict = FALSE;
	t->higher_pict = TRUE;

	/* Set some hooks */
	t->init_hook = Term_init_emscripten;
	t->nuke_hook = Term_nuke_emscripten;
	t->text_hook = Term_text_emscripten;
	t->pict_hook = Term_pict_emscripten;
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

	/* Do some JS init now that emscripten is alive. */
	EM_ASM({ ANGBAND.initializeFilesystem(); });

	/* We quit very violently. */
	quit_aux = emscripten_quit_with_great_force;

	/* We need to sync. */
	file_sync_hook = emscripten_file_sync;

	ANGBAND_SYS = "emscripten";

	if (setlocale(LC_CTYPE, "")) {
		/* Require UTF-8 */
		if (strcmp(nl_langinfo(CODESET), "UTF-8") != 0)
			quit("Angband requires UTF-8 support");
	}

	/* Get the file paths */
	init_stuff();

	/* load possible graphics modes */
	init_graphics_modes("graphics.txt");

	/* Our initializer */
	init_emscripten();

	/* Process the player name */
	process_player_name(TRUE);

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
