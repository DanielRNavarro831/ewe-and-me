# Ewe and Me

A cozy pixel-art fiber farm and yarn shop, made for Madhu. The full design is in
`Madhu's Fiber Shop — Game Design Document.pdf`.

The game is a web app built with Phaser 3, TypeScript and Vite. It installs from Chrome on the Pixel and
runs full-screen and offline, like a normal app.

## Milestones

- [x] **M0 – Foundation:** PWA install, pixel-perfect scaling, tab bar, save/load with backup codes, clock and lighting, palette, code-drawn sprites with art overrides
- [ ] M1 – Ranch
- [ ] M2 – Workshop
- [ ] M3 – Shop
- [ ] M4 – Dye Studio
- [ ] M5 – Village
- [ ] M6 – Progression
- [ ] M7 – Polish

## Everyday commands

You need [Node.js](https://nodejs.org) 20 or newer (already installed on this PC).

| What | Command |
| --- | --- |
| Install packages (first time, or after pulling changes) | `npm install` |
| Play on this computer while developing | `npm run dev`, then open http://localhost:5173 |
| Check for errors and build the release | `npm run build` |
| Regenerate the app icons | `npm run icons` |

**Testing on the Pixel while developing:** with `npm run dev` running, the terminal prints a
`Network:` address such as `http://192.168.1.20:5173`. Open that in Chrome on the Pixel (same
Wi-Fi). It plays, but it can't be *installed* from there, because installing requires the HTTPS
address from hosting (below).

## Hosting and installing (GitHub Pages)

Every push to the `main` branch builds the game and publishes it with
`.github/workflows/deploy.yml`. The site address will be
`https://<your-github-name>.github.io/<repo-name>/`.

**One-time setup:**

1. Create the GitHub repository and push: `gh repo create ewe-and-me --private --source . --push`
   (a private repo is fine; the *site* is still reachable by anyone with the link).
2. On GitHub, open the repo → **Settings → Pages** → under *Build and deployment*, set **Source** to
   **GitHub Actions**.
3. Open the **Actions** tab and wait for the green check (about a minute).

> Private repositories need a paid GitHub plan for Pages. If yours is free, create the repo as
> `--public` instead; nothing secret lives in the code.

**After that, deploying is one command:** `git push`

**Installing on the Pixel:** open the site address in Chrome → ⋮ menu → **Add to home screen** →
**Install**. It then opens full-screen from the home screen and works offline. The game also offers
an **Install on this phone** button in Settings when Chrome allows it.

**Updates:** the installed app updates itself the next time it's opened online. Before each
update, open **Settings → Backup → Export backup** and keep the code somewhere safe.

## Saves

- The game autosaves after every change, every 30 seconds, and whenever the app is closed or hidden.
- Saves live in the phone's browser storage (IndexedDB). The previous save is always kept as a spare.
- **Settings → Backup** exports a copyable code or a downloadable file, and imports either one.
- The save format is versioned. To change it: bump `SAVE_VERSION` in `src/systems/state.ts` and add
  a migration in `MIGRATIONS`, so older saves upgrade automatically.

## Replacing art and sound

Every sprite and sound has a placeholder made in code. To replace one, drop a file with the
matching key into `public/assets/` and redeploy; no code changes are needed.

| Kind | Where | Format |
| --- | --- | --- |
| Sprites | `public/assets/sprites/<key>.png` | Horizontal strip of equal frames (e.g. 4 frames of 16×24 = 64×24 px) |
| Sound effects | `public/assets/audio/sfx/<key>.mp3` | |
| Music | `public/assets/audio/music/<key>.mp3` | 1.5 to 3 minute loops |

All keys, sizes and ready-made Gemini/Suno prompts are listed in `src/data/assets.ts`, and in the
game under **Settings → Developer tools → Asset checklist**, which also shows what's still a
placeholder. (The `npm run pixelize` helper that cleans up Gemini images arrives in M7.)

## Developer tools

**Settings → Developer tools** can fast-forward the game clock (+1 hour, +4 hours, +1 day) to test
growth and daily events, and reset it.

## Project layout

```
src/
  main.ts        game setup, scaling, scene switching
  game.ts        live game state + autosave + resume-from-away
  layout.ts      whole-number pixel scaling
  scenes/        Boot and the six rooms
  systems/       clock, save, state (+ migrations), assets, audio
  data/          content files (assets manifest now; breeds, dyes, neighbors… in later milestones)
  art/           palette and code-drawn pixel maps
  ui/            top bar, tab bar, settings, modal sheets
public/assets/   art and audio overrides, by key
tools/           helper scripts
```
