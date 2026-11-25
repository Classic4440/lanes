# Changelog

## 2026-11-25 — Handshake verified live + worker name
- End-to-end NoteLab → Lanes MIDI handshake is **verified live** (mobile): `NOTELAB_HELLO` / `LANES_READY` / compressed `NOTELAB_DATA` loaded Melody, Chords, Bass, and Drums.
- Cloudflare Worker name in `vite.config.ts` changed from `cam-audio-anylizer` to **`lanes`** so CI matches the deployed worker (`lanes.uwon.workers.dev`).
- Documented required handshake env vars in `docs/SYSTEM_MAP.md`.

## 2026-11-25 — shadcn missing dep
- Added **`class-variance-authority@^0.7.1`** (used by `src/components/ui/button.tsx` and `badge.tsx`).
- Verified already present: `clsx`, `tailwind-merge`, `@radix-ui/*`, `lucide-react`, `sonner`, `cmdk`, `vaul`.

## 2026-11-25 — TanStack Start + Vite 8 + Nitro (build unblock)
- **Added** `@tanstack/react-start@^1.169.7`.
- Bumped `@tanstack/react-router` → `^1.170.46`.
- **Vite** → **`^8.3.8`**. **`@vitejs/plugin-react`** → `^6.3.0`.
- **nitro** → **`3.0.261103-rc`** (`nitro@3.0.1` does not exist on npm).
- **No `package-lock.json`** — Cloudflare runs a fresh `npm install`.

## 2026-11-25 — Full dependency audit (stable install)
- Pinned every `@radix-ui/*` package to a published npm version.
- Kept `lz-string@^1.5.0` for the NoteLab postMessage handshake.
