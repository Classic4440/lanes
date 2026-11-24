# CAM Collective — System Map

**Last updated:** 2026-11-24

Single source of truth for how the main CAM surfaces relate.

## The three surfaces

| Repo | Visibility | Role | Primary user |
|------|------------|------|--------------|
| **camleinad-public** | Public (currently archived) | Artist website — music, releases, journal, player, socials | Fans + public |
| **lanes** (this repo, formerly cam-audio-anylizer) | Public tool | Local-first studio: deep analysis (BPM / key / chords / stems / MIDI), timeline arrangement, AudioMass editor | Cam / producers |
| **camOS** | Private (Owner Lock) | Personal operating desk — tasks, ledger, vault, lab, brand shop, music workspace, codes | Cam only |

## Intended workflow

1. **Create & analyse** in **lanes** (or a future NoteLab-style creation workspace).
2. **Manage** releases, tasks, brand assets and vault inside **camOS**.
3. **Publish / present** on **camleinad** (artwork, audio, streaming links, journal).

## Current integration reality

- Shared Supabase + Cloudflare configuration exists across the ecosystem.
- lanes is strongly local-first (IndexedDB projects, no forced upload).
- camOS Music workspace is the natural bridge between private work and the public site.
- camleinad-public is currently **archived** → any live public site work needs either un-archiving or a new public repo.

## Security rules

- Never commit `.env` or real secrets.
- Public repos only contain public/anon config.
- camOS stays single-owner behind Owner Lock.

## What this pass did (2026-11-24)

- Created this System Map.
- Expanded lanes README to show its place in the collective.
- Documented next integration priorities.

## Next priorities

1. Un-archive or replace `camleinad-public` so the public face can receive updates again.
2. Concrete hand-off path: lanes project / stems / MIDI / mix → camOS release pipeline → camleinad.
3. camOS Music workspace able to control what is live on the public site.
4. Shared brand / OG tokens where public + desk both need them.
5. Any remaining “Send to Lanes” style deep links from other tools.

Update this file on every meaningful change to roles or integration points.
