# aCelery — System Shell Redesign

**Status:** proposal, 2026-09-15. Nothing here is built yet.

**Scope:** the system shell served at `/system/index.html`: the main menu, My
Apps, the IDE, the DB Manager and Configure. That is `web/src/ide/`, bundled as
`acelery/ide.js`, plus the Flutter screen that hosts it
(`lib/src/shell/ide_screen.dart`). `launcher.html`, the Example app and the
public API of `acelery/ui.js` are out of scope, apart from a few additive
exports (§6.4).

Phase 4 of `js-ui-framework-evaluation.md` replaced the *implementation* of the
shell: 1,024 lines of 2014 widget code became a Preact component tree. It kept
the 2014 *interaction model* almost line for line: a navbar per screen, menus of
verbs, and screens that wait to be told what to show. This document is about
the interaction model and the look. It does not revisit the stack.

---

## 0. Verdict

Replace the navbar-and-dropdowns shell with an **app frame that has
destinations**: Home, Apps, Code, Data and Settings. Each destination opens on
its own content. A screen is never blank. Every screen state gets a URL, so
Android Back, reload and a desktop browser all behave.

Keep the stack exactly as it is: Preact 10 + htm, react-bootstrap on
Bootstrap 5.3.8, CodeMirror 6, all 18 themes, and no webfonts or build step for
user apps (§9 of the evaluation). The new look is a thin token layer over
Bootstrap's own custom properties. It is not a new CSS framework.

The regression that prompted this, IDE and DB Manager opening to a hamburger
and nothing else, can be fixed on its own in a few lines (§8, R0). The rest of
the document is what the shell should become around that fix.

---

## 1. What is wrong today

### 1.1 The blank screen

Both screens start with nothing to show, and hide everything that would show
something:

- `IdeScreen` initialises `view` to `{ kind: "blank" }`
  (`web/src/ide/ide_screen.js:121`). The render code has branches for `pick`
  and `editor` and none for `blank`, so `body` stays `null`
  (`ide_screen.js:351`). `DbScreen` does the same (`db_screen.js:36`, `:210`).
- The only other thing on the page is `IdeNavbar`, a react-bootstrap
  `<Navbar expand="lg">` (`web/src/ide/chrome.js:48`). Below 992 px it collapses
  to a toggler. Every phone is below 992 px, in either orientation.

On a phone, the screen is a title, a ☰ button and an empty page. Nothing
suggests that the next step is ☰ → Project → Open → pick from a list. A first
run is worse: no project exists yet, so the first step is ☰ → Project → New.

### 1.2 Verb-first menus with invisible rules

Every action is written as *verb, then object*: choose "Delete", then choose
what to delete. The object list is the same `Picker` for all seven verbs, headed
by a green `success` alert that reads "Select project to delete"
(`chrome.js:89-109`). A success alert is being used as an instruction, and a
destructive one at that.

Which verbs are available depends on state the user cannot see
(`ide_screen.js:313-345`, `db_screen.js:179-206`):

- *Project → New*, *Open* and *Delete* are disabled while a project is open. To
  start a second project, you first have to find *Close*.
- *File → New* and *Open* are disabled while a file is open.
- *Table → Open* is disabled while a table is open.
- *Database → Delete* is enabled while a database is open, even though *New*
  and *Open* are not.

The 2014 positional-indexing code enforced exactly these rules. Phase 4 made
them declarative. The rules are still arbitrary; they are just easier to read
now.

### 1.3 Two sets of chrome

The IDE route in Flutter draws a Material `AppBar` titled "aCelery" with its
own popup menu: Main, My Apps, Network access, Keep screen on, About and Website
(`lib/src/shell/ide_screen.dart:206-228`). Below it, the web page draws its own
navbar with its own menu, which includes "Main Menu". That makes two title
bars, two overflow menus and two routes home, and together they take about
112 px of a phone screen before any content.

### 1.4 State that has no address

Which screen is showing, and which project, file, database and table are open,
all live in `useState` (`web/src/ide/index.js:210`, `ide_screen.js:117-122`,
`db_screen.js:32-37`). Nothing reaches the URL. So:

- **Back cannot step out.** Flutter's `PopScope` walks WebView history
  (`ide_screen.dart:199`). The shell never creates history, so from inside the
  editor Back leaves the IDE route entirely.
- **Running an app loses your place.** After a user app closes, Flutter
  reloads the WebView so the IDE sees any new files (`ide_screen.dart:106`).
  Importing a project does the same (`:116`). A reload resets `Shell` to its
  initial `"menu"` state (`index.js:210-212`). You edit `main.js`, tap Run, come
  back, and land on the main menu with the project closed.
- **A desktop browser cannot bookmark or refresh a screen.**

### 1.5 The look

- The main menu is a `ListGroup` of `h3` headings with a secondary line
  (`index.js:79-102`). "Visit Website" sits among the tools as a peer.
- The navbar is stock `bg-body-tertiary`. The brand colour of the aCelery theme,
  `#86a0a4`, measures **2.63:1** against that background, below WCAG AA's 4.5:1
  for text (method in §5.1).
- Loading is the word "Starting…" (`index.js:239`, `ide_screen.js:353`,
  `db_screen.js:212`).
- The editor is `height: calc(100vh - 8rem)`
  (`bundle/www/system/style/acelery.css`). That is a floor, not a fit: the
  stylesheet says so itself. `100vh` on mobile also includes the area behind
  the browser chrome.
- Save appears as a lone button *below* the editor, and only once the buffer is
  dirty (`ide_screen.js:365-371`). The only other sign of unsaved work is a
  menu item that becomes enabled.
- Every notice is a dismissible `Alert` pushed into the flow above the content
  (`chrome.js:155-171`). Success messages stay on screen until closed.

### 1.6 What is right, and stays

This is not a teardown. The following were good decisions and carry over
unchanged:

- The component tree and `acelery/ui.js`.
- `TableMaint`.
- `useConfirm` instead of `window.confirm` (`chrome.js:118`).
- Parameterised SQL and identifier validation (`db_screen.js:21`).
- CodeMirror 6 with its ten schemes.
- Theme deltas scoped with `:where`.
- `useDismiss`.
- The `forceSaveFile` contract with the host.
- The shell loading exactly the way a user app does, through the import map,
  with no privileged access.

---

## 2. Principles

1. **Never a blank screen.** A destination's home state is the list of the
   things it manages. An empty list is an *empty state*: an icon, one sentence
   and the button that fills it.
2. **Noun first.** Pick the project, file, database or table, then act on it.
   Actions belong to the thing, as row actions or a workspace toolbar. They do
   not live in a global menu that asks "which one?" afterwards.
3. **The primary action is always visible.** New, Run and Save are visible
   buttons, never hidden in ☰. An overflow menu holds only secondary and
   destructive actions.
4. **Phone first, desktop capable.** The phone is the primary form factor. A
   desktop browser over the LAN is a real second one (`README.md`, "In a
   desktop browser"), and wide layouts should use the room rather than stretch
   a phone column.
5. **One set of chrome.** The web layer owns navigation. The host provides
   what only the host can: pairing prompts, the share sheet, the file picker,
   wakelock.
6. **The URL is the state.** Every screen that you can navigate to has a route.
   Back goes up one level. Reload lands where you were.

---

## 3. Information architecture

### 3.1 Destinations

| Destination | Replaces | Home state |
|---|---|---|
| **Home** | Main menu | Continue card, quick actions, counts |
| **Apps** | My Apps | Grid of runnable apps |
| **Code** | aCelery IDE | List of projects |
| **Data** | DB Manager | List of databases |
| **Settings** | Configure, plus the Flutter menu's About / Network / Keep screen on / Website | Grouped settings |

Below 768 px the destinations sit in a **bottom navigation bar**. From 768 px up
they sit in a **navigation rail** on the left, which widens to a labelled
sidebar from 1200 px.

### 3.2 Routes

Hash routes, because the shell is one static page served by `shelf_static`, and
a hash never reaches the server.

| Route | Screen |
|---|---|
| `#/` | Home |
| `#/apps` | Apps |
| `#/code` | Projects |
| `#/code/:project` | Project workspace (file list) |
| `#/code/:project/:file` | Editor |
| `#/data` | Databases |
| `#/data/:db` | Database workspace, Tables tab |
| `#/data/:db/sql` | Database workspace, SQL tab |
| `#/data/:db/table/:table` | Table (`TableMaint`) |
| `#/data/:db/table/:table/structure` | Table structure (`TableInfo`) |
| `#/settings` | Settings |

`?opt=apps`, which the Flutter menu uses today (`index.js:211`,
`widget.runtime.myAppsUrl`), keeps working and redirects to `#/apps` with
`location.replace`.

Names in routes are `encodeURIComponent`-encoded. Project names are already
restricted to `\w{1,16}` and database names to `[\w-]+` (`ide_screen.js:55`,
`db_screen.js:265`). File names are not restricted in the same way, so encoding
matters there.

### 3.3 Back, reload and deep links

- Moving *down* a level (opening a project, a file or a table) pushes a history
  entry.
- Moving *across* (switching bottom-nav destinations, or between the Tables and
  SQL tabs) replaces the entry, so Back does not replay every tab you touched.
  This matches the platform convention for bottom navigation.
- Flutter's existing `PopScope` needs no change. It already calls
  `forceSaveFile()` and then `goBack()` while `canGoBack()` is true
  (`ide_screen.dart:196-203`). At `#/` there is no history left, so Back leaves
  the route as it does today.
- The reloads after Run and Import (`ide_screen.dart:106`, `:116`) now land on
  the same route. The route is enough to rebuild the screen: the editor route
  names the project and file, and the table route names the database and table.
- Leaving a dirty editor by any path goes through the existing `leaveFile`
  confirm (`ide_screen.js:168`). The paths are Back, the in-page back arrow, a
  nav tap and a hash change. On host Back, `forceSaveFile()` has already saved
  by then, so the prompt does not appear, which is today's behaviour.

### 3.4 Where every current menu item goes

| Today | New home |
|---|---|
| Project → New | Code: **New project** FAB; Home: quick action |
| Project → Open | Code: tap a project |
| Project → Close | Workspace: back arrow |
| Project → Delete | Project row overflow → Delete (confirm) |
| Project → Import | Code app bar: **Import** |
| Project → Export | Project row overflow → Export; workspace overflow → Export |
| File → New | Workspace: **New file** FAB |
| File → Open | Workspace: tap a file |
| File → Save | Editor app bar: **Save**; Mod-S |
| File → Close | Editor: back arrow |
| File → Delete | File row overflow → Delete; editor overflow → Delete |
| Run | Workspace and editor app bar: **▶ Run**; Apps: tap card |
| Database → New | Data: **New database** FAB |
| Database → Open / Close | Data: tap a database / back arrow |
| Database → Delete | Database row overflow → Delete |
| Table → Open | Tables tab: tap a table |
| Table → Info | Table row overflow → Structure; table overflow → Structure |
| Table → Close | Table: back arrow |
| Table → Delete | Table row overflow → Drop table |
| SQL | Database workspace: **SQL** tab |
| Main Menu (web) | Bottom nav / rail |
| Main, My Apps (Flutter) | Bottom nav / rail |
| Network access, Keep screen on, About, Website (Flutter) | Settings (§7) |

---

## 4. Screens

The wireframes below are proportions, not pixels. `▣` marks a monogram or icon
tile, `⋮` an overflow button, `(+)` a floating action button.

### 4.1 The frame

```
Phone (< 768 px)                        Desktop (≥ 1200 px)
┌──────────────────────────────┐        ┌───────────┬──────────────────────────────────┐
│ ←  Title              ▶  ⋮   │ app bar│ ◆ aCelery │ ←  Title                  ▶  ⋮   │
├──────────────────────────────┤        │           ├──────────────────────────────────┤
│                              │        │ ⌂ Home    │                                  │
│                              │        │ ▦ Apps    │                                  │
│           content            │        │ ‹› Code   │             content              │
│         (scrolls here)       │        │ ⛁ Data    │                                  │
│                              │        │           │                                  │
│                        (+)   │        │           │                                  │
├──────────────────────────────┤        │ ⚙ Settings│                             (+)  │
│  ⌂     ▦     ‹›    ⛁     ⚙   │ nav    └───────────┴──────────────────────────────────┘
└──────────────────────────────┘
```

- The frame is a flex column of `height: 100dvh`. The app bar and nav are
  fixed-size rows and only the content row scrolls. This is what lets the
  editor and `TableMaint` fill the space exactly (§1.5).
- **App bar**, 56 px:
  - A back arrow on any route below a destination's home.
  - The title, truncated with an ellipsis. On workspace routes it has a
    subtitle, for example `Example` over `main.js`.
  - At most two icon actions and one overflow.
- **Bottom nav**, 64 px plus `env(safe-area-inset-bottom)`: five items, icon
  over label. The active item gets a primary-tinted pill behind the icon *and*
  primary-coloured text, so the state is not carried by colour alone (§5.7).
- **FAB**, 56 px, bottom-right, 16 px above the nav. Only destinations with an
  obvious "new" get one.
- On a phone, the bottom nav hides while the editor has focus, because the
  soft keyboard already takes half the screen. It returns on blur.

### 4.2 Home

```
┌──────────────────────────────┐
│ ◆ aCelery                 ⚙  │
├──────────────────────────────┤
│  Continue                    │
│ ┌──────────────────────────┐ │
│ │ ‹› Example               │ │
│ │    example.js · edited   │ │
│ │           [Open] [▶ Run] │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ⛁ inventory.db   [Open]  │ │
│ └──────────────────────────┘ │
│                              │
│  Create                      │
│ ┌────────────┐┌────────────┐ │
│ │ + New app  ││ + New      │ │
│ │            ││   database │ │
│ └────────────┘└────────────┘ │
│                              │
│ ┌──────┐ ┌──────┐            │
│ │  3   │ │  2   │            │
│ │ apps │ │ dbs  │            │
│ └──────┘ └──────┘            │
├──────────────────────────────┤
│  ⌂     ▦     ‹›    ⛁     ⚙   │
└──────────────────────────────┘
```

- **Continue** shows the last project and file opened in Code and the last
  database opened in Data. They are stored as `recent.project`, `recent.file`
  and `recent.db` in the existing `config` table, through the existing
  `loadConfig`/`saveConfig` (`index.js:42-62`). No new storage is needed. A
  recent item whose target no longer exists is dropped silently when Home
  loads.
- **Create** links to Code and Data with their New dialogs already open.
- **Counts** are tappable shortcuts to Apps and Data. They come from the same
  listings those screens use.
- **First run**, with nothing recent, replaces Continue with a welcome card:
  one sentence about what aCelery is, **Open the Example app**, and **Create
  your first app**. The Example app ships in the bundle, so the first card
  always has something real behind it.

### 4.3 Apps

```
Phone                                   Desktop
┌──────────────────────────────┐        ┌──────────────────────────────────────────┐
│ Apps                     🔍  │        │ Apps                     [🔍 Search    ] │
├──────────────────────────────┤        ├──────────────────────────────────────────┤
│ ┌────────────┐┌────────────┐ │        │ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│ │ ▣          ││ ▣          │ │        │ │ ▣      │ │ ▣      │ │ ▣      │ │ ▣    ││
│ │ Example  ⋮ ││ Budget   ⋮ │ │        │ │Example⋮│ │Budget ⋮│ │Notes  ⋮│ │ ...  ││
│ │ This app   ││ Monthly    │ │        │ │This app│ │Monthly │ │        │ │      ││
│ │ uses many… ││ spending   │ │        │ └────────┘ └────────┘ └────────┘ └──────┘│
│ └────────────┘└────────────┘ │        └──────────────────────────────────────────┘
```

- A card grid: `repeat(auto-fill, minmax(10rem, 1fr))`, which gives two columns
  on a phone.
- Each card shows a 48 px tile, the name, and the description clamped to two
  lines. The manifest carries `description` (`bundle/www/user/Example/
  acelery_app.json`).
- **Tile.** If the manifest names an `icon` (a new, optional field, §12.6), the
  tile shows that image. Otherwise it shows a monogram: the first letter on a
  hue chosen by a stable hash of the name, from a fixed set of eight measured
  against white text at R1.
- **Tap runs** the app (`runApp(name, name, false)`, as today).
- **⋮ opens:**
  - Edit in Code, which goes to `#/code/:project`;
  - Export (`exportProject`);
  - Delete, behind a danger confirm.
- A search field appears once there are more than six apps. It filters by name
  and description on the client.
- **Empty state:** "No apps yet", with **Create an app**, which opens Code's New
  project dialog.

`AppsScreen` (`index.js:106-137`) and `listProjects` (`ide_screen.js:24-41`)
are the same manifest-reading loop written twice today. Apps and Code share one
`listProjects` after this change (§6.1).

### 4.4 Code

**Projects** (`#/code`) use the same card grid as Apps, with the same data but a
different primary action:

- **Tap opens** the workspace.
- **⋮ offers** Run, Export and Delete.
- The app bar has **Import** (`importProject`). The FAB is **New project**,
  which opens the existing `NewProjectDialog` with its validation unchanged
  (`ide_screen.js:44-72`).
- Creating a project goes straight into its workspace, with `main.js` already
  scaffolded (`ide_screen.js:106-114`, `:232`) and shown first.

**Workspace** (`#/code/:project`):

```
Phone                                   Desktop (≥ 992 px): split view
┌──────────────────────────────┐        ┌────────────────┬─────────────────────────────┐
│ ←  Example            ▶  ⋮   │        │ ←  Example     │ example.js ●     [Save] ▶ ⋮ │
├──────────────────────────────┤        ├────────────────┼─────────────────────────────┤
│  Files                       │        │ FILES       +  │  1  import { html, render   │
│ ┌──────────────────────────┐ │        │ ‹› example.js ●│  2    Panel, Input, …       │
│ │ ‹› example.js         ⋮  │ │        │ #  example.css │  3                          │
│ │    JavaScript · entry    │ │        │ ◧  acelery_app │  4  export default function │
│ ├──────────────────────────┤ │        │    .json       │  5    render(html`          │
│ │ #  example.css        ⋮  │ │        │ ▣  Redtwitter_ │  …                          │
│ ├──────────────────────────┤ │        │    icon.png    │                             │
│ │ ◧  acelery_app.json   ⋮  │ │        │                ├─────────────────────────────┤
│ └──────────────────────────┘ │        │                │ JavaScript · Saved          │
│                        (+)   │        └────────────────┴─────────────────────────────┘
├──────────────────────────────┤
│  ⌂     ▦     ‹›    ⛁     ⚙   │
└──────────────────────────────┘
```

- **File rows** show a type icon and name. The secondary line gives the language
  from the extension and marks the manifest's `entry` file (default `main.js`,
  as `launcher.html` resolves it).
- **Row ⋮** offers Delete.
- **App bar ▶ Run** runs the project in debug mode, as today
  (`runApp(project, project, true)`).
- **Workspace ⋮** offers Export and Delete project.
- **FAB New file** opens the existing `NewFileDialog`.
- **Split view at 992 px and up.** The file list becomes a 240 px sidebar and
  the editor fills the rest, so the file route and the workspace route render
  the same layout with different selections.
- **Binary files.** Non-text files, such as the Example app's PNG, are listed
  but open in a preview rather than the editor, which would otherwise read the
  image as text.

**Editor** (`#/code/:project/:file`, phone):

```
┌──────────────────────────────┐
│ ←  example.js ●     💾  ▶  ⋮ │
│    Example                   │
├──────────────────────────────┤
│  1  import {                 │
│  2    html, render, Panel,   │
│  3  } from "acelery/ui.js";  │
│  …                           │
│                              │
├──────────────────────────────┤
│ JavaScript        Unsaved    │ status strip, 28 px
└──────────────────────────────┘   (bottom nav hidden while editing)
```

- The app bar shows:
  - the filename;
  - a **dirty dot** while the buffer differs from disk;
  - **Save**, disabled when clean rather than hidden, so the bar does not
    reflow as you type;
  - **Run**;
  - **⋮**, offering Delete file.
- **Mod-S saves.** `createEditor` builds its keymap internally
  (`web/src/editor/index.js:158-168`), so this is a new, optional `onSave`
  option there: an additive change to `acelery/editor.js`.
- **Run with unsaved changes** saves first, then runs. Today Run posts to the
  host, which calls `forceSaveFile()` before pushing the route
  (`ide_screen.dart:93`), so the behaviour is the same. The difference is that
  the save becomes visible.
- **Status strip** shows the language and Saved / Unsaved / Saving…. Save
  failures stay as an inline error above the editor, not a toast (§4.7).
- **Sizing.** The editor host is the content row's only child with
  `flex: 1; min-height: 0`. The `calc(100vh - 8rem)` rule in
  `bundle/www/system/style/acelery.css` goes.

Open-file **tabs** on desktop are deliberately left out of the first pass
(§8 R4, §12.7). Today's screen holds exactly one buffer. Tabs mean a buffer per
file, per-file dirty state, and `forceSaveFile` flushing all of them. That is a
real change to the save contract and should not ride along with a visual
redesign.

### 4.5 Data

**Databases** (`#/data`):

- A list rather than a grid, since databases have no description or icon.
  Each row shows a drive icon, the name and ⋮ (Delete).
- **Tap opens** the database. The **FAB New database** opens the existing
  `NewDbDialog`.
- `-journal` files stay filtered (`db_screen.js:60-61`).
- `file.listFiles` already returns `length` and `lastmodified` alongside
  `fname` and `directory` (`web/src/acelery/file.js:72`), so rows show size and
  date with no bridge work.

**Database workspace** (`#/data/:db`):

```
┌──────────────────────────────┐
│ ←  inventory.db           ⋮  │
├──────────────────────────────┤
│ [  Tables  |   SQL   ]       │ segmented control
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ☰ items               ⋮  │ │
│ │   6 columns · 142 rows   │ │
│ ├──────────────────────────┤ │
│ │ ☰ suppliers           ⋮  │ │
│ │   4 columns · 12 rows    │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  ⌂     ▦     ‹›    ⛁     ⚙   │
└──────────────────────────────┘
```

- The **table list** comes from the existing `sqlite_master` query
  (`db_screen.js:110`).
- The secondary line is loaded lazily per row: the column count from
  `PRAGMA table_info` and the row count from `select count(*)`, with names
  passed through `identifier()`. A phone database is small, but the list renders
  names first and fills counts in, so a slow count never delays the list.
- **Row ⋮** offers Structure and Drop table (danger confirm).
- **Workspace ⋮** offers Close and Delete database.
- **Empty state:** "No tables yet". Its button opens the SQL tab with a
  `create table` template in the query box. Nothing else in the shell creates
  tables, so this is the only way to make one.

**Table** (`#/data/:db/table/:table`):

- `TableMaint` fills the content row, exactly as today (`db_screen.js:236`).
- The mandatory column-chooser *step* (`ColumnChooser`, `db_screen.js:306`)
  becomes a **Columns** chip in the app bar. It opens a popover with the same
  checkboxes. Every column is listed by default, which is what the chooser
  defaults to anyway, so one tap now opens a table instead of two screens.
- `TableMaint` is keyed by the visible column set, so changing it remounts the
  component cleanly rather than depending on it handling a `fields` change in
  place.
- **App bar ⋮** offers Structure and Drop table.

**SQL** (`#/data/:db/sql`):

```
┌──────────────────────────────┐
│ ←  inventory.db           ⋮  │
│ [  Tables  |   SQL   ]       │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ select * from items      │ │ monospace
│ │ where qty < 5            │ │
│ └──────────────────────────┘ │
│ [▶ Run]  [Clear]   History ▾ │
├──────────────────────────────┤
│ 3 rows · 4 ms                │
│ ┌────┬──────────┬─────┐      │ sticky header,
│ │ id │ name     │ qty │      │ scrolls both ways
│ ├────┼──────────┼─────┤      │
│ │ 4  │ Bolts    │ 2   │      │
└──────────────────────────────┘
```

- The statement-kind detection and the three result kinds are unchanged
  (`db_screen.js:331-346`). The scratchpad stays deliberately unparameterised,
  for the reason given there.
- **Additions:**
  - elapsed time from `performance.now()`;
  - a row count;
  - a sticky header, with the grid scrolling in both directions inside its own
    box;
  - numbers right-aligned;
  - `NULL` shown as a muted `NULL` rather than an empty cell;
  - only the first 200 rows rendered, then **Show all N**.
- **History** holds the last ten statements for the session, in the database
  workspace's state, so switching between Tables and SQL keeps it.
- **Editor.** The query box is a monospace `<textarea>` in the first pass.
  `createEditor` would open a `.sql` name with HTML highlighting, because
  `languageFor` falls back to HTML (`web/src/editor/index.js:69`), which is
  worse than none. `@codemirror/lang-sql` is not installed, and its cost is
  unmeasured (§12.5).

### 4.6 Settings

```
┌──────────────────────────────┐
│ Settings                     │
├──────────────────────────────┤
│ APPEARANCE                   │
│ ┌──────────────────────────┐ │
│ │ Mode     System ▸        │ │  System / Light / Dark
│ │ Theme    aCelery ▸       │ │  the 18 themes, with swatches
│ │ Editor   Follow app ▸    │ │  EDITOR_THEMES, with swatches
│ └──────────────────────────┘ │
│ DEVICE            (host only)│
│ ┌──────────────────────────┐ │
│ │ Network access         ▸ │ │
│ │ Keep screen on      [ ◯] │ │
│ └──────────────────────────┘ │
│ ABOUT                        │
│ ┌──────────────────────────┐ │
│ │ aCelery · GPLv3          │ │
│ │ Website                ↗ │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- **Changes apply and persist immediately.** The Save/Exit pair from
  `ConfigScreen` (`index.js:199-202`) goes. The one exception that needed a
  Save button was theme preview, and applying on change already *is* the
  preview.
- **Mode** is new (§5.2). **Theme** and **Editor** open a sheet listing the
  options with a small swatch each, drawn from the theme's primary, body and
  surface colours for app themes and from the palette in
  `web/src/editor/themes.js` for editor schemes.
- **Device** rows need the host (§7) and are hidden when `ACeleryHost` is
  absent, as in a desktop browser. Hiding them is honest: there, the device is
  not the machine you are holding.
- **Website** is a plain external link. The host already diverts any
  non-local navigation to `OpenExternalMessage`
  (`lib/src/shell/host_bridge.dart:167`), and a desktop browser simply opens
  it.

### 4.7 Dialogs, confirmations, notices, loading, errors

- **Forms** (New project, New file, New database) stay centred `Modal`s on
  desktop. Below 768 px they become full-width bottom sheets: `Offcanvas
  placement="bottom"`, which is already exported from `acelery/ui.js:66`. The
  `Form`/`Input` validation inside does not change.
- **Row actions** use a bottom `Offcanvas` action sheet on phones and a
  `Dropdown` anchored to the ⋮ on desktop. One `ActionSheet` component picks
  between them by width.
- **Confirmations** stay `useConfirm`. The dialog title names the object
  ("Delete example.js?"), the body says what cannot be undone, and the
  confirm button repeats the verb ("Delete") rather than saying "OK".
- **Success and info notices** become **toasts**: bottom-centre above the nav,
  dismissed after 4 s, and polite to screen readers (`role="status"`).
- **Errors are not toasts.** A failure stays inline, next to what failed, until
  it is dismissed or the action is retried. An error that disappears after four
  seconds on a phone is an error nobody read.
- **Loading.** Lists show skeleton rows (react-bootstrap `Placeholder`) at their
  final size, so nothing jumps when data arrives. The frame and nav render
  immediately. Only the content row waits for the config load that gates
  `Shell` today (`index.js:237`).

---

## 5. Visual language

### 5.1 Palette

A small set of `--ac-*` tokens, defined for the aCelery theme in light and dark.
Contrast is WCAG 2.x relative-luminance contrast, computed for this document.
Only the pairs listed were measured; any other pairing needs its own check
before it carries text.

**Light**

| Token | Value | Use | Measured |
|---|---|---|---|
| `--ac-bg` | `#f5f7f6` | page | — |
| `--ac-surface` | `#ffffff` | cards, bars, sheets | — |
| `--ac-surface-2` | `#eef2f1` | fills, pressed rows, skeletons | — |
| `--ac-border` | `#dde4e3` | hairlines | — |
| `--ac-text` | `#1b2426` | body | 14.71:1 on `--ac-bg` |
| `--ac-muted` | `#5a676a` | secondary text | 5.45:1 on `--ac-bg`, 5.86:1 on `--ac-surface` |
| `--ac-primary` | `#3d6b63` | buttons, active nav, links | 6.03:1 with white text |
| `--ac-primary-tint` | `#e3eeeb` | active nav pill, selected row | primary text on it 5.08:1 |
| `--ac-celery` | `#6aa84f` | logo mark, decorative accents only | 2.87:1 on white — **never text, never a sole state cue** |
| `--ac-success` | `#3f7d2c` | success | 5.02:1 with white text |
| `--ac-danger` | `#b3261e` | destructive | 6.54:1 with white text |

**Dark**

| Token | Value | Use | Measured |
|---|---|---|---|
| `--ac-bg` | `#111718` | page | — |
| `--ac-surface` | `#1a2224` | cards, bars, sheets | — |
| `--ac-text` | `#e6ecea` | body | 15.14:1 on `--ac-bg` |
| `--ac-muted` | `#9aa8a6` | secondary text | 6.57:1 on `--ac-surface` |
| `--ac-primary` | `#7fc1b3` | buttons, active nav | 8.78:1 on `--ac-bg`; `#0d1f1b` text on it 8.28:1 |
| `--ac-celery` | `#9ad17f` | decorative accents | 9.09:1 on `--ac-surface` |
| `--ac-danger` | `#f2b8b5` | destructive | 9.47:1 on `--ac-surface` |

The palette keeps aCelery's slate-teal identity and deepens it. The current
primary, `#586d72`, measures 5.46:1 on white and would pass as it is. The
proposal moves to a greener `#3d6b63` (6.03:1) and adds a celery accent, the
one colour the name suggests and the product has never used. That change is a
taste decision, not a fix, and is listed as §12.2. The **brand colour** is the
one genuine fix: `#86a0a4` fails as text (§1.5), and the app bar title uses
`--ac-text` instead.

Dark values in buttons need `--bs-btn-color` set to the dark on-primary colour.
Bootstrap's `.btn-primary` hard-codes white text, the same property that forced
theme deltas instead of variables (`web/src/ui/theme.js:10-13`).

### 5.2 How the tokens meet the 18 themes

§9.6 of the evaluation settled that all 18 themes survive, and they should
still reach the shell. So the tokens are not a parallel colour system. By
default they are **defined in terms of Bootstrap's own properties**:

```css
:root {
  --ac-bg: var(--bs-body-bg);
  --ac-surface: var(--bs-tertiary-bg);
  --ac-text: var(--bs-body-color);
  --ac-muted: var(--bs-secondary-color);
  --ac-border: var(--bs-border-color);
  --ac-primary: var(--bs-primary);
  /* … */
}
```

Only the aCelery theme overrides them with the values in §5.1, scoped with
`:where(:root[data-acelery-theme="acelery"])` so it adds no specificity. This is
the lesson from §8 of the evaluation, where a `(0,2,1)` theme selector silently
beat `.dropdown-menu.show`.

That palette is generated, not hand-edited: `bundle/www/tools/css/themes/
acelery.css` says "do not edit", and its source is `tool/build_themes.mjs`. The
change goes there.

Under Darkly or Flatly the frame therefore takes that theme's colours. Their
contrast is Bootswatch's and was not measured here.

**Mode.** Today only four themes are dark, and which ones is fixed by a set in
`theme.js:31`. The aCelery theme gains light *and* dark, selected by a new
**Mode** setting: System, Light or Dark.

- The setting is stored as `theme.mode` in `config`.
- System follows `prefers-color-scheme` and listens for changes.
- For the 17 Bootswatch themes, Mode is shown as fixed by the theme, because a
  Bootswatch build is one or the other.
- `applyTheme(name)` stays as it is. The mode is a second, optional argument, so
  existing callers, including user apps, are unaffected.

### 5.3 Type, spacing, shape

- **Type.** The system stack only (`system-ui, -apple-system, "Segoe UI",
  Roboto, sans-serif`); webfonts would fetch from the network and fail offline.
  Code uses `ui-monospace`, already set in `web/src/editor/index.js:124`. The
  scale:
  - 12 px for captions and the status strip;
  - 14 px for secondary text;
  - 16 px for body and rows;
  - 20 px for app bar titles;
  - 28 px for Home headings.

  Weights are 400 and 600. The `h3`-as-menu-row style goes.
- **Spacing.** A 4 px base. Rows have 12 px vertical and 16 px horizontal
  padding. The gutter between cards is 12 px on phones and 16 px on desktop.
- **Radius.** 12 px for cards, rows and inputs, 16 px for sheets and dialogs,
  and fully round for pills, chips and the FAB. Set through `--bs-border-radius`
  and friends, so react-bootstrap components pick them up.
- **Elevation.** Two levels. Cards are flat with a hairline border. Sheets, the
  FAB and popovers get one soft shadow. The app bar has no shadow at rest and a
  hairline once content scrolls beneath it.

### 5.4 Components

What the shell needs that it does not have, and what each is built from:

| Component | Built from |
|---|---|
| `AppFrame` | flex column, `100dvh`; switches bottom nav ↔ rail by media query |
| `AppBar` | plain markup (not `Navbar`: there is nothing to collapse) |
| `BottomNav`, `NavRail` | `Nav` with `role="navigation"`, `aria-current="page"` |
| `Fab` | `Button` + positioning |
| `CardGrid`, `ListRow` | CSS grid; `ListGroup.Item action` |
| `EmptyState` | icon, one sentence, one `Button` |
| `ActionSheet` | `Offcanvas placement="bottom"` below 768 px, `Dropdown` above |
| `Segmented` | `ButtonGroup` of toggle buttons with `role="tablist"` |
| `ToastHost` / `useToast` | react-bootstrap `Toast` + `ToastContainer` (new exports, §6.4) |
| `Skeleton` | react-bootstrap `Placeholder` (new export, §6.4) |

The shell no longer uses `IdeNavbar`, and nothing else in the product does. The
collapsed-navbar overlay CSS in `bundle/www/tools/css/acelery.css` stays,
because `launcher.html` and the Example app's own navbar depend on it.

### 5.5 Icons

The shell draws nine glyphs today. The frame and screens need about fifteen
more:

- navigation and actions: house, code, database, play, plus,
  ellipsis-vertical, arrow-left, magnifying-glass, floppy-disk, trash;
- files: file-code, file-import, file-export;
- data and appearance: table, circle-half-stroke.

`tool/build_icons.mjs` derives the subset from the source, so using them *is*
adding them. The existing test that cross-references every `fa-` name against
the generated stylesheet (`test/bundle_migration_test.dart:924`) keeps a missing
glyph from shipping as a blank square. The nine current glyphs are a 1,348 B
woff2, so the addition should be a few KB, well inside that test group's
16 KB font cap (`:920`). The build reports the exact figure at R1.

### 5.6 Motion

- Route changes cross-fade the content row over 150 ms. There are no sliding
  page transitions: a WebView on a mid-range phone drops frames on them.
- Sheets use Offcanvas's own transition. Pressed rows and buttons get a 100 ms
  background change.
- All of it is disabled under `prefers-reduced-motion: reduce`.

### 5.7 Accessibility

- **Touch targets.** At least 44 × 44 px, including ⋮ buttons, which are
  visually 24 px with padding.
- **State.** Never carried by colour alone. The active nav item has a pill and
  a colour change, and the dirty file has a dot *and* the "Unsaved" label.
  `--ac-celery` fails 3:1 against white (§5.1), so it is never used for state
  in light mode.
- **Focus.** A visible 2 px `--ac-primary` outline with offset, for the desktop
  browser case.
- **Headings.** Each screen has one `h1` (the app bar title, styled at 20 px),
  and list sections are `h2`.
- **Announcements.** Toasts are `role="status"`. Inline errors are
  `role="alert"`.

---

## 6. Architecture

### 6.1 Modules

```
web/src/ide/
  index.js            start(), Shell: config, theme, frame, route switch
  router.js           useRoute(), go(), parse()
  frame.js            AppFrame, AppBar, BottomNav, NavRail, Fab
  parts.js            EmptyState, ActionSheet, Segmented, CardGrid, ListRow,
                      Skeleton, ToastHost/useToast
  store.js            listProjects, listDatabases, recents (loadConfig/saveConfig
                      move here from index.js)
  chrome.js           useConfirm (kept); Picker and IdeNavbar deleted;
                      useNotice replaced by useToast + inline errors
  home_screen.js
  apps_screen.js
  settings_screen.js
  code/
    projects.js       projects grid, NewProjectDialog, import
    workspace.js      file list / split view, NewFileDialog
    editor_pane.js    CodeMirror host, save, forceSaveFile, leave guard
  data/
    databases.js      database list, NewDbDialog
    workspace.js      Tables | SQL tabs, table list
    table.js          TableMaint host, column popover, TableInfo
    sql.js            scratchpad, results grid, history
```

`ide_screen.js` and `db_screen.js` are split along the lines above rather than
rewritten. Their action functions (`createProject`, `createFile`, `openFile`,
`leaveFile`, `open`, `closeDb`, `removeDb`, `removeTable`, …) move nearly
verbatim. What changes is what calls them.

### 6.2 Router

Small enough to own, with no dependency:

```js
export function parse(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean)
    .map(decodeURIComponent);
  return { section: parts[0] ?? "home", parts: parts.slice(1) };
}

export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return parse(hash);
}

/** Down a level pushes history; across (nav, tabs) replaces it (§3.3). */
export function go(path, { replace = false } = {}) {
  const target = "#/" + path.map(encodeURIComponent).join("/");
  if (replace) location.replace(target);
  else location.hash = target;
}
```

An unknown section or a missing object shows a "not found" empty state with a
button to the destination's home, rather than throwing. The object might be a
project deleted in another tab, or a stale Continue card. The in-page back
arrow calls `history.back()` when history exists and `go(parent)` otherwise,
for a deep link opened fresh.

### 6.3 State

| State | Lives in | Survives reload |
|---|---|---|
| Destination, project, file, db, table, tab | URL | yes |
| Editor buffer, dirty flag | `editor_pane.js` (buffer in CodeMirror, as today) | no; `forceSaveFile` covers host pause/back |
| Open database handle | `data/workspace.js`, closed on unmount (as `db_screen.js:48`) | reopened from the route |
| SQL history | `data/workspace.js` | no (session) |
| Theme, mode, editor theme, recents | `config` table via `store.js` | yes |
| Keep screen on | host (§7) | per host session |

One subtle point. Today the DB handle closes when `DbScreen` unmounts. With
routes, moving from `#/data/x/table/t` to `#/data/x/sql` must *not* close and
reopen the database, so the handle belongs to the workspace component, which
stays mounted across its child routes. Leaving `#/data/x` closes it.

### 6.4 Additions to `acelery/ui.js`

All additive, so no user app changes:

- `Toast`, `ToastContainer` and `Placeholder` re-exported from react-bootstrap.
  All three are in the installed version.
- `applyTheme(name, { mode })` and `currentMode()` in `web/src/ui/theme.js`
  (§5.2).
- `createEditor(parent, { onSave })` in `acelery/editor.js` (§4.4).

`AppFrame` and the other shell parts stay in `web/src/ide/`, not `acelery/
ui.js`. Whether apps should get them is a separate question about the app API,
which `acelery-never-launched-no-backcompat` leaves open. It is not answered as
a side effect of the shell.

### 6.5 CSS

- **Shell layout and components:** `bundle/www/system/style/acelery.css`, which
  only the shell loads.
- **`--ac-*` defaults in terms of `--bs-*`:** also there.
- **aCelery theme values, light and dark:** `tool/build_themes.mjs`, which
  generates `themes/acelery.css`.
- **`bundle/www/tools/css/acelery.css`:** unchanged. It is loaded by every page
  including `launcher.html` and still owns the collapsed-navbar overlay.
- **`system/index.html`:** gains `viewport-fit=cover` on the viewport meta, so
  safe-area insets resolve on notched devices, and a `theme-color` meta. It
  gains no classic scripts: a test forbids them.

### 6.6 Weight

`acelery/ide.js` is **22,008 B raw / 7,142 B gzipped** today. The target for the
redesigned shell is **under 18 KB gzipped**: more screens and a frame, but no
new dependency. The only possible byte-heavy addition, SQL highlighting, is
excluded until measured (§12.5). The budget becomes a test that gzips the
built `ide.js`, next to the existing size check on `chart.js`
(`test/bundle_migration_test.dart:975`). `.build-info.json` records packages
and the preact core count, not sizes.

---

## 7. The Flutter side

**Remove the IDE route's `AppBar`** (`ide_screen.dart:206-228`) and wrap the
WebView in a `SafeArea` (top only; the web frame handles the bottom inset
itself). The pairing prompt, which interrupts from any screen, stays native and
unchanged (`ide_screen.dart:52-64`).

The host channel today is **one-way**. JS posts `{action: …}` over
`ACeleryHost` (`lib/src/shell/host_bridge.dart:72-131`) and receives no reply.
The Settings rows therefore need:

| Setting row | Host message | Notes |
|---|---|---|
| Network access | `showNetworkAccess` (new) | opens the existing `NetworkAccessSheet` (`ide_screen.dart:148`) |
| Keep screen on | `setKeepAwake {on}` (new) | calls `WakelockPlus.toggle`. The web keeps the switch state; it is not persisted across launches, matching today (`_noSleep` resets). |
| About | none | rendered by the web page. The server address it showed (`runtime.server.baseUri`) is `location.origin` from the page's side. |
| Website | none needed | a plain link; non-local navigation already diverts to `OpenExternalMessage` (`host_bridge.dart:167`, handled at `ide_screen.dart:83`) |

Main and My Apps go with the AppBar; the nav replaces them. `_MenuAction` and
`_onMenu` shrink to the two new messages. `myAppsUrl` stays valid through the
`?opt=apps` redirect (§3.2).

The status bar should match the frame in dark mode. Flutter owns it, so the web
page cannot set it through `theme-color`. A `setChrome {dark}` message, sent
when the mode resolves, is the clean route. It is listed in R4 rather than R1,
because a light status bar over a dark frame is cosmetic.

`user_app_screen.dart` keeps its AppBar: a running user app needs a way out
that the app cannot remove.

---

## 8. Phasing

Ordered, as Phase 4 was, so the system runs end to end after every step.

**R0 — the blank-screen fix, standalone.** Can ship before any of the rest.

- `IdeScreen` initialises to the project list and `DbScreen` to the database
  list: call `pick("project-open")` / `listDbs("open")` once the base path
  resolves, instead of leaving `view` blank. Replace the `blank` branches with
  those lists.
- Returning from Close lands on the list, not on nothing.
- The picker's `success` alert becomes a plain heading.
- *Done when* both screens show their list, or an empty state with a New
  button, on first mount at 400 px wide.

**R1 — the frame.**

- Tokens and the refreshed aCelery theme (light and dark) in
  `build_themes.mjs`, and Mode in `theme.js`.
- `router.js`, `frame.js` and `parts.js`, including the `ui.js` export additions.
- Home, Apps and Settings (without the Device rows).
- Code and Data mounted inside the frame at their routes, still the R0 screens
  inside: behaviour unchanged, chrome replaced, `IdeNavbar` gone from the shell.
- *Done when* every destination is reachable from the nav at 400, 768 and
  1280 px, Back steps out of every level, and reload after Run returns to the
  same route.

**R2 — Code.**

- Projects grid, workspace, editor pane, split view.
- The status strip, the dirty dot, and `onSave`/Mod-S.
- The binary-file preview.
- Recents written on open.
- *Done when* the new-project → edit → Run → back path works with no menu, and
  a dirty buffer survives host Back (`forceSaveFile`) and prompts on in-page
  navigation.

**R3 — Data.**

- Databases list, workspace with tabs, table list with lazy counts.
- The Columns popover and Structure.
- The SQL results grid and history.
- The handle kept open across child routes.
- *Done when* new database → create table from the template → open it → add a
  row works with no menu, and switching Tables ↔ SQL does not reopen the file.

**R4 — host and polish.**

- AppBar removal and the `showNetworkAccess` / `setKeepAwake` / `setChrome`
  messages.
- Settings Device rows.
- Search in Apps and Code.
- Skeletons everywhere, and the reduced-motion audit.
- The iOS safe-area check. It is unverifiable here for the same reason §9.9 of
  the evaluation is.
- Desktop editor tabs, if §12.7 says yes.

---

## 9. Tests affected

- **`test/bundle_migration_test.dart:1016`** ("both navbars can be dismissed")
  asserts `useDismiss` appears in `web/src/ide/chrome.js`. After R1 the shell
  has no collapsing navbar. Its sheets and dropdowns dismiss through
  react-bootstrap. The list becomes the Example app alone, and the `dismiss.js`
  assertions stay.
- **The collapsed-navbar overlay group** (`bundle_migration_test.dart:980-1014`)
  stays: `launcher.html` and the Example app still rely on it.
- **`bundle_migration_test.dart:746`** (the shell page loads `acelery/ide.js`)
  and **`test/end_to_end_test.dart:100-119`** (ide.js resolves through the
  import map) are unaffected: the entry point and its name do not change.
- **"The IDE page carries no classic scripts at all"**
  (`test/end_to_end_test.dart:57`) is unaffected, and §6.5 keeps it that way.
- **The icon cross-reference test** gains coverage automatically.
- **The build-info hash test** fails until `tool/build_js.sh` is rerun, as
  designed.

New node tests in `web/test/`, run against the built bundle in the same jsdom
harness as `ui.test.js` and `example_app.test.js`:

1. **The regression.** `#/code` and `#/data` mount with either a list or an
   empty state containing an enabled button. The content row is never empty.
2. `parse` round-trips names that need encoding. `go` pushes, `go(…, {replace})`
   does not, and an unknown route renders not-found.
3. Leaving a dirty editor through a hash change prompts through `useConfirm`.
4. Opening a project and a database writes `recent.*`, and a recent pointing at
   a deleted project is dropped.
5. The nav renders five destinations with exactly one `aria-current="page"`.
6. Settings hides Device rows without `ACeleryHost` and shows them with a stub.
7. Moving between database child routes does not call `close()` on the handle.
8. The theme test: the aCelery delta still uses `:where`, and its dark values
   set `--bs-btn-color`.
9. `ide.js` stays under the §6.6 gzip budget. This one is Dart, alongside the
   `chart.js` size check.

On the Dart side, `test/host_bridge_test.dart` gains parsing cases for the two
new message types at R4.

---

## 10. Verification

For each phase:

```sh
cd web && npm test                 # node suite against the built bundle
flutter test                       # Dart suite
tool/build_js.sh                   # rebuild ide.js, icons, themes
dart run tool/serve.dart           # real server on a temp copy of the bundle
```

- **Desktop browser.** Open `http://localhost:8123/` and check each destination
  at 400, 768 and 1280 px, in light, dark and one Bootswatch theme (Darkly).
  Walk the R-phase *done when* path each time.
- **Device.** Follow `acelery-rebuild-and-verify-on-device`. The bundle reaches
  the device only through `tool/build_bundle.sh` and a bumped
  `ACeleryRuntime.bundleVersion`. Then:

```sh
flutter build apk --debug && adb install -r build/app/outputs/flutter-apk/app-debug.apk
adb shell am start -n com.acelery.acelery/.MainActivity
adb exec-out screencap -p > home.png
```

Screencap every destination, then walk Back from the editor to Home with
`adb shell input keyevent KEYCODE_BACK`, capturing each step. JavaScript errors
surface in logcat as `I flutter : aCelery [error] …`.

- **Contrast.** Any token pair not in §5.1 is measured before it carries text.

---

## 11. What this deliberately does not do

- **No new framework, CSS framework or webfont.** The evaluation's §8 list of
  declined options stands: Tailwind, Web Awesome and the rest.
- **No change to user apps.** `launcher.html`, the Example app and the
  collapsed-navbar CSS are untouched, and every `ui.js` change is additive.
- **No new file or database operations.** Rename and move need bridge routes
  and are not proposed. The design uses only what
  `acelery/file.js` and `acelery/sql.js` already expose.
- **No autosave.** Saving stays explicit, plus `forceSaveFile` on pause and
  Back, as today. Autosave changes what Run executes and deserves its own
  decision.
- **No multi-buffer editor in the first pass** (§4.4).
- **No background-serving or iOS decisions.** Those remain where the
  modernisation assessment left them.

---

## 12. Decisions

Open, each with a recommendation.

1. **Should the shell follow all 18 themes, or only aCelery light/dark?**
   *Recommended: follow all 18*, through tokens defined as `--bs-*` (§5.2). It
   costs nothing extra and keeps §9.6's decision meaningful for the product's
   own UI. The alternative would make the theme setting visibly affect only
   user apps.
2. **Should the aCelery palette move to `#3d6b63` plus a celery accent?**
   *Recommended: yes.* The current primary passes, so this is taste. The
   brand-colour fix (§1.5) happens either way.
3. **Should the Flutter AppBar go on the IDE route?** *Recommended: yes*, with
   the two new host messages (§7). Keeping it means the frame's app bar sits
   under a second one, and §1.3 remains.
4. **Home, or open straight on Apps?** *Recommended: Home.* Continue is the path
   someone building an app takes every session. Someone who only *runs* apps is
   one tap away, and could get a setting later if that turns out to be most
   people.
5. **SQL syntax highlighting.** *Recommended: textarea in R3, then measure
   `@codemirror/lang-sql`* against §6.6's budget before deciding. The IDE opens
   no `.sql` files, so the editor bundle would carry it for the scratchpad
   alone.
6. **An optional `icon` field in `acelery_app.json`.** *Recommended: yes*,
   defaulting to the monogram. The Example app already ships a 48 px PNG that
   nothing references.
7. **Desktop editor tabs.** *Recommended: decide after R2 has been used.* The
   split view may make them unnecessary, and they change the save contract
   (§4.4).

**Taken 2026-09-15:** every recommendation above. 1 follow all 18, 2 the new
palette, 3 AppBar removed, 4 Home, 5 textarea, 6 optional `icon`, 7 deferred.

---

## 13. Implementation notes (2026-09-15)

R0–R4 were built in one pass on branch `shell-redesign`, except the items
listed as not done below. Where the build departed from the text above, the
text above is the plan and this section is what shipped.

**Departures.**

- **SafeArea on both edges, not top only** (§7). A WebView is not guaranteed
  to report `env(safe-area-inset-bottom)`, and a bottom nav under the gesture
  bar is unusable. The page's own inset padding resolves to zero inside it.
- **Modules stay flat in `web/src/ide/`** (§6.1: `code_screen.js`,
  `code_workspace.js`, `data_screen.js`, `data_workspace.js`, …).
  `tool/build_js.sh` and the source-stamp test hash `web/src/ide/*.js`
  non-recursively, so a subfolder would have escaped the staleness check.
- **Theme and editor-scheme swatches were not built** (§4.6). An app theme's
  colours are only known once its stylesheet has loaded, so a swatch per option
  would load all 18; both settings are plain selects.
- **The unsaved-changes prompt distinguishes dismiss from Discard** (§3.3).
  `useConfirm` gained a `dismissValue`; tapping the backdrop now stays on the
  file instead of throwing the edits away, as the Phase 4 IDE did.
- **SQL results treat `pragma`, `with` and `explain` as row-returning**, not only
  `select`.

**Defects the work surfaced, outside the shell.**

- **sqflite shared one connection per path** (`lib/src/bridge/sql_bridge.dart`).
  Closing any handle closed every other handle on the same file. The shell
  writing a setting closed `acelery.db` under the Data screen browsing it, and
  every later query failed silently. The host now opens with
  `singleInstance: false`, which matches Android's `SQLiteDatabase`. Pinned by
  `test/bridge_test.dart` ("two handles on one file are independent"). The node
  suite could not catch it, because its fake host never shared handles.
- **No Bootswatch theme carried its `:root` variables**
  (`tool/build_themes.mjs`). The rule splitter glued Bootswatch's leading
  `@import url(…);` onto the `:root` block, and the webfont filter dropped both.
  The first fix, splitting at a top-level `;`, cut the unquoted font URL at its
  own `wght@400;700`. The browser then read the brace-less `700&display=swap);`
  left in the delta as the start of the next selector, and silently discarded
  the `:root` block. Splitting now ignores `;` inside parentheses, and
  brace-less statements never reach a delta. All 18 files were checked for their
  own `--bs-primary` and for no `url(` or `@import`.
  Components were unaffected, since they use literal colours, but anything
  reading `--bs-primary` stayed stock blue. That includes the shell's whole
  token layer (§5.2).

**Found on a physical phone.**

- **The editor could not scroll.** §4.4 sized CodeMirror by positioning
  `.cm-editor` absolutely. CodeMirror's base theme sets `position: relative
  !important` on that element, so the rule lost and `inset` did nothing. The
  editor grew to the height of the whole file (11,991 px for `example.js`
  inside a 673 px pane), its scroller never overflowed, and the clipped row
  around it had nothing to scroll. The emulator reproduced it: the capture was
  byte-identical before and after a swipe, and the measurements above came from
  the live page over DevTools. The editor now mounts inside an absolutely
  positioned wrapper and is `height: 100%` of it. `bundle_migration_test.dart`
  pins the arrangement, since jsdom has no layout to test.

**Measured.** `ide.js` is 55,386 B raw / 16,510 B gzipped, against the 18 KB
budget. `ui.js` went from 138,809 B to 142,895 B with the `Toast`,
`ToastContainer` and `Placeholder` exports. The icon subset holds 33 glyphs in
5.0 KB.

**Verified.**

- node: 98 tests pass, 18 of them new in `web/test/ide_shell.test.js`.
- Dart: 170 tests pass.
- Desktop browser against `tool/serve.dart`.
- Android API 36 emulator: Home, Code and Data, with no AppBar and no
  `aCelery [error]` lines in logcat.

**Not yet verified:** iOS, as with everything else in this project; the editor
and split view on a real keyboard; the status-bar colour under a dark theme on
the device.
