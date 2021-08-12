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

#include <stdint.h>
#include <emscripten/emscripten.h>

errr init_emscripten(int argc, char **argv);

static const char * const help_emscripten = "emscripten mode";

/*
 * List of the available modules in the order they are tried.
 */
static const struct module modules[] =
{
	{ "emscripten", help_emscripten, init_emscripten },
#ifdef USE_STATS
	{ "stats", help_stats, init_stats },
#endif /* USE_STATS */
};

static int init_sound_dummy(int argc, char *argv[]) {
	return 0;
}

/*
 * List of sound modules in the order they should be tried.
 */
static const struct module sound_modules[] =
{	{ "none", "No sound", init_sound_dummy },
};

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
	term_data *td = (term_data *)(Term->data);
	uint32_t color = rgb_from_table_index(a);

	for (int i=0; i < n; i++) {
		int row = y;
		int col = x + i;
		wchar_t c = s[i];
		EM_ASM({
			GRID.setCell($0, $1, $2, $3);
		}, row, col, c, color);
	}

	/* the lower 7 bits of the attribute indicate the fg/bg */
	//int attr = a & 127;

	/* the high bit of the attribute indicates a reversed fg/bg */
	//int flip = a > 127 ? A_REVERSE : A_NORMAL;

	//wattrset(td->win, colortable[attr] | flip);
	//mvwaddnwstr(td->win, y, x, s, n);
	//wattrset(td->win, A_NORMAL);
	return 0;
}


/*
 * "Move" the hardware cursor.
 */
static errr Term_curs_emscripten(int x, int y) {
	term_data *td = (term_data *)(Term->data);
	//wmove(td->win, y, x);
	return 0;
}


/*
 * Erase a grid of space
 */
static errr Term_wipe_emscripten(int x, int y, int n) {
	term_data *td = (term_data *)(Term->data);

	//wmove(td->win, y, x);

	// if (x + n >= td->t.wid)
	// 	/* Clear to end of line */
	// 	wclrtoeol(td->win);
	// else
	// 	/* Clear some characters */
	// 	whline(td->win, ' ', n);

	return 0;
}

/*
 * React to changes
 */
static errr Term_xtra_emscripten_react(void) {
	return 0;
}

/*
 * Check for Events, return 1 if we process any.
 */
static int Term_xtra_emscripten_event(int wait)
{ 
    
    //Term_keypress;
	return 0;
}

/*
 * Handle a "special request"
 */
static errr Term_xtra_emscripten(int n, int v) {
	//printf("Got xtra %d -> %d\n", n, v);
	emscripten_sleep(1);
	term_data *td = (term_data *)(Term->data);

	/* Analyze the request */
	switch (n) {
		/* Clear screen */
		case TERM_XTRA_CLEAR:
			//touchwin(td->win);
			//wclear(td->win);
			return 0;

		/* Make a noise */
		case TERM_XTRA_NOISE:
			//write(1, "\007", 1);
			return 0;

		/* Flush the Curses buffer */
		case TERM_XTRA_FRESH:
			//wrefresh(td->win);
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
			emscripten_sleep(v);
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

errr init_emscripten(int argc, char **argv)
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



/*
 * Handle a "-d<what>=<path>" option
 *
 * The "<what>" can be any string starting with the same letter as the
 * name of a subdirectory of the "lib" folder (i.e. "i" or "info").
 *
 * The "<path>" can be any legal path for the given system, and should
 * not end in any special path separator (i.e. "/tmp" or "~/.ang-info").
 */
static void change_path(const char *info)
{
	if (!info || !info[0])
		quit_fmt("Try '-d<path>'.", info);

	string_free(ANGBAND_DIR_USER);
	ANGBAND_DIR_USER = string_make(info);
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

static void debug_opt(const char *arg) {
	if (streq(arg, "mem-poison-alloc"))
		mem_flags |= MEM_POISON_ALLOC;
	else if (streq(arg, "mem-poison-free"))
		mem_flags |= MEM_POISON_FREE;
	else {
		puts("Debug flags:");
		puts("  mem-poison-alloc: Poison all memory allocations");
		puts("   mem-poison-free: Poison all freed memory");
		exit(0);
	}
}

/*
 * Simple "main" function for multiple platforms.
 *
 * Note the special "--" option which terminates the processing of
 * standard options.  All non-standard options (if any) are passed
 * directly to the "init_xxx()" function.
 */
int main(int argc, char *argv[])
{
	int i;

	bool done = FALSE;

	const char *mstr = NULL;
	const char *soundstr = NULL;

	bool args = TRUE;


	/* Save the "program name" XXX XXX XXX */
	argv0 = argv[0];

	/* Drop permissions */
	safe_setuid_drop();


	/* Process the command line arguments */
	for (i = 1; args && (i < argc); i++)
	{
		const char *arg = argv[i];

		/* Require proper options */
		if (*arg++ != '-') goto usage;

		/* Analyze option */
		switch (*arg++)
		{
			case 'n':
				new_game = TRUE;
				break;

			case 'w':
				arg_wizard = TRUE;
				break;

			case 'r':
				arg_rebalance = TRUE;
				break;

			case 'g':
				/* Default graphics tile */
				/* in graphics.txt, 2 corresponds to adam bolt's tiles */
				arg_graphics = 2; 
				if (*arg) arg_graphics = atoi(arg);
				break;

			case 'u':
				if (!*arg) goto usage;

				/* Get the savefile name */
				my_strcpy(op_ptr->full_name, arg, sizeof(op_ptr->full_name));
				continue;

			case 'm':
				if (!*arg) goto usage;
				mstr = arg;
				continue;

			case 's':
				if (!*arg) goto usage;
				soundstr = arg;
				continue;

			case 'd':
				change_path(arg);
				continue;

			case 'x':
				debug_opt(arg);
				continue;

			case '-':
				argv[i] = argv[0];
				argc = argc - i;
				argv = argv + i;
				args = FALSE;
				break;

			default:
			usage:
				puts("Usage: angband [options] [-- subopts]");
				puts("  -n             Start a new character (WARNING: overwrites default savefile without -u)");
				puts("  -w             Resurrect dead character (marks savefile)");
				puts("  -r             Rebalance monsters");
				puts("  -g             Request graphics mode");
				puts("  -x<opt>        Debug options; see -xhelp");
				puts("  -u<who>        Use your <who> savefile");
				puts("  -d<path>       Store pref files and screendumps in <path>");
				puts("  -s<mod>        Use sound module <sys>:");
				for (i = 0; i < (int)N_ELEMENTS(sound_modules); i++)
					printf("     %s   %s\n", sound_modules[i].name,
					       sound_modules[i].help);
				puts("  -m<sys>        Use module <sys>, where <sys> can be:");

				/* Print the name and help for each available module */
				for (i = 0; i < (int)N_ELEMENTS(modules); i++)
					printf("     %s   %s\n",
					       modules[i].name, modules[i].help);

				/* Actually abort the process */
				quit(NULL);
		}
		if (*arg) goto usage;
	}

	/* Hack -- Forget standard args */
	if (args)
	{
		argc = 1;
		argv[1] = NULL;
	}

	/* Install "quit" hook */
	quit_aux = quit_hook;

	/* If we were told which mode to use, then use it */
	if (mstr)
		ANGBAND_SYS = mstr;

	if (setlocale(LC_CTYPE, "")) {
		/* Require UTF-8 */
		if (strcmp(nl_langinfo(CODESET), "UTF-8") != 0)
			quit("Angband requires UTF-8 support");
	}

	/* Get the file paths */
	init_stuff();

	/* Try the modules in the order specified by modules[] */
	for (i = 0; i < (int)N_ELEMENTS(modules); i++)
	{
		/* User requested a specific module? */
		if (!mstr || (streq(mstr, modules[i].name)))
		{
			ANGBAND_SYS = modules[i].name;
			if (0 == modules[i].init(argc, argv))
			{
				done = TRUE;
				break;
			}
		}
	}

	/* Make sure we have a display! */
	if (!done) quit("Unable to prepare any 'display module'!");

	/* Process the player name */
	process_player_name(TRUE);

	/* Try the modules in the order specified by sound_modules[] */
	for (i = 0; i < (int)N_ELEMENTS(sound_modules); i++)
		if (!soundstr || streq(soundstr, sound_modules[i].name))
			if (0 == sound_modules[i].init(argc, argv))
				break;

	/* Catch nasty signals */
	signals_init();

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
