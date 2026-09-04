# SOTF Achievement Tracker

## Current iteration

**v1.2.4 — late-bound launch broker correction**

v1.2.4 corrects the launch broker's compile position. The bespoke completion state still owns the UI, while the user-level launch function is emitted from Electron Builder's late `customFinishPage` hook—the same point its stock assisted installer uses—so the required broker plug-in is available without exposing the stock Finish page.

### v1.0.0 — game-native interface redesign

- Rebuilt the application hierarchy around a Sons of the Forest survival/GPS field-record language rather than generic dashboard cards.
- Added the **Island Survival Record**, SITE 2 field instrumentation, compass-style completion gauge and survival-record telemetry.
- Reframed the achievement list as **Achievement field records** with game-specific Steam record, counter, selected-save trace and field-note terminology.
- Preserved the ten-scene full-bleed SOTF artwork pool, bespoke Project Island installer/uninstaller, verified GitHub link and universal footer.

### v0.8.1 — NSIS compile correction

- Corrected malformed multiline text in the bespoke installer and uninstaller completion pages.
- Installer preflight now rejects unterminated `NSD_CreateLabel` strings before Electron Builder runs.

### v0.8.0 — Project Drive parity pass

- Bespoke Project Island installer/uninstaller using the validated Project Drive assisted-install journey.
- Sons of the Forest-specific installer header/sidebar artwork and Project Island application header treatment.
- Ten full-bleed, game-specific achievement scenes with deterministic preloading/assignment.
- Verified GitHub source link: `Phil-Forster/Project-island`.
- Universal footer retains **SPOILERS CONTAINED**, dynamic version/year, author and portfolio information.
- Installer preflight runs automatically before Windows packaging.

A read-only Windows desktop application for tracking **Sons of the Forest** Steam achievements and showing useful subtask guidance from the selected game save.


## Spoiler notice

Achievement names, requirements and in-app guidance may reveal story details, locations, enemies or progression. Use the tracker at your own discretion if you want to avoid spoilers.

## Current build

**v1.2.0 — shared bespoke installer architecture**

The tracker is a general reader. It is not tied to a particular Steam account, save slot, Windows username, Steam library drive, or development save.

Collapsed achievement cards that share a row with an expanded card use a stable rotation of ten optimised, full-width SOTF landscapes. The images cover the complete surplus panel beneath controlled dark gradients rather than appearing as isolated transparent cutouts. All card art is preloaded while Steam data is read, and the splash is decoded before its transparent window is shown.

## Purpose

The application has three responsibilities:

1. Show the **true Steam LOCKED / UNLOCKED state** of every Sons of the Forest achievement.
2. For achievements with counters or constituent tasks, show useful progress and selected-save guidance where that information can be read reliably.
3. Show the signed-in account's local Steam playtime separately from selected-save game-day context.

The application is intentionally **not** a save editor.

## Source-of-truth rule

### Steam controls achievement completion

Steam is authoritative for whether an achievement is locked or unlocked.

Selected-save data can provide counters, current state and checklists, but it cannot promote a Steam-locked achievement to complete.

Examples:

- An unlocked `TRADESMAN` is displayed as its completed threshold: `50 / 50 logs`.
- A locked `1%` remains locked even if the selected save currently contains more than $1,000.
- A locked `FOODIE` can still show the selected-save `x / 37` edible checklist without overriding Steam.

This keeps the tracker reliable even when a save has been modified independently of Steam achievement credit.

## Data sources

### Local Steam UserStats — primary

The tracker reads achievement state, unlock timestamps and available numeric statistics from the logged-in Steam client through the Steamworks runtime installed with Sons of the Forest. It also parses Steam's local binary UserStats schema so a cumulative achievement is connected to the stat explicitly stored in that achievement's own schema block. This replaces the earlier proximity-based guess for `COLLECTOR` and `I LIKE BLISTERS`.

Steam playtime is read from the signed-in account's local Steam configuration and does not depend on a selected save or public Community profile.

This is read-only and does not require the player's Steam Community profile to be public.

### Steam Community — fallback

If local Steam UserStats cannot be resolved, the tracker can attempt to read the player's Steam Community achievement page. Privacy settings may prevent this fallback from returning personal achievement state.

### Steam achievement metadata

Steam metadata supplies achievement names, descriptions and artwork.

### Sons of the Forest save

The selected `SaveData.zip` supplies per-save guidance such as item, crafting, food, plating, NPC and other achievement-related state.

The tracker does **not** write to the save.

## Save discovery

The normal Sons of the Forest save root is resolved from the current Windows profile:

```text
%USERPROFILE%\AppData\LocalLow\Endnight\SonsOfTheForest\Saves
```

The tracker discovers valid saves beneath Steam-ID folders in:

- `SinglePlayer`
- `Multiplayer`
- `MultiplayerClient`

Every discovered save containing `SaveData.zip` is available in the save selector. **Steam only** is the default; choosing a save adds its evidence without replacing Steam. A folder browser supports unusual locations and extracted save trees.

## Steam/game discovery

The Sons of the Forest installation is **not hard-coded to a drive letter or SteamLibrary path**.

The tracker:

1. Resolves the primary Steam installation from the Windows registry.
2. Reads Steam's `steamapps\libraryfolders.vdf` for registered libraries.
3. Finds Sons of the Forest by Steam App ID `1326470` using `appmanifest_1326470.acf`.
4. Reads the game's actual `installdir` from the manifest.
5. Locates `steam_api64.dll` within that discovered game installation.

An optional `SOTF_GAME_PATH` environment variable can be used as a manual override for unusual installations.

## Requirements

- Windows 10 or Windows 11
- Steam installed and running
- Sons of the Forest installed through Steam
- For the installed build: no Node.js or npm required
- For source/development builds only: Node.js with npm available in `PATH`

## Running the application

### Installed/production build

The production target is a normal Windows x64 application installed from the generated NSIS `.exe` installer. Once installed, launch **SOTF Achievement Tracker** from the desktop or Start menu.

The packaged application starts Electron directly, so there is no BAT, VBS, npm or terminal stage before the splash. The transparent splash is deliberately created before the heavier save/Steam modules are loaded; the main dashboard renderer is started only after the splash has reached its first paint.

The installer is currently unsigned. Windows SmartScreen may therefore show an **Unknown publisher** warning until a code-signing certificate is added to the release process.

### Source/development build

For normal source use, double-click:

```text
START-WINDOWS.vbs
```

This launches Electron silently and displays the same splash. If project dependencies are missing, it falls back to `START-WINDOWS.bat`, which keeps first-time npm errors visible for troubleshooting.

### Building the Windows installer

Double-click:

```text
BUILD-WINDOWS.bat
```

The build script:

1. checks Node.js/npm;
2. verifies that the development Electron runtime is not currently locked by a running tracker instance;
3. installs the pinned `electron-builder` dependency only when it is missing;
4. verifies that the builder actually exists before starting packaging;
5. builds the Windows x64 application by invoking the local builder directly;
6. creates the branded NSIS installer under `dist\`;
7. copies the single distributable Setup EXE into `RELEASE\`;
8. leaves `dist\win-unpacked\SOTF Achievement Tracker.exe` available for direct pre-install testing;
9. opens the `RELEASE` folder when the build completes.

**Important:** close the development tracker before running `BUILD-WINDOWS.bat`. The source build uses `node_modules\electron`, and Windows will lock Electron runtime files while the app is open. The build guard detects this condition before npm runs and exits with a clear message instead of producing an `EBUSY` dependency failure.

The application icon and Windows executable metadata are applied during this build.

### Shared bespoke installer/uninstaller architecture

The Windows package uses **Shared Bespoke Installer Framework v1.0.5**. NSIS/Electron Builder remains the deployment engine for elevation, extraction, registry/shortcut registration, upgrades and removal, but its standard wizard pages are not intentionally presented as the user interface.

The visible installer is one persistent branded shell whose content changes in place through **Ready → Installing → Complete/Error**. The uninstaller uses the same framework and changes through **Confirm uninstall → Removing → Complete/Error**. Project-specific configuration supplies the project/game names, accent palette, copy and shell artwork; shared state, path handling, scope/UAC handling, progress presentation, success/failure handling and navigation live in `build/installer/framework.nsh`.

The Ready state owns the visible install-location field and Current user / All users selection. All-users installation may invoke the Windows-owned UAC prompt, but the Electron Builder install-mode and directory wizard pages remain hidden. The completion state provides a bespoke **Launch Project Island** toggle, checked by default, and a single **Finish** action. Clearing the toggle exits without launching the tracker.

`node tools/installer-preflight.js` validates the shared-framework contract before Windows packaging. The preflight also enforces Electron Builder 26.15.7's `customFinishPage` contract: defining that macro replaces the stock installer Finish-page branch entirely, so no dead stock-page pre-hook/function is retained. `BUILD-WINDOWS.bat` remains the supported packaging entry point. The source ZIP does not contain a compiled Windows Setup EXE; final NSIS compilation and visual/runtime validation are performed on Windows.


## Main interface

The application provides:

- Steam-only mode plus optional current-save selection and folder browsing;
- local Steam playtime and separate selected-save day/time;
- Steam achievement totals;
- locked, unlocked and unresolved filters;
- achievement search;
- official Steam achievement artwork;
- Steam unlock date/time where available;
- progress bars for valid counters/checklists;
- expandable per-achievement details split into Steam result, numeric progress, selected-save evidence, and requirements/guidance;
- automatic refresh when the Sons of the Forest save tree changes;
- manual refresh and save-folder access;
- a short first-run guided tour explaining the non-obvious data sources and controls;
- a **Guide** button in the header to replay the tour at any time.
- stable main-window scrollbar spacing to prevent layout shift when content height changes;
- thin, palette-matched scrollbars across the main window and nested scrollable lists.
- an original optimised forest/coast background sits beneath readability overlays, while atmospheric forest artwork still fills surplus space beside expanded achievements.
- a transparent-edged startup splash replaces the normal terminal-loader experience; its live stage-driven progress is separate from the artwork, and the main window is revealed only after its first dashboard render completes.
- production Windows packaging launches the app directly from an installed `.exe`, avoiding the source BAT/VBS/npm startup chain.

## Guided tour

On first run, the tracker presents a short five-step guided tour. It explains:

1. why Steam remains the primary source;
2. optional save selection and folder browsing;
3. Steam state, playtime and numeric data;
4. achievement filters and search;
5. the four evidence/guidance sections inside expanded cards.

The tour can be skipped and is only shown automatically once. Use the **Guide** button in the header to replay it later.

## Safety and privacy

The tracker is designed as a local, read-only utility. It does not:

- edit Sons of the Forest saves;
- unlock Steam achievements;
- alter Steam statistics;
- inject into the game process;
- modify game files;
- scan arbitrary drive letters for Steam installations.

Steam Community requests are used only for metadata and as a fallback when local Steam state is unavailable.

## Troubleshooting

### Achievement state is unresolved

Keep Steam running and logged into the same account that owns the selected save, then use **Refresh**.

The summary should normally report all defined achievement states through `Local API`.

### Steam states work but counters are unavailable

The local Steam achievement state can still be correct even if a particular lifetime statistic is not exposed or cannot be matched reliably. The tracker deliberately avoids inventing a counter from unrelated save values.

For `COLLECTOR` and `I LIKE BLISTERS`, v0.6.9 only presents a locked-achievement counter when the parsed Steam schema identifies the backing statistic structurally. If that association cannot be proven, the card reports that the counter is unavailable instead of continuing to display a plausible but non-updating value from an unrelated statistic.

### No saves are listed

Steam-only tracking remains available. Use **Browse** to choose the standard save root, a Steam-ID folder, a mode folder or an individual save-slot folder containing `SaveData.zip`.

### Source build does not install Electron

Confirm both commands are available from a normal Command Prompt:

```text
node --version
```

```text
npm --version
```

## Development record

Implementation history, fixes, validation notes and maintenance actions are recorded in [`LOG.md`](LOG.md). The README is intentionally limited to user-facing information.

## Author

### Shared tracker footer

The application uses the universal achievement-tracker footer structure while presenting this tracker as **Project Island**. It includes the persistent spoiler warning, Phil Forster attribution, portfolio link, automatic copyright year and the running Electron package version. The footer includes the verified public GitHub source link for `Phil-Forster/Project-island`.

© 2026 Phil Forster  
[philforster.co.uk](https://philforster.co.uk)
