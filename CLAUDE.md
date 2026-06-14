# Claude instructions

This is a conservative split of an existing single-file canvas game. Do not rewrite the whole game at once.

## Project structure

- `index.html`: DOM structure and script loading only.
- `style.css`: all styling.
- `src/main.js`: shared constants, input, UI helpers, FX helpers, central update loop, boot.
- `src/player.js`: player combat, damage, death, attacks, and player-related combat helpers.
- `src/enemies.js`: enemy definitions, spawning, boss logic.
- `src/waves.js`: arena constants/decor generation and run setup.
- `src/rendering.js`: all canvas drawing and HUD rendering.
- `src/upgrades.js`: talents, level-up cards, and upgrade logic.
- `src/characters.js`: character definitions (CHARACTERS array), selectedChar state, character select UI and animated previews.
- `src/skeleton.js`: Skeleton (Death Knight) ability update (updateSkeletonAbilities), player init hook (skeletonInitPlayer). Drawing stays in rendering.js.
- `src/warlock.js`: Warlock drawing (drawWarlock), all warlock abilities, updateWarlockAbilities(dt), drawPlayerBolts(), warlockInitPlayer(p,cdr).
- `src/stickman.js`: One Punch (Stickman) — stickmanInitPlayer(p,cdr), updateStickmanAbilities(dt), drawStickman(p), and _previewStickman(c,t) for the character-select preview. Bound abilities: LMB Fists of Fury (frontal-cone flurry: 25% base dmg, 3 ticks/s for 3s, then 1.5s recovery) and SPACE Speed Burst (custom dash via p.burst, with motion-blur ghosts + brief i-frames). Q/E/R are intentionally unbound for now. Tuning lives in the STICK constant.
- `src/events.js`: In-run event system (EVENTS array, queueEvent, updateEvents). Scaffold for horde/elite/darkness events.
- `src/run-logger.js`: Run telemetry and pause-screen "Details" view. Tracks damage done/taken, kills, level ups, powerup/item choices, and posts completed runs to `server.js` when available.
- `server.js`: Optional local static server plus `/api/run-log` file persistence into `run-database/<player>/<map>/<date_wave_result>/`.

Adding a new character:
  1. Create `src/yourchar.js` with updateYourCharAbilities(dt), yourCharInitPlayer(p,cdr), drawYourChar(p)
  2. Add entry to CHARACTERS array in characters.js
  3. Add ability dispatch in main.js update() and drawPlayer() in rendering.js
  4. Add abilityInfo to CHARACTERS entry for HUD tooltips

## Working rules

1. Make small changes.
2. Preserve current behavior unless explicitly asked to change it.
3. Prefer adding new systems in separate functions/data arrays.
4. **New .js files are welcome** — if a new system is large enough or logically separate (e.g. `src/vfx.js`, `src/enchants.js`, `src/pets.js`), create it and add a `<script defer>` tag in `index.html`. Update this file with the new module's purpose.
5. Do not convert to a framework unless asked.
6. If refactoring, do it one system at a time.
7. Test in browser after each meaningful change.

## Important

The files currently use shared global scope intentionally. Do not convert to ES modules until the game is confirmed working after the split.
