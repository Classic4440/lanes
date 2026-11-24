import { newId } from "./ids.ts";
import type { EventClip, Project, Track } from "./types.ts";
import { blankProject } from "./factory.ts";

/** Minimal Standard MIDI File (type 0/1) reader → Lanes Project with MIDI tracks. */

function readVarLen(bytes: Uint8Array, offset: { i: number }): number {
  let value = 0;
  for (;;) {
    const b = bytes[offset.i++]!;
    value = (value << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) break;
    if (offset.i >= bytes.length) break;
  }
  return value;
}

function readStr(bytes: Uint8Array, start: number, len: number): string {
  return new TextDecoder().decode(bytes.subarray(start, start + len));
}

interface ParsedNote {
  startTick: number;
  endTick: number;
  pitch: number;
  velocity: number;
  channel: number;
}

interface ParsedTrack {
  name: string;
  notes: ParsedNote[];
  isDrum: boolean;
}

export interface MidiImportResult {
  project: Project;
  trackCount: number;
  noteCount: number;
}

export function parseMidiToProject(data: Uint8Array, fileName = "MIDI Import"): MidiImportResult {
  if (data.length < 14 || readStr(data, 0, 4) !== "MThd") {
    throw new Error("Not a Standard MIDI File (.mid).");
  }
  const headerLen = (data[4]! << 24) | (data[5]! << 16) | (data[6]! << 8) | data[7]!;
  const format = (data[8]! << 8) | data[9]!;
  const ntrks = (data[10]! << 8) | data[11]!;
  const division = (data[12]! << 8) | data[13]!;
  if (division & 0x8000) {
    throw new Error("SMPTE MIDI timing is not supported yet.");
  }
  const ppq = division || 480;

  let offset = 8 + headerLen;
  let tempoUsPerQuarter = 500_000; // default 120 BPM
  const parsedTracks: ParsedTrack[] = [];

  for (let t = 0; t < ntrks && offset + 8 <= data.length; t++) {
    if (readStr(data, offset, 4) !== "MTrk") break;
    const trackLen =
      (data[offset + 4]! << 24) |
      (data[offset + 5]! << 16) |
      (data[offset + 6]! << 8) |
      data[offset + 7]!;
    const trackStart = offset + 8;
    const trackEnd = trackStart + trackLen;
    offset = trackEnd;

    const o = { i: trackStart };
    let tick = 0;
    let runningStatus = 0;
    let trackName = `Track ${t + 1}`;
    const active = new Map<string, { startTick: number; velocity: number; pitch: number; channel: number }>();
    const notes: ParsedNote[] = [];
    let sawChannel9 = false;

    while (o.i < trackEnd) {
      const delta = readVarLen(data, o);
      tick += delta;
      if (o.i >= trackEnd) break;
      let status = data[o.i]!;
      if (status < 0x80) {
        status = runningStatus;
      } else {
        o.i++;
        runningStatus = status;
      }

      if (status === 0xff) {
        const meta = data[o.i++]!;
        const len = readVarLen(data, o);
        if (meta === 0x51 && len === 3) {
          tempoUsPerQuarter =
            (data[o.i]! << 16) | (data[o.i + 1]! << 8) | data[o.i + 2]!;
        } else if (meta === 0x03) {
          trackName = readStr(data, o.i, len) || trackName;
        }
        o.i += len;
        continue;
      }
      if (status >= 0xf0) {
        // sys-ex / other
        if (status === 0xf0 || status === 0xf7) {
          const len = readVarLen(data, o);
          o.i += len;
        }
        continue;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;
      if (channel === 9) sawChannel9 = true;

      if (eventType === 0x90 || eventType === 0x80) {
        const pitch = data[o.i++]!;
        const vel = data[o.i++]!;
        const key = `${channel}:${pitch}`;
        if (eventType === 0x90 && vel > 0) {
          active.set(key, { startTick: tick, velocity: vel, pitch, channel });
        } else {
          const on = active.get(key);
          if (on) {
            notes.push({
              startTick: on.startTick,
              endTick: Math.max(on.startTick + 1, tick),
              pitch: on.pitch,
              velocity: on.velocity,
              channel: on.channel,
            });
            active.delete(key);
          }
        }
      } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        o.i += 2;
      } else if (eventType === 0xc0 || eventType === 0xd0) {
        o.i += 1;
      }
    }

    // Close hanging notes
    for (const on of active.values()) {
      notes.push({
        startTick: on.startTick,
        endTick: on.startTick + ppq,
        pitch: on.pitch,
        velocity: on.velocity,
        channel: on.channel,
      });
    }

    if (notes.length || t === 0) {
      parsedTracks.push({
        name: trackName,
        notes,
        isDrum: sawChannel9 || /drum|kick|snare|hat|perc/i.test(trackName),
      });
    }
  }

  void format; // type 0/1 both handled

  const bpm = Math.max(20, Math.min(300, Math.round(60_000_000 / tempoUsPerQuarter)));
  const ticksPerSecond = (bpm / 60) * ppq;
  const toSec = (tick: number) => tick / ticksPerSecond;

  const base = blankProject(fileName.replace(/\.mid$/i, "") || "MIDI Import");
  const tracks: Track[] = [];
  let noteCount = 0;

  for (const pt of parsedTracks) {
    if (!pt.notes.length) continue;
    const id = newId("trk");
    const synth = pt.isDrum ? ("drums" as const) : /bass|808/i.test(pt.name) ? ("bass" as const) : ("keys" as const);
    const color = pt.isDrum
      ? "var(--lane-kick)"
      : synth === "bass"
        ? "var(--lane-bass)"
        : "var(--lane-chords)";
    const clips: EventClip[] = pt.notes.map((n) => ({
      kind: "event" as const,
      id: newId("clip"),
      trackId: id,
      name: pt.name,
      start: toSec(n.startTick),
      duration: Math.max(0.03, toSec(n.endTick - n.startTick)),
      pitch: n.pitch,
      velocity: n.velocity / 127,
    }));
    noteCount += clips.length;
    tracks.push({
      id,
      name: pt.name,
      kind: "midi",
      color,
      synth,
      volume: 1,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
      clips,
    });
  }

  if (!tracks.length) {
    throw new Error("This MIDI file has no note events to import.");
  }

  const project: Project = {
    ...base,
    name: fileName.replace(/\.mid$/i, "") || "MIDI Import",
    bpm,
    tracks,
  };

  return { project, trackCount: tracks.length, noteCount };
}

export function isMidiFileName(name: string): boolean {
  return /\.(mid|midi)$/i.test(name);
}
