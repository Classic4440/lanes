# Changelog

## 2026-11-25 — shadcn missing dep
- Added **`class-variance-authority@^0.7.1`** (used by `src/components/ui/button.tsx` and `badge.tsx`).
- Verified already present: `clsx`, `tailwind-merge`, `@radix-ui/*`, `lucide-react`, `sonner`, `cmdk`, `vaul`.

## 2026-11-25 — TanStack Start + Vite 8 + Nitro (build unblock)
- **Added** `@tanstack/react-start@^1.169.7` (was missing → `Cannot find package '@tanstack/react-start'`).
- Bumped `@tanstack/react-router` → `^1.170.46`.
- **Vite** `^7.1.7` → **`^8.3.8`** (required peer of react-start ≥1.169).
- **`@vitejs/plugin-react`** → `^6.3.0` (Vite 8 compatible).
- **nitro**: `3.0.0` → **`3.0.261103-rc`**. Note: exact `nitro@3.0.1` does **not** exist on npm (only `3.0.1-alpha.*`); `3.0.0` declares peer `vite@^7` which conflicts with Start 1.169. Latest RC has no vite peer pin and includes `nitro/vite`.
- `vite.config.ts` already used the official imports (`@tanstack/react-start/plugin/vite`, `nitro/vite`); left custom plugins (PWA, auth popup, pglite bootstrap) in place.
- **No `package-lock.json`** — Cloudflare should run fresh `npm install`.

## 2026-11-25 — Nitro + lockfile (Cloudflare install)
- Replaced non-existent `nitro@^3.0.1-alpha.27` with published **`nitro@3.0.0`** (later superseded by RC above).
- **Deleted `package-lock.json`** so Cloudflare runs `npm install` instead of `npm ci` against a stale lockfile.
- `lz-string` and all `@radix-ui/*` pins remain on published versions.

## 2026-11-25 — Full dependency audit (stable install)
- Pinned every `@radix-ui/*` package to a version that exists on the npm registry.
- Kept `lz-string@^1.5.0` for the NoteLab postMessage handshake.
- Safe bumps: `lucide-react` → `^0.577.0`, `cmdk` → `^1.1.1`.
- Held: TypeScript 5, React 19 already in use.

## 2026-11-25 — Cloudflare clean-install fix
- Fixed `ETARGET` for `@radix-ui/react-dropdown-menu@^2.2.15`.
- Worker name remains `cam-audio-anylizer`; source repo is **Classic4440/lanes**.
