# Changelog

## 2026-11-25 — Nitro + lockfile (Cloudflare install)
- Replaced non-existent `nitro@^3.0.1-alpha.27` with published **`nitro@3.0.0`** (provides `nitro/vite` used by `vite.config.ts` for Cloudflare Workers builds).
- **Deleted `package-lock.json`** so Cloudflare runs `npm install` instead of `npm ci` against a stale lockfile.
- `lz-string` and all `@radix-ui/*` pins remain on published versions.

## 2026-11-25 — Full dependency audit (stable install)
- Pinned every `@radix-ui/*` package to a version that exists on the npm registry.
- Kept `lz-string@^1.5.0` for the NoteLab postMessage handshake.
- Safe bumps: `lucide-react` → `^0.577.0`, `cmdk` → `^1.1.1`.
- Held: Vite 7→8, TypeScript 5, React 19 already in use.

## 2026-11-25 — Cloudflare clean-install fix
- Fixed `ETARGET` for `@radix-ui/react-dropdown-menu@^2.2.15`.
- Worker name remains `cam-audio-anylizer`; source repo is **Classic4440/lanes**.
