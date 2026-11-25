# CAM Ecosystem — System Map

**Last updated:** 2026-11-25  
**Canonical copy lives in NoteLab2:** https://github.com/Classic4440/NoteLab2/blob/main/docs/SYSTEM_MAP.md

This is a mirror for convenience inside the lanes repo.

## The Four Repos

| Repo | Visibility | Role |
|------|------------|------|
| **NoteLab2** | Private | Creation + Learning workspace (FL Studio focused) |
| **lanes** (this) | Public | Deep audio analysis + editable multi-track studio |
| **camleinad** | Private | Public artist website & brand presence |
| **camOS** | Public | Private owner desk (tasks, ledger, vault, lab, brand, music) |

> `camleinad-public` is archived. **Do not use it.** Active public-site work is in the private `camleinad` repo.

## Intended Flow

```
NoteLab2 (create / learn / generate)
    ↓  "Send to Lanes" (postMessage + lz-string; SMF preferred)
lanes (analyse / edit / stems / MIDI / bounce)
    ↓  hand-off
camOS Music workspace (manage release)
    ↓  publish
camleinad (public artist site)
```

## Handshake environment variables (required)

Set these in Cloudflare (and local `.env`) or the postMessage origin check fails.

| App | Variable | Value |
|-----|----------|--------|
| NoteLab2 | `VITE_LANES_URL` | `https://lanes.uwon.workers.dev` |
| lanes | `VITE_NOTELAB_URL` | `https://notelab2.uwon.workers.dev` |

Worker name in Nitro (`vite.config.ts` → `cloudflare.wrangler.name`) is **`lanes`**.

## Status (2026-11-25)

- Send to Lanes MIDI handshake verified live on mobile (all tracks).
- Vite 8 + TanStack Start 1.169 + Nitro RC build path is the current lanes stack.
- `lz-string` is required for the NoteLab payload.

See the full document in NoteLab2 for security rules and Supabase notes.
