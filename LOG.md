# SOTF Achievement Tracker — Development Log

## v1.2.4 — 04/09/2026

- Corrected the shared launch-on-Finish architecture after Windows `makensis` showed that directly expanding `UAC_AsUser_ExecShell` inside the bespoke framework occurs before Electron Builder has made the UAC plugin available to that compile section.
- Advanced **Shared Bespoke Installer Framework** to v1.0.4 and removed plugin-dependent launch calls from the early shared function body that Electron Builder compiles before its broker plug-ins are available.
- Launch-on-Finish is now defined inside the late `customFinishPage` expansion, matching Electron Builder's own `StartApp` placement and using its supported `StdUtils.ExecShellAsUser` broker while the stock Finish page remains suppressed.
- Strengthened `tools/installer-preflight.js` to reject plugin-dependent launch calls in early Function bodies and require the late-bound launch-broker contract.
- No visible installer/uninstaller design, application UI, achievement logic, Steam/save handling or project-specific skin was changed in this patch.
- Updated `README.md`, `LOG.md` and package version for this iteration; Windows compilation/runtime validation remains the release gate.

## v1.2.3 — 04/09/2026

- Removed the shared framework dependency on `StdUtils::ExecShellAsUser` after the Windows Electron Builder NSIS bundle failed compilation because the `StdUtils` runtime plugin was not present.
- Advanced **Shared Bespoke Installer Framework** to v1.0.3 and switched Launch-on-Finish to the UAC plugin already used by Electron Builder's multi-user installer flow: elevated inner installs call `UAC_AsUser_ExecShell`, while non-elevated installs use normal `ExecShell`.
- Preserved the bespoke **Launch [Project Name]** toggle, checked by default, and the requirement that Finish launches the tracker at the interactive user's normal integrity level rather than elevated.
- Strengthened `tools/installer-preflight.js` to require the UAC launch-broker contract and reject any reintroduction of `StdUtils::ExecShellAsUser`.
- No visible installer/uninstaller design, application UI, achievement logic, Steam/save handling or project-specific skin was changed in this patch.
- Updated `README.md`, `LOG.md` and package version for this iteration; Windows compilation/runtime validation remains the release gate.

## v1.2.2 — 04/09/2026

- Removed two dead shared NSIS bitmap-handle variables (`BSI.ToggleOnBmp` and `BSI.ToggleOffBmp`) that triggered makensis warning 6001; Electron Builder treats NSIS warnings as fatal during packaging.
- Advanced **Shared Bespoke Installer Framework** to v1.0.2 and propagated the identical framework correction across all four tracker projects.
- Strengthened `tools/installer-preflight.js` to reject unused `BSI.*` NSIS variable declarations before Electron Builder starts, preventing the same warnings-as-errors build failure from reaching makensis.
- No visible installer/uninstaller design, application UI, achievement logic, Steam/save handling or project skin was changed in this patch.
- Updated `README.md`, `LOG.md` and package version for this iteration; Windows compile/runtime validation remains the release gate.

## v1.2.1 — 04/09/2026

- Corrected the shared `customUnInstallSection` compile contract after Windows `makensis` rejected the hidden finalisation section for calling `un.BSI_InstallCompleted` from a section that was not itself classified as uninstall code.
- Renamed the hidden post-removal finalisation section to an `un.*` section and marked it `SectionIn RO`, matching NSIS/Electron Builder uninstall-section requirements while preserving the synchronous Removing → Complete transition.
- Advanced **Shared Bespoke Installer Framework** from v1.0.0 to **v1.0.1** and propagated the identical framework fix across all four tracker projects.
- Strengthened `tools/installer-preflight.js` so a custom uninstall section now fails preflight unless it is an `un.*`, required, non-optional section; this exact compile failure can no longer pass the project preflight unnoticed.
- No application UI, Steam/save logic, achievement data or project-specific installer skin was changed in this patch.
- Updated `README.md`, `LOG.md` and package version for this iteration. Windows compilation/runtime verification remains the release gate.

## v1.2.0 — 04/09/2026

- Replaced the previous project-specific MUI/wizard skin with **Shared Bespoke Installer Framework v1.0.0**, reused verbatim across all four tracker projects.
- Reduced `build/installer.nsh` to a two-include entry point: project-specific configuration/assets plus the shared state/deployment framework.
- Rebuilt the visible installer as a persistent branded shell with Ready → Installing → Complete/Error states and no intentionally exposed standard Welcome, Directory or Finish wizard pages.
- Rebuilt the uninstaller on the same shared shell with Confirm uninstall → Removing → Complete/Error states.
- Added project-specific setup/removal shell artwork, accent configuration and copy for **Project Island / Sons of the Forest** while keeping common behaviour in one framework.
- Added the bespoke **Launch Project Island** completion toggle, checked by default; Finish launches through the interactive user token when enabled and exits without launching when disabled.
- Kept NSIS/Electron Builder responsible for deployment mechanics only: elevation, payload extraction/removal, install scope/path, registry data, shortcuts, Add/Remove Programs registration and upgrade handling.
- Added shared installer preflight checks for architecture drift, forbidden native/wizard UI patterns, required assets/configuration and framework identity.
- Updated `README.md`, package version and installer documentation for this iteration. Final Windows NSIS compilation and visual/runtime verification remain Windows target checks.

## v1.1.1 — 04/09/2026

- Replaced the overlapping Project Island splash composition with one formalised splash layout using the game-specific island background, Project Island badge, restrained status copy and a single integrated startup progress rail.
- Reworked the compass completion gauge so N/E/S/W sit on a protected outer marker rail and cannot be obscured by the live completion arc.
- Kept Steam authority, achievement mappings, save parsing, installer and uninstaller behaviour unchanged; installer presentation remains deliberately deferred to a later focused pass.

## v1.1.0 — 04/09/2026

- Realigned Project Island with the shared four-project tracker framework while preserving its Sons of the Forest survival/GPS field-record presentation.
- Applied the new Project Island badge across footer, application/shortcut icon, installer icon and uninstaller icon surfaces.
- Aligned the installer and uninstaller to the shared polished branded progress experience, including game-specific artwork and the slim integrated progress treatment.
- Kept the established green Project Island identity and game-specific interface language intact.
- No Steam authority, achievement mapping, save parsing or write behaviour was changed.

## v1.0.0 — 03/09/2026

- Promoted Project Island to the first full release and rebuilt the visible application around a Sons of the Forest-specific survival/GPS field-record identity.
- Added an Island Survival Record header, SITE 2 field instrumentation, compass completion gauge, survival telemetry and Achievement field records catalogue.
- Reworded expanded achievement dossiers to use Steam record, counter progress, selected-save traces and field-note terminology while preserving all existing Steam/save logic.
- Kept the ten-image SOTF full-bleed art rotation, bespoke Project Island installer/uninstaller flow, Project Island GitHub source link and universal footer.
- No achievement authority, save-writing behaviour or Steam mapping was changed.

## v0.8.1 — 03/09/2026

- Fixed two malformed multiline NSIS label strings on the install-complete and uninstall-complete pages that caused `makensis` to report an unterminated string.
- Kept the bespoke Project Drive-spec installer journey and game-specific artwork unchanged.
- Extended installer preflight to fail immediately when an `NSD_CreateLabel` quoted string is split across physical source lines.

## v0.8.0 — 03/09/2026

- Rebuilt the Windows installer and uninstaller around the validated Project Drive assisted-installer journey, including bespoke palette-matched controls, completion pages, launch-after-finish choice and upgrade/reinstall settle handling.
- Added Sons of the Forest / Project Island installer header and sidebar artwork plus a Project Island-specific application header treatment.
- Expanded full-bleed achievement artwork from six to ten game-specific scenes and kept deterministic preloading/assignment.
- Added the verified public GitHub repository link for `Phil-Forster/Project-island` to the universal footer.
- Kept **SPOILERS CONTAINED**, dynamic version/year metadata, Phil Forster attribution and the Project Island footer identity.
- Added the installer preflight to `BUILD-WINDOWS.bat` so NSIS flow/compile-warning regressions are caught before Electron Builder runs.

## v0.7.5 — 03/09/2026

- Refined the universal footer presentation for **Project Island** with a cleaner, simpler island/forest project emblem.
- Changed the persistent warning copy from **SPOILERS AHEAD** to **SPOILERS CONTAINED** to better describe the tracker content already on display.
- Added the `spoiler-disclaimer` hook to the footer warning so the Guide can reliably target the persistent spoiler notice.
- Preserved automatic year/version handling, Project Island identity, author attribution and the portfolio link while leaving repository links omitted unless a verified URL is available.

## v0.7.4 — 03/09/2026

- Replaced the legacy one-line copyright footer with the universal tracker footer using the **Project Island** identity and game-specific accent/icon treatment.
- Moved the persistent spoiler warning into the footer so it remains visible without duplicating the same warning above the achievement filters.
- Added compact project identity, author and portfolio blocks; repository/home links remain omitted unless the project exposes a real URL.
- Footer copyright year is derived from the local system date and the displayed version is read from Electron `app.getVersion()` through the restricted preload bridge.
- Added responsive footer stacking and explicit high-contrast states for text, links, warning copy and focus indicators.

## v0.7.3 — 03/09/2026

- Reworked NSIS installer/uninstaller theming so every sibling and nested assisted-installer dialog is themed, not only the first page container.
- Added native control coverage for combo boxes, rich-edit variants, links, list/tree views and progress controls; content controls now detach stock light visual styling before palette application.
- Reduced installer recolour latency from 120 ms to 40 ms to minimise visible system-colour flashes during page changes.
- Added the shared Project Island spoiler notice to the main tracker and as the first Guide step.
- Bumped the Guide completion key so existing users see the new spoiler guidance once.

This log records implementation work, decisions, defects, corrections and known outstanding items. It is the technical/project record; `README.md` is the user-facing overview.

---

## v0.7.2 — Full-bleed card landscapes

- Replaced the lower-right transparent cutout treatment after visual testing showed the artwork looked detached from the card.
- Added six full-width 1400×788 landscapes covering forest mountains, coast, cave, waterfall ravine, storm shore and hostile inland woodland.
- Changed card artwork to `cover` the complete unused panel beneath vertical and horizontal readability gradients.
- Kept deterministic assignment and concurrent image decoding from v0.7.1.

## v0.7.1 — Card-art variation and splash preload

- Replaced the single repeated achievement-card scene with 12 optimised SOTF forest, cave, waterfall, coast and abandoned-camp overlays.
- Assigned artwork deterministically by achievement position so refreshes and filters do not reshuffle card imagery.
- Preloaded and decoded all card artwork concurrently with the initial Steam dashboard request.
- Resized the SOTF splash from 1536×1024 to its actual 900×600 window size, reducing it from about 408 KB to about 100 KB.
- Added an explicit renderer-to-main decode handshake so the transparent splash window is shown only after the artwork is ready to paint.
- Retained a 1.5-second splash fail-safe so a damaged image can never block application startup.

## v0.7.0 — Steam-first source toolkit

- Removed the requirement to select or even possess a save before Steam achievement data can load.
- Steam-only is now the default source mode.
- Added logged-in account discovery independent of save ownership.
- Added local Steam playtime from the account's `localconfig.vdf`.
- Preserved selected-save day/time as a separate context value.
- Added portable save discovery, manual folder browsing and Steam-ID mismatch warnings.
- Reworked every expanded card into Steam result, numeric progress, selected-save evidence, and requirements/guidance sections.
- Preserved all 32 achievement definitions, all exact Steam counters and the complete existing SOTF save-evidence evaluator.
- Added category labels without changing achievement authority.
- Added an original 1672×941 forest/coast background, optimised to a 66 KB WebP.
- Applied the corrected guide spotlight so the highlighted point remains undimmed.

## Project objective

Build a usable Windows UI that:

- displays the true current Steam state for **all 32 Sons of the Forest achievements**;
- uses Steam as the authoritative source for whether each achievement is locked or unlocked;
- reads Sons of the Forest saves to provide useful constituent-task guidance for achievements with multiple requirements;
- works across valid saves and Steam accounts rather than being tied to the development save;
- remains strictly read-only against saves, Steam statistics and game files.

### Core data rule

The project distinguishes:

1. **Steam achievement state** — authoritative LOCKED / UNLOCKED state.
2. **Steam achievement/stat progress** — authoritative numeric progress only when Steam genuinely exposes it.
3. **Selected-save guidance** — current-save evidence/checklists used to help the player finish compound achievements; this can never override Steam state.

This rule was established after testing showed that a save can contain values modified by external tools that Steam has not credited as achievement progress.

---

## Development reference material

Two user-supplied copies of the same current Sons of the Forest save were used as **read-only development specimens**:

- current/live save package;
- game-created backup package from the same save slot.

The save is used to understand the generic Sons of the Forest schema. Player-specific values are not hard-coded into the application.

Observed save content includes files such as:

- `GameStateSaveData.json`
- `PlayerStateSaveData.json`
- `PlayerInventorySaveData.json`
- `PlayerClothingSystemSaveData.json`
- `PlayerArmourSystemSaveData.json`
- `ItemPlatingSaveManagerSaveData.json`
- `CookingSaveManagerSaveData.json`
- `ConstructionsSaveData.json`
- `GameSetupSaveData.json`
- `SaveData.json`
- multiple `Resin3dPrinter_*SaveData.json` files

Observed player-state patterns include entries such as:

- `consumed.<itemID>`
- `crafted.<itemID>`
- `hasOwned_<itemID>`
- `isPlated_<itemID>`
- `DiscoverablePageUnlocked_<id>`

These are parser/schema observations only; their values are read dynamically from whichever save is selected.

---

## v0.1.0 — Initial functional reader

### Added

- Electron Windows desktop application shell.
- Read-only discovery of the normal Sons of the Forest save directory.
- Discovery of:
  - `SinglePlayer`
  - `Multiplayer`
  - `MultiplayerClient`
- Discovery and selection of individual save slots.
- Direct read of each save's `SaveData.zip`.
- JSON extraction and normalisation for initial save files.
- Automatic selection of newest save.
- Save-directory watcher with UI refresh after changes.
- Initial display for all 32 achievement definitions.
- Basic achievement filtering/search.

### Development-save parser validation

The supplied development save was successfully parsed and exposed:

- game-day information;
- save file count;
- hundreds of persistent player-state entries;
- consumed, crafted, plated and discovery-related state patterns.

### Limitation

Many achievement cards were still scaffold-level. The UI existed ahead of the detailed achievement data mapping.

---

## v0.2.0 — Steam metadata and achievement artwork

### Added

- Official Steam achievement metadata retrieval.
- Steam achievement icons for the cards.
- Separate count/status reporting for Steam state and artwork.
- Continued generic save-reader behaviour; no save-specific values were embedded.

### Result

Achievement artwork worked correctly.

### Outstanding problem

Many cards still displayed:

`No lower-level save entries are currently mapped for this achievement.`

This represented missing evaluator implementation, not proof that no underlying data existed.

---

## v0.3.0 — Expanded save-derived guidance

### Added/expanded

Parser coverage was extended into additional save systems, including:

- broader player state;
- inventory;
- clothing;
- armour;
- Solafite/item plating;
- construction data;
- cooking data;
- VAIL/world actor data;
- NPC influence/sentiment;
- 3D printer state;
- game setup state.

Achievement guidance was expanded for multiple achievements rather than focusing on a single card.

Examples of work included:

- replacing a number of raw IDs with user-readable item names;
- exposing named/checklist information for crafting, plating, food and related compound achievements;
- companion-state inspection;
- save-derived contextual counts for several simple requirements.

### Defect discovered: save state was being mistaken for Steam progress

The `1%` achievement exposed the problem clearly.

A development save contained a cash value meeting the apparent achievement threshold because external software had been used for testing. Steam had **not** unlocked the achievement.

Therefore:

- current cash is not automatically authoritative lifetime Steam achievement progress;
- current inventory is not necessarily lifetime-collected progress;
- current construction state is not necessarily the achievement's lifetime action count;
- save values cannot be allowed to declare an achievement complete.

### Decision

Steam must be authoritative for headline achievement completion.

---

## v0.4.0 — Corrected achievement authority model

### Core change

Reworked the merge policy so:

- Steam is the only source allowed to produce LOCKED / UNLOCKED achievement state;
- save data no longer promotes an achievement to COMPLETE or IN PROGRESS at headline level;
- a Steam-unlocked threshold achievement displays its achievement threshold as satisfied rather than an unrelated larger save-derived value;
- save data is retained as guidance/context for compound achievements.

### Example rule

For a completed log-placement achievement, display its own required threshold (for example `50 / 50`) rather than `current save log count / 50`.

### Problem

Steam Community did not provide reliable state for the account, leaving 17 or more achievements unresolved/UNKNOWN.

A local Steam UserStats reader was therefore introduced so achievement state would not depend on Steam Community privacy.

---

## v0.4.1 — Local Steamworks discovery attempt

### Game discovery work

- Added Steam installation discovery.
- Added `appmanifest_1326470.acf` handling.
- Located the actual Sons of the Forest installation.
- Located the installed `steam_api64.dll` inside the Unity game directory.

### Runtime result reported during testing

The game and DLL were found correctly, but the Steam helper failed with:

`Unable to find an entry point named 'SteamAPI_Init' ... steam_api64.dll`

This established that the locator was no longer the immediate failure. The local runtime did not expose the assumed `SteamAPI_Init` entry point under that exact name.

### Additional issue identified

v0.4.1 also contained broad drive/library probing as a fallback. This was unnecessary and was called out during testing.

### Decision

Steam installation discovery must use Steam's own configuration rather than sweeping possible drive letters.

---

## v0.4.2 — Current build

### Steam path discovery corrected

Removed drive-letter scanning such as checking `C:` through `Z:` for possible Steam library names.

The normal discovery chain is now:

1. Read Steam's installation directory from Windows registry keys maintained by Steam.
2. Read `<Steam>\steamapps\libraryfolders.vdf`.
3. Inspect only libraries Steam itself declares.
4. Locate App ID `1326470` through `appmanifest_1326470.acf`.
5. Read the manifest's `installdir`.
6. Search only inside that resolved game installation for `steam_api64.dll`.

The program contains **no hard-coded `X:` path, developer Steam ID or developer username**.

An explicit `SOTF_GAME_PATH` environment variable remains available only as a manual override.

### Steamworks binding corrected

The helper no longer statically imports `SteamAPI_Init` and therefore no longer fails immediately when that exact export is absent.

It now:

- loads the detected `steam_api64.dll` dynamically;
- resolves exports with Windows `GetProcAddress`;
- attempts supported initialisation entry points dynamically;
- supports `SteamAPI_InitFlat` where available;
- falls back to other compatible initialisation entry points if exported;
- resolves Steam User and UserStats interface getters dynamically;
- requests current stats;
- retrieves achievement names and locked/unlocked state;
- checks the Steam ID returned by the running Steam client against the Steam ID associated with the selected save when that ID can be obtained;
- performs no Steam writes or achievement-unlock calls.

### Documentation

Added/updated:

- `README.md` — user-facing purpose, usage, data model, discovery behaviour and safety.
- `LOG.md` — detailed technical/action history and project decisions.

---

## Current expected test

With Steam running and logged in, launch v0.4.2 and refresh the dashboard.

The immediate success criterion is:

`32/32` Steam achievement states resolved from the local Steam API.

If local Steamworks initialisation still fails, the diagnostic should now identify the dynamic initialisation/interface failure rather than throwing the previous missing-`SteamAPI_Init` entry-point exception.

---

## Outstanding work after Steam state is confirmed

Do not divert into cosmetic UI work until the authoritative Steam state is stable.

Next data work:

- complete save-derived guidance across the full set of compound achievements;
- verify every constituent requirement;
- replace remaining raw item IDs with accurate user-facing game names;
- refine any provisional item labels;
- ensure compound checklists describe the selected save without pretending to be Steam credit;
- use genuine Steam numeric progress only where Steam actually exposes it;
- preserve full general-reader behaviour across accounts, save slots and Steam library locations.

---

## Non-goals / safety boundaries

The application must not:

- edit or rewrite `SaveData.zip`;
- unlock Steam achievements;
- modify Steam stats;
- inject into the running game;
- patch `steam_api64.dll`;
- modify Sons of the Forest game files;
- hard-code development-account state into achievement results.

---

## v0.4.2 — Test result

### Runtime result reported during testing

Steam/game discovery succeeded and resolved:

- Game: `X:\SteamLibrary\steamapps\common\Sons Of The Forest`
- DLL: `X:\SteamLibrary\steamapps\common\Sons Of The Forest\SonsOfTheForest_Data\Plugins\x86_64\steam_api64.dll`

The local helper then failed with:

`Argument types do not match`

Steam Community fallback also did not expose reliable personal locked/unlocked rows, therefore **0 of 32** achievement states were resolved and all achievement cards remained `UNKNOWN`.

### Root cause

The failure was in the PowerShell-to-C# interop layer. v0.4.2 asked PowerShell's reflection binder to invoke C# methods containing `ref`/`out` arguments for native Steamworks values. Those include boolean state, unlock timestamps, Steam ID values and interface-selection output strings. PowerShell's method binder can reject these calls when the runtime types do not exactly match the compiled signature, producing the reported `Argument types do not match` before any achievement rows are returned.

This is not a save-data problem and does not change the source-of-truth model.

---

## v0.4.3 — Steam interop correction

### Steamworks helper rewritten

The native Steamworks interaction has been moved fully into compiled C#.

PowerShell now performs only three jobs:

1. receive the discovered `steam_api64.dll` path and expected Steam ID;
2. compile/load the C# helper;
3. serialise the returned managed result to JSON for Electron.

All native pointer/ref/out work is handled internally in C#, including:

- Steam initialisation;
- Steam User interface resolution;
- UserStats interface resolution;
- Steam ID retrieval;
- `RequestCurrentStats`;
- achievement count/name retrieval;
- locked/unlocked state retrieval;
- unlock timestamp retrieval;
- display-name/description retrieval.

This removes the PowerShell reflection-binder path that caused v0.4.2's `Argument types do not match` error.

### Interface compatibility

Expanded probing for compatible local Steam interface versions instead of assuming a single version. The helper now records a `phase` value so any further failure identifies whether it occurred during DLL load, Steam initialisation, Steam-user interface resolution, UserStats resolution, stats request, or achievement enumeration.

### Path discovery unchanged

No developer path or drive is hard-coded. Discovery remains:

Windows Steam registry -> `libraryfolders.vdf` -> `appmanifest_1326470.acf` -> manifest `installdir` -> `steam_api64.dll` inside that installation.

### Current test criterion

With Steam running and logged in to the account associated with the selected save, the tracker should resolve **32/32** Steam achievement states. If it does not, the v0.4.3 diagnostic now includes the internal Steamworks phase so the next failure can be isolated directly.


---

## v0.4.3 — Test result

### Runtime result reported during testing

Steam/game discovery again succeeded and resolved the correct Sons of the Forest installation and local `steam_api64.dll`, but the C# helper failed during the **compile** phase before any Steamworks function was called.

Reported compiler error:

`Invalid token '=' in class, struct, or interface member declaration`

The failing source line was the C# 6 auto-property initialiser used for the achievement-row list:

`public List<SotfSteamAchievementRow> rows { get; set; } = new List<SotfSteamAchievementRow>();`

Result: **0 of 32** Steam achievement states resolved.

### Root cause

Windows PowerShell 5.1 `Add-Type` compiles through the installed .NET Framework CodeDOM compiler and cannot be assumed to support newer C# language features. The helper introduced in v0.4.3 used C# 6 syntax even though the target runtime needs a conservative C# 5-compatible source profile.

This was an implementation/testing-process defect in the Steam interop layer, not a save-reader issue and not a change to the achievement source-of-truth model.

---

## v0.4.4 — Windows PowerShell compiler compatibility

### C# source profile corrected

The runtime-compiled Steamworks helper has been revised to avoid C# 6+ syntax.

Changes:

- removed the auto-property collection initialiser;
- added an explicit `SotfSteamReadResult` constructor which creates the achievement row list;
- retained standard C# 5-compatible properties/object initialisers;
- replaced `DateTimeOffset.FromUnixTimeSeconds` with an explicit Unix epoch + `AddSeconds` calculation to avoid depending on newer framework helper methods.

### What is deliberately unchanged

- Steam is still the sole authority for achievement LOCKED / UNLOCKED state.
- Save data does not override Steam completion.
- No drive-letter sweep or development-machine path is hard-coded.
- Steam installation discovery remains registry -> `libraryfolders.vdf` -> `appmanifest_1326470.acf` -> manifest `installdir`.
- The local Steamworks reader remains read-only and contains no stat/achievement write functions.

### Immediate test criterion

The helper must now compile successfully under Windows PowerShell 5.1 and progress beyond the compile stage. The desired final result remains **32/32** Steam achievement states. If Steamworks itself then rejects an interface/export/signature, the existing `phase` diagnostics should identify that runtime stage directly rather than producing another compile/binder ambiguity.


---

## v0.4.4 — Test result: 30/32 Steam states

### Runtime result

The local Steamworks reader successfully initialised and returned authoritative state for 30 of 32 achievements. The six achievements shown as locked matched the user's actual Steam state and the remaining resolved achievements were correctly shown as unlocked.

Exactly two achievements remained `UNKNOWN`:

- `THIS PLACE ISN’T SO BAD`
- `THIS CAN’T BE HEALTHY`

This confirmed that local Steam state acquisition itself was now working; the remaining defect was in the row-name merge between Steamworks output and the application's canonical achievement definitions.

### Root cause

Both unresolved names contain the Unicode right single quotation mark (`’`, U+2019). Steamworks supplies user-facing achievement strings as UTF-8. The helper was converting returned native pointers with `Marshal.PtrToStringAnsi`, which uses the Windows ANSI code page under the .NET Framework runtime. UTF-8 bytes for the typographic apostrophe could therefore be decoded as mojibake (for example `â€™`).

All other achievement names are effectively ASCII, explaining why 30 rows merged correctly while exactly these two failed. The locked/unlocked values for the two rows were being read from Steam, but their corrupted display names prevented the JavaScript merge layer from associating those values with the canonical achievement definitions.

This was not a missing Steam-stat issue and not a save-data issue.

## v0.4.5 — Steam UTF-8 string correction

### Actions taken

- Added an explicit UTF-8 native-pointer decoder inside the C# Steamworks helper.
- Replaced ANSI decoding for Steam achievement names and display attributes with UTF-8 decoding.
- Applied the same decoder to `SteamAPI_InitFlat` diagnostic text for consistency.
- Kept the existing canonical apostrophe normalisation in `achievements.js` as a defensive presentation/name-normalisation layer.
- Updated the package version to `0.4.5`.
- Updated the Steam HTTP user-agent version.
- Removed stale UI wording that referred specifically to v0.4.3.

### Expected result

The authoritative Steam reader should now merge all **32/32** achievement states. `THIS PLACE ISN’T SO BAD` and `THIS CAN’T BE HEALTHY` should show their actual Steam locked/unlocked state instead of `UNKNOWN`.

### Source-of-truth rules unchanged

- Steam remains authoritative for achievement completion.
- Save data remains guidance/context for compound achievements and does not override Steam.
- No user paths, Steam IDs or achievement states are hard-coded.


---

## v0.4.5 — Test result: 32/32 Steam states confirmed

### Runtime result reported during testing

The UTF-8 correction resolved the final two apostrophe-containing achievement names. The user confirmed the top-level achievement state layer is now working: all **32/32** Steam achievements resolve to their true Steam state.

Observed result:

- 26 achievements displayed as unlocked;
- 6 achievements displayed as locked;
- 0 achievements remained unknown.

The six locked states matched the user's actual Steam account state.

### Development decision

The top-level Steam-state acquisition layer is now treated as the established source of truth. Development moves to the sub-level/count layer without revisiting save-derived completion inference.

---

## v0.5.0 — Steam counters and subtask audit

### User-reported issue

The top-level state was correct, but sub-level data remained incomplete. `COLLECTOR` was highlighted as an example because the achievement card did not show the current lifetime Drogue-watch pickup count.

The requirement was clarified as:

- every count-based achievement should show the correct count when that count exists;
- Steam remains authoritative for achievement completion;
- completed threshold achievements display their achievement threshold (for example `50 / 50`), not an unrelated larger selected-save value;
- selected-save data is used to guide compound/subtask achievements, not to override Steam.

### Steam UserStats schema/stat discovery added

The local Steam helper now accepts the Sons of the Forest local UserStats schema path. The Electron discovery layer resolves the primary Steam installation from the registry and looks for:

`appcache\stats\UserGameStatsSchema_1326470.bin`

A filename fallback is also used within Steam's `appcache\stats` folder when the exact standard name is not present. No drive-letter scan is used.

The C# Steamworks helper now:

- reads the local schema file read-only;
- extracts plausible stat API-name strings from the binary schema;
- probes those candidates through `SteamAPI_ISteamUserStats_GetStatInt32` and `SteamAPI_ISteamUserStats_GetStatFloat`;
- returns every successfully resolved local stat to Electron;
- reads `GetAchievementProgressLimitsInt32` / `GetAchievementProgressLimitsFloat` where Steam exposes achievement progress limits;
- records nearby schema stats for each achievement API name so the reader can associate a stat with the correct achievement without hard-coding a user's values;
- continues to expose no Steam stat/achievement write functions.

### Counter association logic

The JavaScript Steam reader now associates local stats with count-based achievements using:

1. Steam's own achievement progress limit where available;
2. proximity between the achievement API name and stat API name inside Steam's local schema;
3. semantic stat-name hints as a fallback when a unique match exists;
4. plausibility checks against the locked achievement target.

If multiple candidates remain ambiguous, the reader does not guess.

For unlocked achievements, the achievement-specific display count is clamped to the completion threshold. A lifetime stat larger than the threshold is not shown as the achievement count.

### Existing subtask evaluators audited

- `BLOCKBUSTER`: selected-save recording progress now reports against the three found-footage recordings.
- `DYNAMO`: corrected. The previous implementation counted any occupied armour slot, which could falsely imply Tech Armour progress. v0.5.0 counts only Tech Armour item `554` toward the ten-piece set.
- `INTERIOR DESIGNER`: selected-save discoverable blueprint flags are retained as guidance; Steam progress/target is preferred when available.
- `FOODIE`: consumed-type save evidence is retained, while an authoritative Steam counter/target is preferred when available. Raw/friendly-name refinement remains a separate catalog task.
- `GUMSHOE`: Steam note-page progress is used when exposed; the save's story/document page index is only contextual and is no longer presented as the collection count.
- `COLLECTOR`: current inventory watch quantity remains context only. The actual achievement count is now expected from the local Steam stat pipeline when Steam exposes it.
- `1%`: current-save cash remains context only and cannot override or substitute for Steam's cumulative achievement state/stat.
- log-placement, digging, Fi-Z, raw-fish and heavy-cannibal-kick thresholds all prefer Steam local progress when available.

### UI/diagnostic changes

- Added a `Steam stats` summary card showing how many local Sons of the Forest stat counters were discovered.
- Achievement source details display the selected Steam stat API name when a numeric counter is being used.
- If 32/32 achievement states resolve but no local stats are discovered, the UI shows a targeted counter/schema warning while preserving the correct top-level achievement states.
- Expanded the desktop summary grid from five to six columns for the new stat diagnostic card.

### Validation performed before packaging

- All modified JavaScript files passed `node --check`.
- The existing supplied save was parsed successfully after the evaluator changes.
- Mock Steam progress was injected for `COLLECTOR`, `TRADESMAN` and `FOODIE` to verify that Steam numeric progress takes precedence over selected-save context and renders the expected `current / target` result.
- `DYNAMO` was re-evaluated against the supplied save and no longer reports the ten non-Tech armour pieces as a completed Tech Armour set.

### Runtime validation still required

The local Steam stat schema/API path must be exercised on the Windows/Steam installation because the development container cannot call the user's local Steam client. The key v0.5.0 runtime indicators are:

- `Steam read: 32/32 · Local API`;
- `Steam stats: <non-zero> counters`;
- locked cumulative achievements such as `COLLECTOR` displaying an actual Steam `current / target` count when their backing stat is exposed.

---

## v0.5.1 — Unlock dates and sub-level refinement

### Runtime feedback from v0.5.0

Top-level achievement state remained correct, but four sub-level presentation issues were identified during manual review:

1. `PINATA` displayed Cave B/C Sluggy world-state integers. Those values were not meaningful to the user and could not identify which Sluggy event awarded the achievement.
2. `BLOCKBUSTER` displayed a completed `4 / 4` progress bar while the body text said `3 / 3` and listed only three named recordings.
3. `DYNAMO` was correctly unlocked on Steam but the selected-save guide displayed `0 / 10 Tech Armour`, creating the false impression that the achievement state was wrong. Inspection of the supplied save showed ten current armour pieces, all using a different armour item ID than the Tech Armour ID currently mapped by the tracker.
4. `FOODIE` exposed a `0 / 37` Steam-derived progress value while the selected save contained many individual `consumed.*` entries. This showed that the automatically associated nearby Steam stat/float was not sufficiently proven to represent FOODIE progress.

The user also requested the actual Steam unlock date for each unlocked achievement.

### Actions taken

#### Steam unlock timestamps

- Confirmed that the existing C# Steam helper already calls `SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime` and returns an ISO timestamp as `unlockedAt` when Steam supplies a non-zero unlock time.
- Added a dedicated `UNLOCKED` row to each expanded unlocked achievement card.
- Added UK-format rendering (`DD/MM/YYYY at HH:MM`) using the local Windows timezone.
- If Steam marks an achievement unlocked but supplies no timestamp, the UI explicitly reports that no unlock timestamp was returned rather than inventing one.

#### PINATA

- Removed Cave/Sluggy `NamedIntDatas` values from the user-facing achievement guide.
- Documented in code that these are world/spawn persistence values, not an achievement kill-history counter.
- Replaced them with a concise event explanation: Steam confirms historical completion; for locked state the actionable requirement is simply to blow up a Sluggy.

#### BLOCKBUSTER

- Removed the hard-coded `3` target.
- The evaluator now prefers Steam's reported achievement target/progress maximum and falls back to four recordings when no target is supplied.
- The supplied save exposes three named `hasViewedFoundRecording_*` flags (`Cultists Arrival`, `Sahara Confidential`, `Cultists1`).
- If Steam confirms the four-recording achievement is complete while only three named save flags are present, the UI now states that difference explicitly and adds a fourth placeholder row instead of claiming the save itself contains `3 / 3` complete data.
- This keeps Steam completion and save-level evidence separate and internally consistent.

#### DYNAMO

- Preserved current-loadout inspection using the mapped Tech Armour item ID.
- Added explicit separation between the historical Steam unlock and the selected save's current armour loadout.
- If Steam reports DYNAMO unlocked, the headline progress now displays `10 / 10` even when the selected save currently contains fewer Tech Armour pieces.
- The expanded card separately shows current Tech Armour pieces and other armour pieces.
- The supplied development save currently contains ten occupied armour slots, but none use the currently mapped Tech Armour item ID. This is treated as a current-loadout observation, not a contradiction of the Steam unlock.

#### FOODIE

- Disabled automatic local-stat progress selection for locked `FOODIE` because the live `0 / 37` result was not trustworthy.
- Steam still controls `LOCKED` / `UNLOCKED`.
- The selected save remains the guide source through `consumed.*` entries.
- Individual list values are now rendered as `Consumed N×` to make clear that they are per-item quantities rather than achievement progress points.
- The summary now reports distinct consumed-type entries, named entries and still-unclassified entries without converting them into a false completion percentage.
- Steam's requirement target can still be shown as context when available, but no unverified current Steam stat is presented as FOODIE progress.

#### Compound unlocked progress rule

- Added a generic merge rule so a Steam-unlocked compound/checklist achievement with a known requirement target displays that target as complete.
- This prevents a changed current save from making an already-unlocked achievement appear partially complete.
- Save-derived progress remains visible in the expanded guide as current context only.

### Validation performed

- `node --check` passed for all modified JavaScript modules.
- Re-read the supplied `1183366667/SaveData.zip` successfully.
- Verified against the supplied save that:
  - `BLOCKBUSTER` exposes three named viewed-recording flags while a mocked Steam target of four renders `4 / 4` at the achievement level and clearly explains the three save flags;
  - `DYNAMO` renders `10 / 10` when Steam is unlocked while separately reporting `0 / 10` current mapped Tech Armour and ten other current armour pieces;
  - `FOODIE` no longer renders the misleading `0 / 37` progress and instead reports 38 consumed-type entries (35 currently named, 3 unclassified) from the development save;
  - unlock timestamps are propagated through `mergeAchievementState` for renderer formatting.

### Source-of-truth rules unchanged

- Steam decides `LOCKED` / `UNLOCKED` and historical achievement completion.
- Current save state is guide/context and cannot reverse or promote Steam state.
- No Steam stats, achievements, saves or game files are written or modified.


---

## v0.5.2 — BLOCKBUSTER and FOODIE requirement correction

### Runtime feedback

Two remaining compound-achievement issues were identified during manual review:

1. `FOODIE` had lost its progress bar/count in v0.5.1. The individual consumption rows were useful, but the user requires an achievement-level `x / 37` guide count as well.
2. `BLOCKBUSTER` still did not represent the real task set. The correct achievement requires exactly four Found Footage recordings: `Sahara Confidential`, `Cultists Arrival`, `Cultists 1`, and `Estate Agent`. A generic fourth placeholder is not acceptable.

### Actions taken

#### BLOCKBUSTER

- Added a canonical four-item requirement definition.
- Mapped the known selected-save viewed flags for `Sahara Confidential`, `Cultists Arrival`, and `Cultists 1`.
- Added the `Estate Agent` recording as the fourth canonical requirement and checks the expected `hasViewedFoundRecording_EstateAgent` / spaced-key variants when present.
- Removed generic `Found-footage recording 4` placeholders.
- The checklist, `x / 4` count and progress bar now derive from the same four-item array.
- If Steam reports the achievement unlocked, all four historical requirements are treated as complete at the guide level even when the selected save lacks an individual historical flag.
- If Steam reports it locked, the selected-save flags remain the lower-level guide.

#### FOODIE

- Reconnected the evaluator to the explicit 37-item `FOODIE_REQUIREMENTS` catalog.
- Restored the achievement-level progress object and progress bar.
- Progress is now the number of distinct required edible types with a positive `consumed.<id>` count, not the sum of quantities and not the previously rejected Steam float association.
- Each requirement contributes at most one point to the `x / 37` count.
- Individual rows continue to show `Consumed N×` where available and `Not consumed in this selected save` where missing.
- If Steam reports `FOODIE` unlocked, the headline is forced to `37 / 37` while the selected-save quantities remain supporting context.

### Validation performed

- `node -c` passed for the modified achievement evaluator and renderer.
- Re-read the supplied development save successfully.
- With Steam mocked as locked:
  - `BLOCKBUSTER` evaluates to `3 / 4` with exactly the four canonical rows and `Estate Agent` missing in the supplied save.
  - `FOODIE` evaluates to `36 / 37`; `Turtle Egg` is the only missing requirement in the supplied save.
- With Steam mocked as unlocked:
  - `BLOCKBUSTER` displays `4 / 4`.
  - `FOODIE` displays `37 / 37`.

### Source-of-truth rules unchanged

- Steam remains authoritative for `LOCKED` / `UNLOCKED`.
- Save data provides lower-level guidance/checklists.
- The tracker remains read-only for Steam, game files and save files.

---

## v0.5.3 — Sons of the Forest UI palette

### Request

Apply a visual treatment derived from the game itself without changing any reader, Steam, save, achievement, counter or checklist behaviour.

### Actions taken

- Reworked only `src/styles.css`; no JavaScript achievement logic was changed.
- Replaced the generic blue/cyan dashboard palette with a restrained survival palette:
  - main background `#0B0E0D`;
  - card/panel surface `#171D19`;
  - elevated surface `#202721`;
  - divider/border `#354038`;
  - primary text `#E8ECE8`;
  - secondary text `#9CA79F`;
  - main survival accent `#7F9B63`;
  - completed-progress accent `#A8BF72`;
  - Steam-unlocked/earned accent `#C7A85D`;
  - warning accent `#C99046`;
  - danger accent `#A84D47`.
- Added subtle forest-charcoal depth to the application background without introducing decorative imagery or gradients into achievement cards.
- Changed unlocked state dots, labels, card borders and icon borders to restrained gold.
- Kept locked cards visually readable, with stone-grey state treatment and only moderate icon desaturation.
- Changed active progress bars to survival green and completed/unlocked progress bars to pale yellow-green.
- Rethemed focus states, filters, buttons, notices, subtask rows and scrollbars to the same palette.

### Scope control

This was deliberately a visual-only iteration. The v0.5.2 achievement logic and data behaviour were left untouched so the styling can be evaluated independently.

---

## v0.5.4 — Expanded-card spacing and metadata alignment

### Runtime feedback

Live UI review identified a layout defect in expanded achievement cards: the generated `SOURCE` pseudo-label could shrink as a flex item and wrap its final `E` onto a second line. The expanded body also used asymmetric horizontal padding (`38px` left versus `16px` right), which reduced usable width and made the detail area feel visually offset.

### Actions taken

- Replaced the generated `SOURCE` pseudo-element with explicit `source-label` and `source-text` spans.
- Made the source row a two-column grid (`label + flexible value`) so the label cannot shrink or wrap.
- Added `white-space: nowrap` to the source label.
- Changed expanded body padding to symmetrical `18px` left/right.
- Increased progress-top spacing slightly and standardised progress metadata spacing.
- Added consistent line-height and vertical spacing to evidence, unlock and source metadata.
- Increased subtask row gap/padding slightly and aligned values vertically.
- Kept long source strings safely wrapping inside the value column only.

### Scope control

This is a visual-only refinement. No achievement definitions, Steam state handling, counters, save evaluators, checklist data or source-of-truth behaviour were changed.
---

## v0.5.5 — FOODIE row-count presentation

### Runtime feedback

The `FOODIE` checklist was functionally correct, but values such as `Consumed 29×` were unnecessarily verbose and visually heavy in the right-hand value column. The multiplier symbol did not add useful information because the column already represents a count.

### Actions taken

- Kept the existing `x / 37` FOODIE achievement count and progress bar unchanged.
- Changed positive per-item consumption values from `Consumed N×` to the plain numeric value `N`.
- Changed a required edible with no selected-save consumption record to `0`.
- When Steam has historically unlocked FOODIE but the selected save lacks that item's historical record, the row uses `Steam complete` rather than fabricating a numeric save count.
- Retained all v0.5.4 expanded-card spacing fixes, including the explicit non-wrapping `SOURCE` label.

### Scope control

This is a presentation refinement only. Steam authority, FOODIE requirement membership, the 37-item target, save parsing and all other achievement evaluators remain unchanged.

---

## v0.5.6 — State indicator, disclosure control and footer

### Runtime feedback

The working survival-theme UI needed three small refinements:

1. The unlocked-state dot was still gold/amber and should read as a clear green success indicator.
2. The card open/close arrows used the `⌄` font glyph, which looked basic and visually shifted when rotated between states.
3. The application needed a minimal ownership/footer line with a portfolio link.

### Actions taken

- Added a dedicated `--success` green and applied it only to unlocked/complete state dots.
- Retained the existing subdued-gold treatment for earned card borders, labels and icon borders; only the status dot changed colour.
- Removed the `⌄` text glyph from the achievement template.
- Rebuilt the disclosure indicator as an inline SVG chevron inside a fixed 26×26 px control box.
- The SVG now rotates around a fixed centre point while the surrounding box remains stationary, eliminating the apparent positional shift.
- Added a subtle hover surface to the disclosure control.
- Added `prefers-reduced-motion` handling for the disclosure animation.
- Added a minimal footer containing `© 2026 Phil Forster · philforster.co.uk`.
- Added an Electron `setWindowOpenHandler` rule so HTTP/HTTPS footer links open in the user's normal external browser and are denied inside the Electron shell.

### Scope control

No achievement definitions, Steam reads, save parsing, counters, FOODIE/BLOCKBUSTER logic, checklist state or source-of-truth behaviour changed in this release.


---

## v0.5.7 — Full codebase review and maintenance pass

### Review objective

Perform an end-to-end maintenance review of the working v0.5.6 baseline without changing the validated achievement behaviour or visual design. The review focused on unnecessary code, logical separation, stability, Electron safety, accessibility, dependency drift and documentation scope.

### Baseline protection

Before the maintenance pass, the complete v0.5.6 source tree was copied to a separate review backup. The following working data-path components were deliberately left byte-for-byte unchanged:

- `src/steam-helper.ps1`
- `src/save-reader.js`
- `src/zip-reader.js`

The achievement evaluator logic itself was also left unchanged. Only two unused imports were removed from `achievements.js`.

### Bloat/dead-code findings

The review identified a small amount of genuine dead code rather than structural bloat:

- `item-catalog.js` contained a broad `ITEM_NAMES` map, `CONSUMABLE_NAMES` map and `itemName()` helper that were no longer consumed by any active evaluator.
- `achievements.js` still imported two of those unused symbols.
- `steam-local-reader.js` contained an unused `GAME_FOLDER` constant.
- CSS retained historical card-state selectors for `complete` and `in-progress` even though top-level cards now use only `unlocked`, `locked` and `unknown`.
- `.empty-substate` was no longer used.
- `renderer.js` retained an assigned-but-never-read `dashboard` variable.

These were removed. The active requirement sets for FOODIE, plating, crafted weapons and printable items remain in the isolated item-catalog module.

### Maintainability changes

- Pinned Electron to exact version `43.1.1` rather than allowing dependency drift through a caret range.
- Removed the stale hard-coded `0.5.1` HTTP User-Agent; Steam metadata requests now derive the running version from `package.json`.
- Removed hard-coded `32` totals from renderer summary/notice logic. UI totals now derive from the active achievement definition array returned by the application.
- Added an 8-second timeout to Steam Community/metadata HTTP requests so an unavailable network endpoint cannot leave the metadata/fallback request open indefinitely.
- Added a shared watcher shutdown path and clear any pending debounce timer during application shutdown/restart of the watcher.
- Matched the BrowserWindow pre-render background colour to the current survival UI background to avoid a mismatched startup flash.
- Added an explicit navigation guard so the local Electron renderer cannot navigate away from the application document; approved HTTP/HTTPS links continue to open externally through Electron's shell handler.
- Added an npm presence check to `START-WINDOWS.bat` so missing npm fails with a clear message before installation is attempted.
- Added a small `.gitignore` covering `node_modules`, npm debug logs and generated ZIP packages.

### Renderer robustness/accessibility

- Added a reusable notice helper instead of repeating notice visibility/text mutations.
- Added user-visible error handling for refresh, save switching and opening the save folder.
- Added an accessible label for achievement search without changing the visible layout.
- Filter buttons now expose `aria-pressed` and keep it synchronized with the active filter.
- Expanded achievement buttons now reference their detail panel through `aria-controls`.
- Progress tracks now expose progressbar semantics and current values to assistive technology.
- The existing visual layout, palette, icons, spacing, cards, chevrons and footer remain unchanged.

### Renderer security hardening

Added a renderer Content Security Policy that:

- limits scripts to the local application;
- limits styles to local styles plus the inline progress-width values used by the existing renderer;
- permits HTTPS/data images for Steam achievement artwork;
- blocks renderer network connections, objects and frames.

Steam HTTP access remains in the Electron main process, not the renderer.

### Documentation cleanup

`README.md` had accumulated release-history sections that belonged in this development log. It has been rewritten as a user-facing document covering:

- purpose;
- Steam/save source-of-truth behaviour;
- data sources;
- save and Steam discovery;
- requirements and startup;
- interface features;
- safety/privacy;
- troubleshooting.

Historical iteration detail remains in `LOG.md` only.

### Validation completed

The maintenance pass was checked against the supplied current-save fixture and the v0.5.6 baseline.

Passed checks:

1. Every JavaScript source file passes `node --check`.
2. Current-save parsing still returns Day `158`, `37` SaveData entries and `484` player-state entries.
3. Domain invariants remain: `32` unique achievements, `37` FOODIE requirements, `14` platable weapons, `6` crafted weapons and `6` printable item types.
4. A regression comparison using the same save and synthetic Steam states produced **byte-identical merged achievement/evidence JSON** between v0.5.6 and v0.5.7.
5. `steam-helper.ps1`, `save-reader.js` and `zip-reader.js` are byte-identical to the working v0.5.6 versions.
6. Static scans report no obvious unused CSS classes or single-reference top-level JavaScript declarations.
7. `node_modules` remains excluded from the distributed source package.

### Review conclusion

No architectural rewrite is warranted. The project is small and appropriately separated into:

- Electron shell / IPC;
- save discovery and parsing;
- ZIP parsing;
- Steam installation/UserStats access;
- Steam metadata/fallback handling;
- achievement definitions/evaluation;
- renderer/UI;
- styling.

The large PowerShell helper is intentional: it contains the isolated C# Steamworks interoperability layer required for Windows PowerShell 5.1 compatibility. Because this layer is now runtime-proven, it was not split or refactored purely for aesthetics.

v0.5.7 is therefore a conservative maintenance build: cleaner and more defensive, with the validated functional achievement output retained.


---

## v0.5.8 — First-run guided tour

### Objective

Add a short in-app explanation layer for the parts of the tracker that are not self-explanatory, without changing the validated achievement, save or Steam data logic.

### Guided tour added

Added a six-step coach-mark tour covering:

1. the selected save and its role as per-save guidance/context;
2. **Steam read** as the authoritative LOCKED / UNLOCKED source;
3. **Steam stats** as numeric UserStats counters separate from the achievement total;
4. state filters and achievement search;
5. opening an achievement card;
6. progress, subtask guidance and the **SOURCE** field in expanded details.

### Behaviour

- The tour launches automatically on the first successful dashboard render.
- Completion/skip state is stored locally in the Electron renderer so it does not repeatedly launch on later runs.
- Added a **Guide** button to the header so the tour can be replayed at any time.
- Added Back, Next/Finish and Skip controls.
- Escape exits the active tour.
- The final step temporarily expands the first visible achievement card to demonstrate the detailed view, then restores that card to its previous collapsed state when the tour closes.
- Tour targets are scrolled into view and visually isolated with a dimmed overlay and survival-green focus treatment.
- The coach mark is positioned above or below the highlighted element according to available viewport space.

### Scope control

No changes were made to:

- achievement definitions;
- Steam achievement state;
- Steam numeric stat reads;
- save discovery/parsing;
- achievement counters/checklists;
- FOODIE/BLOCKBUSTER mappings;
- source-of-truth rules.

The only renderer data change is the addition of internal tour markers to the existing **Steam read** and **Steam stats** summary cards.


---

## v0.5.9 — Scrollbar stability and styling

### Objective

Remove the small cumulative layout shift that could occur when filtering/collapsing content caused the main document scrollbar to appear or disappear, and bring every scrollbar into the established Sons of the Forest-inspired UI palette.

### Main-window stability

- Added `scrollbar-gutter: stable` to the root document.
- The main content width now remains stable when the page crosses the vertical-overflow threshold.
- No achievement, save, Steam, renderer-state or guided-tour behaviour was changed.

### Scrollbar styling

- Reduced Chromium/Electron scrollbar width and height from `10px` to `7px`.
- Added shared scrollbar palette tokens for track, thumb and hover state.
- Applied the same treatment globally so nested achievement subtask scrollers use the same thin presentation.
- Added a survival-green active thumb state and matching scrollbar corner styling.
- Added `scrollbar-width: thin` / `scrollbar-color` as the standards-based fallback.

### Scope control

This is a CSS/documentation-only UI refinement apart from the package version bump. The validated v0.5.8 application logic remains unchanged.

## v0.5.10 — Achievement detail scrollbar refinement

- UI-only maintenance release based on v0.5.9.
- Added explicit scrollbar styling to the nested achievement subtask/detail lists (`.substates`).
- Reduced those inner scrollbars to 5 px in Chromium/Electron so they are visibly thinner than the main-window scrollbar.
- Kept the track transparent and reused the existing forest-palette thumb/hover/active colours.
- Added a stable gutter to nested achievement scrollers to avoid content width movement as their scrollbar appears/disappears.
- No achievement definitions, Steam reads, save parsing, counters, guided-tour behaviour or other functional logic changed.

## v0.5.11 — Paired-card atmospheric artwork

### Objective

Use the otherwise empty area created by CSS Grid row matching when one achievement is expanded, while retaining the existing two-column catalogue and all working interaction/data behaviour.

### Changes

- Added a purpose-generated, text-free Sons of the Forest-inspired forest/mountain scene as `src/assets/achievement-card-forest.webp`.
- Converted the generated source artwork to a 1400 px-wide WebP (approximately 46 KB) for efficient local rendering.
- Added the artwork as a decorative pseudo-element on collapsed achievement cards.
- The artwork begins below the normal card header, so standard collapsed cards remain visually unchanged; it becomes visible only when a paired collapsed card is stretched vertically by an expanded neighbour.
- Added a dark forest gradient over the artwork so achievement content remains the visual priority and the scene blends into the existing card surface.
- Decorative artwork is pointer-inert and does not affect card interaction or accessibility.

### Scope control

This is a CSS/asset/documentation-only UI refinement apart from the package version bump. Achievement definitions, Steam reads, save parsing, counters, checklists, filters, tour behaviour and renderer logic are unchanged from v0.5.10.


## v0.5.12 — Splash-screen startup polish

### Objective

Replace the visible command-terminal startup experience with a game-themed transparent splash while keeping the proven achievement/save/Steam logic unchanged.

### Final splash asset

- Replaced the initial generated splash artwork because its loading bar and progress dots were baked into the image and could falsely imply real progress.
- Regenerated and approved a clean transparent-edged artwork containing only the Sons of the Forest-inspired scene, application title and `ACHIEVEMENT TRACKER` identity.
- Added the approved image as `src/assets/splash.webp`, preserving alpha transparency.
- Runtime loading UI is now separate from the artwork.

### Real startup progress

- Added a thin HTML/CSS progress bar and live status line to `src/splash.html`.
- Added `src/splash-preload.js` and `src/splash.js` for isolated, context-safe splash status updates.
- Progress is stage-driven rather than a fixed animation:
  - startup;
  - save discovery;
  - selected-save reading;
  - Steam achievement-state reading;
  - achievement-guidance preparation;
  - dashboard preparation;
  - ready.
- The main renderer sends `ui:ready` only after the first dashboard load attempt has rendered, at which point the splash reaches 100% and closes.
- A 20-second fail-safe remains so a startup fault cannot leave the application permanently hidden.

### Electron window lifecycle

- Added a frameless, transparent, fixed-size splash `BrowserWindow`.
- The main application window starts hidden and is only shown after the first render is ready.
- The splash runs with context isolation, no Node integration and sandboxing enabled.

### Windows launcher behaviour

- Added `START-WINDOWS.vbs` as the fully silent normal launcher.
- Updated `START-WINDOWS.bat` so, once Electron is installed, it immediately hands off to the silent VBS launcher rather than running `npm start` in a visible terminal.
- First-time dependency installation remains visible in the BAT launcher so Node/npm/install failures are diagnosable.
- If the VBS launcher is used before dependencies exist, it falls back to the BAT setup route.

### Scope control

- No achievement definitions, Steam state reads, save parsing, counters, checklists, filters, guided-tour behaviour, achievement-card styling or other validated functionality was changed.

## v0.5.13 — Splash-to-main handoff reliability

### Issue observed

- v0.5.12 could show the splash successfully but fail to reveal the main application window afterwards.
- The startup flow relied primarily on a single renderer-to-main `ui:ready` IPC signal. If that signal was missed or failed, the completed dashboard could remain hidden.

### Fix

- Kept the renderer `ui:ready` signal as the preferred handoff path.
- Added a second, independent reveal path after the initial `dashboard:get` request has completed and the data has been returned to the renderer.
- The fallback waits briefly for the renderer to paint, then reveals the main window if the normal ready signal has not already done so.
- Added a `did-fail-load` safeguard so the splash cannot indefinitely conceal a main renderer load failure.
- Both reveal timers are cleaned up when the main window is successfully shown or the application exits.
- The `ui:ready` handler now verifies that the signal came from the actual main renderer before acting on it.

### Scope control

- No achievement definitions, Steam UserStats logic, save parsing, counters, checklist mappings, filters, guided-tour logic or achievement-card behaviour changed.
- This release changes only the Electron startup/window handoff plus version/documentation metadata.


## v0.6.0 — Production Windows packaging and splash-first startup

### Objective

Move the project from development-launcher use to a normal Windows executable/installer workflow and reduce the blank delay before the splash appears.

### Splash-first startup optimisation

- Removed save-reader, Steam-reader and achievement-evaluator imports from the main process startup path.
- Those heavier modules are now lazy-loaded only when the first dashboard request begins, after the splash window has already been created.
- The splash receives first-paint priority before the hidden main dashboard window is created.
- Added a 1.5-second damaged-splash fallback so prioritising the splash cannot block the application from starting.
- Kept the existing renderer-ready handoff and independent dashboard-complete reveal fallback from v0.5.13.
- Added single-instance handling so a second launch focuses the existing app instead of creating another tracker instance.
- Added the Windows AppUserModelID used by the packaged application.

### Windows packaging

- Added Electron Builder `26.15.7` as the pinned Windows packaging tool.
- Promoted the project to version `0.6.0` as the first production-packaging milestone.
- Added an NSIS x64 installer target.
- Added normal desktop and Start-menu shortcuts, selectable installation directory and per-user installation defaults.
- Packaging intentionally uses unpacked application resources (`asar: false`) so the proven PowerShell Steam helper remains a normal filesystem file; no Steam interop path changes were required.
- Added `build/icon.ico` and `build/icon.png` derived from the approved splash identity for Windows executable/window branding.
- Added `BUILD-WINDOWS.bat` as the one-step Windows build route.
- `dist/` is now excluded from source control together with `node_modules/` and generated ZIPs.

### Production startup model

The packaged app launches directly as `SOTF Achievement Tracker.exe`. The BAT/VBS/npm launch chain remains only for source/development operation and is not part of the installed user's startup path. This directly addresses the several-second pre-splash delay observed when launching through the development BAT route.

### Validation

- `src/main.js` passes Node syntax validation after the startup refactor.
- Package metadata parses correctly and retains Electron `43.1.1`.
- Build resources contain multi-resolution Windows ICO data plus a PNG runtime icon.
- Achievement definitions, save parsing, Steam UserStats logic, progress evaluators, UI content and guided-tour behaviour were not changed.

### Build-environment note

The current artifact environment cannot download/run the Windows Electron/NSIS toolchain, so the final NSIS binary itself must be generated on a Windows development machine by running `BUILD-WINDOWS.bat`. The project is fully configured for that build and requires no manual packaging edits.


## v0.6.1 — Windows build lock guard and deterministic builder invocation

### Issue observed

- Running `BUILD-WINDOWS.bat` while the source/development tracker was still open caused npm to fail with `EBUSY` while attempting to rename `node_modules\electron\dist\resources\default_app.asar`.
- Because dependency installation did not complete, `electron-builder` was absent and the subsequent build command failed with `'electron-builder' is not recognized`.
- The second error was downstream of the first; the packaging configuration itself had not yet run.

### Root cause

- The development tracker executes from the same `node_modules\electron` tree that npm needs to reconcile during dependency installation.
- Windows holds Electron runtime resources open while that development instance is running.

### Fix

- `BUILD-WINDOWS.bat` now performs an exclusive-file lock test against the project's Electron `default_app.asar` before npm is allowed to run.
- If the file is locked, the build stops immediately and instructs the user to close SOTF Achievement Tracker.
- The guard does not terminate Electron processes globally, avoiding disruption to unrelated Electron applications.
- Dependency installation is now limited to the pinned `electron-builder@26.15.7` package when the local builder is absent.
- The npm exit code is captured explicitly and packaging cannot continue after a failed dependency install.
- The script verifies `node_modules\electron-builder\out\cli\cli.js` exists after installation.
- Packaging invokes the local CLI directly with Node rather than relying on npm's executable PATH shim.

### Scope control

- No splash, achievement, Steam, save, counter, checklist, renderer or application-runtime behaviour changed.
- This release changes only the Windows developer packaging workflow plus version/documentation metadata.

## v0.6.2 — Branded NSIS installer and uninstaller

### Objective

Replace the stock assisted-NSIS presentation with a recognisable SOTF Achievement Tracker install/uninstall experience while retaining Electron Builder's proven installer mechanics.

### Installer presentation

- Added `build/installer.nsh` as the Electron Builder NSIS include.
- Applied the tracker dark-forest palette to Modern UI surfaces:
  - near-black primary background;
  - cold off-white text;
  - forest-charcoal directory/start-menu fields;
  - dark installation-details panel;
  - survival-green progress treatment where NSIS/Windows theme rendering permits it.
- Added a dedicated installer welcome page so branded presentation appears immediately rather than beginning on the install-mode page.
- Added project-specific installer title, welcome copy, finish copy, abort-warning copy and Phil Forster branding text.
- Configured the prepared 24-bit `installerHeader.bmp` and `installerSidebar.bmp` assets plus `installerIcon.ico`.
- Kept installation mode selection, directory selection, elevation, shortcut creation and payload handling under Electron Builder/NSIS rather than replacing those stable mechanics with a bespoke installer engine.

### Uninstaller presentation

- Configured dedicated `uninstallerIcon.ico`, `uninstallerSidebar.bmp` and `uninstallerHeader.bmp` assets.
- Added a matching branded uninstaller welcome page and finish-state copy.
- Uninstall messaging explicitly states that Sons of the Forest saves and Steam achievement data are not modified or deleted by removing the tracker.
- Added matching uninstaller exit-warning copy.

### Release output

- Changed the NSIS artifact name to `SOTF-Achievement-Tracker-Setup-v<version>.exe`.
- Updated `BUILD-WINDOWS.bat` to read the version from `package.json`, copy the completed installer into a root `RELEASE\` directory and open that directory after a successful build.
- The unpacked test build remains under `dist\win-unpacked`; the single Setup EXE in `RELEASE\` is the intended distributable file.
- Added `RELEASE/` to `.gitignore`.

### Cleanup

- Removed temporary installer/uninstaller preview PNGs used during asset preparation. Only build-required BMP/ICO assets remain.

### Scope control

- No achievement definitions, Steam state reads, save parsing, counters, checklists, renderer behaviour, splash behaviour or application UI logic changed in this release.
- Changes are restricted to Windows installer/uninstaller presentation, release-output workflow, package metadata and documentation.

## v0.6.3 — Dark native installer/uninstaller panes and explicit checkbox copy

### Objective

Bring the remaining native NSIS wizard surfaces into the same forest palette as the application and remove the ambiguous/unlabelled finish-page checkbox presentation observed during install testing.

### Installer/uninstaller colour pass

- Added a runtime NSIS colour pass for the native wizard window and common page controls using `SetCtlColors`; this supplements the existing MUI welcome/finish and installation-details colour definitions rather than replacing the NSIS controls.
- Main assisted-installer content uses the tracker palette:
  - forest-charcoal page surface `#171D19`;
  - near-black wizard chrome `#0B0E0D`;
  - elevated/control surface `#202721`;
  - cold off-white text `#E8ECE8`;
  - survival-green progress/accent `#7F9B63`.
- Added matching runtime colour functions for both installer and uninstaller namespaces.
- Wizard navigation controls retain native Windows behaviour/borders while receiving palette-compatible text/background treatment where the Windows theme permits it.
- Welcome, install-mode, installation-progress and finish surfaces are explicitly hooked into the colour pass; the existing branded header/sidebar BMPs and icons remain unchanged.
- Uninstaller welcome/install-mode/finish surfaces use the matching uninstaller colour functions and the existing dedicated uninstaller artwork.

### Checkbox clarification

- Added an explicit finish-page checkbox label: `Launch SOTF Achievement Tracker`.
- Recreated Electron Builder's normal finish-page launch function inside the supported `customFinishPage` hook so the checkbox can be labelled and styled without changing the actual post-install launch behaviour.

### Scope control

- No application runtime, splash, achievement definitions, Steam reads, save parsing, counters, checklist data, renderer behaviour or application UI changed.
- Electron Builder/NSIS still owns elevation, install mode, payload extraction, shortcuts, registry entries and uninstall mechanics.

## v0.6.4 — NSIS GUI-init build fix

### Build failure reproduced from v0.6.3

- Windows packaging reached the NSIS stage successfully, then `makensis.exe` aborted while building the uninstaller.
- Root error: `Function named ".onGUIInit" already exists.`
- The v0.6.3 branding include declared `.onGUIInit` and `un.onGUIInit` directly.
- NSIS Modern UI 2 also generates those functions when Electron Builder inserts its language macros, so both definitions collided at compile time.

### Corrective action

- Removed the custom `.onGUIInit` and `un.onGUIInit` function declarations.
- Registered the existing theme functions through Modern UI 2's supported hooks instead:
  - `MUI_CUSTOMFUNCTION_GUIINIT` → `SOTF_ThemeWizardChrome`
  - `MUI_CUSTOMFUNCTION_UNGUIINIT` → `un.SOTF_ThemeWizardChrome`
- Retained the existing page-level `MUI_PAGE_CUSTOMFUNCTION_SHOW` callbacks for the branded content panes.
- Kept the explicit `Launch SOTF Achievement Tracker` finish-page checkbox label.
- No installer mechanics, application code, achievement logic, Steam integration, save parsing, or application UI were changed.

### Validation

- Confirmed `build/installer.nsh` no longer declares `.onGUIInit` or `un.onGUIInit`.
- Confirmed both supported Modern UI GUI-init hook defines are present before Electron Builder's language insertion stage.
- Package version advanced to `0.6.4`.
- Windows NSIS compilation must still be executed on the target Windows build machine.

## v0.6.5 — NSIS split-pass dead-function build fix

### Build failure reproduced from v0.6.4

- Windows packaging reached the NSIS uninstaller compilation stage.
- `makensis.exe` emitted warning 6010: install function `SOTF_ThemeCurrentPage` was not referenced.
- Electron Builder treats NSIS warnings as fatal, so the otherwise non-fatal dead-code warning aborted the build.
- Root cause: Electron Builder compiles installer and uninstaller as separate NSIS passes, while the branding include defined both install-namespace and `un.` namespace theme functions in both passes.

### Corrective action

- Split the theme helper declarations with `BUILD_UNINSTALLER`.
- The installer pass now contains only `SOTF_ThemeWizardChrome` and `SOTF_ThemeCurrentPage`.
- The uninstaller pass now contains only `un.SOTF_ThemeWizardChrome` and `un.SOTF_ThemeCurrentPage`.
- Registered only the matching Modern UI GUI-init hook in each pass.
- Retained the dark forest installer/uninstaller pane styling, branded artwork, explicit `Launch SOTF Achievement Tracker` finish checkbox label and existing install/uninstall mechanics.

### Scope control

- No application runtime, splash, achievement definitions, Steam reads, save parsing, counters, checklist data, renderer behaviour or application UI changed.
- Package version advanced to `0.6.5`.
- Final NSIS compilation remains a Windows-only validation step and should be rerun with `BUILD-WINDOWS.bat`.

## v0.6.6 — NSIS finish-page plugin-order build fix

### Build failure reproduced from v0.6.5

- Windows packaging successfully generated and signed the temporary uninstaller, then failed while compiling the final installer.
- Root error: `Plugin not found, cannot call StdUtils::TestParameter`.
- The custom `SOTF_StartApp` function in `build/installer.nsh` duplicated Electron Builder's finish-page launch logic and referenced `${isUpdated}` / `StdUtils` while the custom include was being parsed.
- Electron Builder adds the required custom NSIS plugin path later in its generated installer script, so calling those helpers from the early include was invalid.

### Corrective action

- Removed the custom `SOTF_StartApp` function entirely.
- Removed the custom `customFinishPage` override.
- Restored Electron Builder's own assisted-installer finish page and native `StartApp` implementation, including its update detection and `StdUtils.ExecShellAsUser` handling.
- Retained `MUI_FINISHPAGE_RUN_TEXT` so the checkbox remains explicitly labelled `Launch SOTF Achievement Tracker`.
- Retained the dark forest MUI palette, installer/uninstaller artwork, page colour hooks, custom welcome pages and read-only safety copy.
- The custom NSIS include no longer contains `${isUpdated}`, `StdUtils::` or a duplicate finish-page launch implementation.

### Scope control

- No application runtime, splash, achievement definitions, Steam reads, save parsing, counters, checklist data, renderer behaviour or application UI changed.
- Package version advanced to `0.6.6`.
- Windows NSIS compilation remains the final target-machine validation step via `BUILD-WINDOWS.bat`.

## v0.6.7 — Installer/uninstaller native-control visual refinement

### Objective

Refine the now-working branded NSIS installer/uninstaller so the remaining native Windows controls no longer clash with the tracker palette. The v0.6.6 installer successfully compiled and ran, but testing showed black radio-button text on a dark page, a light native title bar, pale navigation buttons and a light branding/footer strip.

### Native title bar

- Added a DWM dark-title-bar request for both installer and uninstaller through `DwmSetWindowAttribute`.
- Uses attribute 20 first with attribute 19 as a compatibility fallback.
- This keeps the standard Windows title bar, caption buttons and drag behaviour rather than replacing them with a custom window frame.

### Wizard chrome and controls

- Reworked the runtime theme pass to enumerate actual child controls by Win32 class instead of relying on a narrow numeric control-ID range.
- Header/footer `Static` controls, including the NSIS branding strip, now receive cold off-white text on the near-black forest surface.
- Back / Next / Cancel controls now receive the dark elevated surface and light text treatment.
- The stock Windows visual theme is disabled only on the NSIS Button controls so the requested colours can be honoured while preserving normal button behaviour.
- Reapplies wizard-chrome styling after native page creation because Modern UI can recreate header/footer controls between pages.

### Page content

- Native page `Static` controls now receive light text on the forest-charcoal content surface. This specifically addresses the black `Anyone who uses this computer` / `Only for me` labels observed on the install-mode page.
- Native page `Button` controls cover radio buttons, checkboxes and page-local buttons using the same light-on-dark palette.
- Directory/edit fields use the deeper inset field surface with light text.
- List/detail controls are explicitly themed so installation and uninstallation progress/detail text cannot fall back to a light Windows surface.
- Progress bars are explicitly normalised to the survival-green accent over the dark track surface.
- Equivalent functions are maintained separately for installer and uninstaller compilation passes to preserve the split-pass build fix established in v0.6.5.

### Full installer/uninstaller pane audit

The presentation pass was checked against every page Electron Builder's assisted NSIS flow can expose in this configuration:

- installer welcome;
- install-for-all-users / current-user selector;
- installation directory selector;
- installation progress/details;
- installer finish page, including the labelled `Launch SOTF Achievement Tracker` checkbox;
- uninstaller welcome;
- uninstall install-mode selector when applicable;
- uninstall progress/details;
- uninstaller finish page;
- shared header artwork/title copy;
- shared footer/branding strip;
- Back / Next / Install / Finish / Cancel navigation controls;
- native Windows title bar/caption controls.

A lightweight NSIS timer now reapplies the palette every 120 ms while the wizard is open. This is deliberate: the assisted installer creates some pages outside the normal MUI page macros and recreates header/footer controls during navigation. The timer means newly-created controls are styled without replacing Electron Builder's page lifecycle or install mechanics.

### Safety / scope

- No Electron Builder install mechanics, elevation logic, shortcuts, registry handling, payload extraction or uninstall behaviour were replaced.
- No application runtime, Steam integration, save parsing, achievement logic, counters, checklist data, splash behaviour or tracker UI changed.
- The custom NSIS include continues to avoid `${isUpdated}`, `StdUtils`, direct `.onGUIInit` declarations and cross-pass dead functions that caused the earlier packaging failures.
- Package version advanced to `0.6.7`.



## v0.6.8 — Native dark-control coherence pass

### Problem observed after v0.6.7

- The installer/uninstaller compiled and ran, but the centre controls still looked like system controls painted over a dark background.
- v0.6.7 explicitly removed the Windows visual theme from Button-class controls before applying custom colours. This improved text contrast but left push buttons, radio buttons and checkboxes with a classic/native mismatch.

### Corrective action

- Replaced the visual-theme removal with Windows' `DarkMode_Explorer` control theme.
- Applied the dark visual style to the wizard parent, current page dialog, navigation buttons, radio buttons, checkboxes, edit fields, list/detail controls and rich-edit areas.
- Sends `WM_THEMECHANGED` after each theme assignment so already-created controls repaint immediately.
- Retained the explicit forest-charcoal backgrounds, cold off-white text, deep inset fields and survival-green progress treatment.
- Retained the DWM dark-caption request and the 120 ms page-retheme safety pass for controls created during navigation.

### Scope / safety

- No install/uninstall mechanics, elevation, payload handling, registry logic, shortcuts or file removal behaviour changed.
- No application runtime, Steam integration, save parsing, achievement logic, splash or tracker UI changed.
- Package version advanced to `0.6.8`.
- Windows NSIS compilation and visual verification remain target-machine checks via `BUILD-WINDOWS.bat`.


## v0.6.9 — Deterministic Steam counter mapping

### Reported defect

`COLLECTOR` and `I LIKE BLISTERS` displayed numeric values, but those values did not change after a Drogue Watch pickup or shovel dig. `1%` continued to change correctly, proving that manual Steam refresh and the general local UserStats read were working.

The fault was isolated to stat association. v0.6.8 flattened printable strings from `UserGameStatsSchema_1326470.bin` and primarily inferred a counter from byte proximity. A nearby, valid Steam statistic could therefore be selected even when it was not the statistic backing that achievement. Re-reading that unrelated statistic returned a consistent but non-updating number.

### Correction

- Added a bounded, read-only binary Valve KeyValues parser for Steam's local UserStats schema.
- The parser retains the schema's nested object structure and identifies the successfully readable Steam statistic stored inside each achievement definition.
- Explicit schema-structure matches now take precedence over the legacy proximity and semantic-name fallbacks.
- `COLLECTOR` and `I LIKE BLISTERS` are prohibited from using the unproven proximity fallback. If Steam's schema does not provide a deterministic association, the UI reports that the lifetime counter is unavailable rather than showing a misleading static value.
- Preserved Steam as the only authority for top-level `LOCKED` / `UNLOCKED` state.
- Preserved the read-only boundary: the schema, UserStats, game files and saves are never modified.

### Verification

- Added Node regression coverage using representative binary KeyValues achievement blocks.
- Confirmed that `ACH_COLLECT_WATCHES` maps only to its own watch-pickup stat.
- Confirmed that the digging achievement maps only to its own dig-count stat.
- Confirmed that a sibling achievement's statistic cannot be selected.
- Confirmed that malformed/truncated schema data fails safely.
- Full JavaScript syntax checks and the existing source validation are run before packaging.