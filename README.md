# GRUKK — Arena Survivors Modular Split

This version keeps the original game behavior as intact as possible, but splits the single HTML file into separate working files.

## Files

```txt
index.html
style.css
src/main.js
src/player.js
src/enemies.js
src/waves.js
src/rendering.js
src/upgrades.js
```

## How to run

Open `index.html` directly in a browser, or use VS Code Live Server.

For persistent run logs on disk, start the local server instead:

```txt
node server.js
```

On Windows you can also double-click:

```txt
start-server.bat
```

Then open `http://localhost:4173`. Completed, failed, or abandoned runs are written to:

```txt
run-database/<player>/<map>/<date_wave_result>/
```

Each run folder contains `run.json`, CSV exports, and an `overview.html`. The run index is available at `http://localhost:4173/logs`.

## Notes

This is a conservative split, not a full architecture rewrite. The files still share global state to preserve behavior. A later refactor can convert this to ES modules/classes after the split is confirmed working.
