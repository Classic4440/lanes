# Lanes

**Local-first audio studio + deep analysis**  
(formerly `cam-audio-anylizer`)

Part of the **CAM collective** alongside camleinad (public artist site) and camOS (private owner desk).

- **Live / deploy:** Cloudflare Workers (Worker name pinned to `cam-audio-anylizer`)
- **Repo:** https://github.com/Classic4440/lanes

---

## Role in the collective

| Surface | Role |
|---------|------|
| **lanes** (this) | Create, analyse, arrange, stem-separate, export MIDI / mix |
| **camOS** | Private desk — manage releases, tasks, brand, vault |
| **camleinad** | Public face — present music, journal, streaming links |

Full map, data flows and priorities → **[docs/SYSTEM_MAP.md](docs/SYSTEM_MAP.md)**

---

## Studio + AudioMass editor

Top bar switches between:

- **Studio** — analysis + arrangement timeline
- **Editor** — [AudioMass](https://github.com/pkalogiros/audiomass) (MIT) embedded from `public/audiomass/`

Flows:

- Studio → Editor: **Edit mix** bounces the mix and opens it in the editor
- Editor → Studio: **Analyse in Studio** (new project) or **Add as track** (open project)

Code: `src/components/editor/`, `src/components/app-nav.tsx`, `src/lib/editor/`.  
See `public/audiomass/LANES-NOTES.md` for changes to the vendored copy.

Deeper design and capability notes → **[docs/LANES-V2.md](docs/LANES-V2.md)** and **[docs/TEMPO-NOTES.md](docs/TEMPO-NOTES.md)**

---

## Key capabilities (v2)

- Projects saved in browser IndexedDB (original audio + analysis + waveform cache)
- Timeline with clips, mute/solo, volume/pan, snap, undo/redo
- High-accuracy analysis (tempo, key, chords, downbeats, drums, bass, sections) in a Web Worker
- Model-free stem separation (drums / bass / vocals / other)
- Convert detections → editable MIDI tracks
- Export: mix WAV, per-track WAVs, selected clips, `.mid`, project file

---

## Deploy (Cloudflare)

```bash
npm ci
npm run deploy:cf
```

Or in Cloudflare Workers Builds: build `npm run build:cf`, deploy `npx wrangler deploy --config .output/server/wrangler.json`.

---

## Testing

```bash
npm test
npx tsc --noEmit
node --experimental-strip-types scripts/analyze-file.ts song.mp3
```

---

## Changelog (2026-11-24)

- Added `docs/SYSTEM_MAP.md` — collective architecture and integration priorities
- Expanded this README to show lanes’ place in the CAM ecosystem and link the System Map
- Confirmed no committed `.env` in this repo
