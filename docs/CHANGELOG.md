# Changelog

## 2026-11-25 — Full dependency audit (stable install)
- Pinned **every** `@radix-ui/*` package to a version that exists on the npm registry (was causing `ETARGET` on Cloudflare `npm clean-install`).
- Notable pins (published latest at audit time):
  - `react-dropdown-menu` / `react-context-menu` → `^2.2.1` / `^2.4.1`
  - `react-dialog` / `react-accordion` / `react-popover` → `^1.3.1`
  - `react-select` → `^2.4.1`, `react-slot` → `^1.5.0`, `react-tooltip` → `^1.4.1`
  - Full list in `package.json`
- Kept `lz-string@^1.5.0` (NoteLab postMessage handshake).
- Safe bumps: `lucide-react` → `^0.577.0`, `cmdk` → `^1.1.1`.
- **Not** upgraded (would need code migration): Vite 7→8, React already on 19, TypeScript 5, Nitro left on current alpha used by Vite config.

## 2026-11-25 — Cloudflare clean-install fix
- Fixed `npm error code ETARGET` for `@radix-ui/react-dropdown-menu@^2.2.15`.
- Confirmed `lz-string@^1.5.0` is a direct dependency.
- Worker name in Vite/Nitro config remains `cam-audio-anylizer`; GitHub source repo is **Classic4440/lanes**.
