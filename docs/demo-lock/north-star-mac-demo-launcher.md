# North Star Mac Demo Launcher

North Star is installed as a **web app (PWA)** — standalone window, North Star icon, starts at `/constellation`. No native wrapper (no Tauri/Electron/Swift) before the demo.

## Demo URL
Production alias (serves `main` once Demo RC2 is merged):
**https://north-star-red.vercel.app/constellation**

Current RC2 candidate preview (branch `demo/constellation-intro-rc2`):
https://north-star-b11abohhj-scr1bes.vercel.app/constellation
(each new push creates a new preview URL; install from the final URL you will present from)

## Safari
1. Open the constellation URL.
2. Share button → **Add to Dock**.
3. Name: **North Star**.
4. Confirm the North Star icon appears.
5. Launch from the Dock before the presentation (do a full Enter → expand → collapse run).

## Chrome
1. Open the constellation URL.
2. Menu (⋮) → **Cast, save, and share** → **Install page as app**.
3. Name: **North Star**.
4. Launch from the Dock / Chrome Apps (`chrome://apps`).

## Expected opening
Dock icon → standalone window → large icon splash → fades to centered *Prentiss / Frontier Operator* → **Enter** (or click the center node) → graph expands.
Clicking the center node on the expanded graph collapses it back to the intro frame.

## Fallback
If the installed app misbehaves, open the same URL directly in Chrome (`?skipIntro=1` bypasses the intro).

## Known caveats
- Reset may not fully undo orbit rotation / zoom. Avoid relying on Reset in the live script; refresh the route if needed.
- The installed app caches its icon at install time. To pick up new icons, remove the app from the Dock and reinstall.
- Install from the **final** URL; an app installed from a preview URL points at that preview deployment.
