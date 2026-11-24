import { AlertTriangle, X } from "lucide-react";
import LZString from "lz-string";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getController } from "@/lib/daw/controller";
import { newId } from "@/lib/daw/ids";
import { isMidiFileName, parseMidiToProject } from "@/lib/daw/midi-import";
import * as ops from "@/lib/daw/ops";
import { projectEnd } from "@/lib/daw/timeline-math";
import { takeForStudio } from "@/lib/editor/handoff";
import { AnalysisSide } from "./analysis-side";
import { IdleScreen } from "./idle-screen";
import { ProjectBar } from "./project-bar";
import { ProjectsDialog } from "./projects-dialog";
import { Spectrum } from "./spectrum";
import { Timeline } from "./timeline";
import { Transport } from "./transport";
import { useControllerState, usePlayhead, useProjectState } from "./use-studio";

/** Origins allowed to complete the NoteLab → Lanes postMessage handshake. */
const NOTELAB_ORIGINS = new Set([
  "https://notelab2.uwon.workers.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function isAllowedNoteLabOrigin(origin: string): boolean {
  if (NOTELAB_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".uwon.workers.dev") &&
      url.hostname.includes("notelab")
    );
  } catch {
    return false;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function StudioApp() {
  const controller = getController();
  const cs = useControllerState(controller);
  const ps = useProjectState(controller);
  const { time, playing } = usePlayhead(controller);
  const [dialog, setDialog] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [waitingForNoteLab, setWaitingForNoteLab] = useState(false);
  const dragDepth = useRef(0);
  const midiImportStarted = useRef(false);

  const openMidiBytes = useCallback(
    async (bytes: Uint8Array, name: string) => {
      const { project } = parseMidiToProject(bytes, name);
      // Persist through the same path as a new project so autosave + project list work.
      await controller.newBlankProject();
      controller.store.commit(() => project);
      controller.store.markSaved(Date.now());
    },
    [controller],
  );

  useEffect(() => {
    let cancelled = false;
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const importMidiPending = new URLSearchParams(window.location.search).get("importMidi") === "pending";
    if (importMidiPending) setWaitingForNoteLab(true);
    const initialization = controller.init({ restoreLastProject: !importMidiPending });

    if (importMidiPending && !midiImportStarted.current) {
      let dataInFlight = false;
      const importPayload = async (encodedPayload: string): Promise<boolean> => {
        try {
          const json = LZString.decompressFromEncodedURIComponent(encodedPayload);
          if (json === null) throw new Error("Invalid compressed NoteLab payload");
          let payload: {
            kind?: string;
            name?: string;
            bpm?: number;
            midiBase64?: string;
            tracks?: Partial<
              Record<"melody" | "chords" | "bass" | "drums", { s: number; l: number; p: number; v: number }[]>
            >;
          };
          try {
            payload = JSON.parse(json) as typeof payload;
          } catch (error) {
            console.error("NoteLab sent invalid JSON:", error);
            return false;
          }

          await initialization;
          if (cancelled) return false;

          // Preferred path: full Standard MIDI File (same as NoteLab download).
          if (typeof payload.midiBase64 === "string" && payload.midiBase64.length > 0) {
            const bytes = base64ToUint8Array(payload.midiBase64);
            await openMidiBytes(bytes, payload.name || "NoteLab.mid");
            midiImportStarted.current = true;
            setWaitingForNoteLab(false);
            window.history.replaceState({}, "", "/");
            return true;
          }

          // Legacy path: compressed note events.
          if (!Number.isFinite(payload.bpm) || !payload.bpm || payload.bpm <= 0 || !payload.tracks) {
            throw new Error("Invalid NoteLab MIDI payload (need midiBase64 or bpm+tracks)");
          }

          if (controller.store.getState().project === null) await controller.newBlankProject();
          controller.store.commit((project) => ops.setBpm(project, payload.bpm!));
          const activeProject = controller.store.getState().project;
          if (!activeProject) throw new Error("Could not open a project for NoteLab MIDI import");
          let project = activeProject;
          const parts = [
            { key: "melody" as const, name: "Melody", synth: "keys" as const, color: "var(--lane-vocals)" },
            { key: "chords" as const, name: "Chords", synth: "keys" as const, color: "var(--lane-chords)" },
            { key: "bass" as const, name: "Bass", synth: "bass" as const, color: "var(--lane-bass)" },
            { key: "drums" as const, name: "Drums", synth: "drums" as const, color: "var(--lane-kick)" },
          ];
          const secondsPerBar = 240 / payload.bpm;

          for (const part of parts) {
            const notes = payload.tracks[part.key];
            if (!Array.isArray(notes) || !notes.length) continue;
            const added = ops.addTrack(project, { name: part.name, kind: "midi", color: part.color });
            const trackId = added.ids[0]!;
            project = {
              ...added.project,
              tracks: added.project.tracks.map((track) =>
                track.id !== trackId
                  ? track
                  : {
                      ...track,
                      synth: part.synth,
                      clips: notes
                        .filter(
                          (note) =>
                            Number.isFinite(note.s) &&
                            note.s >= 0 &&
                            Number.isFinite(note.l) &&
                            note.l > 0 &&
                            Number.isFinite(note.p) &&
                            note.p >= 0 &&
                            note.p <= 127 &&
                            Number.isFinite(note.v) &&
                            note.v >= 0 &&
                            note.v <= 127,
                        )
                        .map((note) => ({
                          kind: "event" as const,
                          id: newId("clip"),
                          trackId,
                          name: part.name,
                          start: (note.s / 16) * secondsPerBar,
                          duration: Math.max(0.03, (note.l / 16) * secondsPerBar),
                          pitch: note.p,
                          velocity: note.v / 127,
                        })),
                    },
              ),
            };
          }

          controller.store.commit(() => project);
          midiImportStarted.current = true;
          setWaitingForNoteLab(false);
          window.history.replaceState({}, "", "/");
          return true;
        } catch (error) {
          console.error("Could not import NoteLab MIDI:", error);
          setWaitingForNoteLab(false);
          return false;
        }
      };

      messageHandler = (event) => {
        if (!isAllowedNoteLabOrigin(event.origin)) return;
        if (!event.data || typeof event.data !== "object") return;
        const message = event.data as { type?: unknown; payload?: unknown };
        if (message.type === "NOTELAB_HELLO") {
          if (event.source) {
            (event.source as Window).postMessage({ type: "LANES_READY" }, event.origin);
          }
          return;
        }
        if (message.type !== "NOTELAB_DATA" || dataInFlight) return;
        if (typeof message.payload !== "string" || message.payload.length === 0) {
          console.error("NoteLab sent an empty or invalid MIDI payload");
          return;
        }
        dataInFlight = true;
        void importPayload(message.payload).then((success) => {
          if (!success) dataInFlight = false;
        });
      };
      window.addEventListener("message", messageHandler);
    }
    return () => {
      cancelled = true;
      if (messageHandler) window.removeEventListener("message", messageHandler);
    };
  }, [controller, openMidiBytes]);

  useEffect(
    () => () => {
      if (controller.engine.playing) controller.engine.pause();
    },
    [controller],
  );

  useEffect(() => {
    if (!cs.ready) return;
    const incoming = takeForStudio();
    if (!incoming) return;
    if (incoming.mode === "track" && controller.store.getState().project) {
      void controller.addAudioFile(incoming.file, controller.engine.currentTime());
    } else {
      void controller.importFile(incoming.file);
    }
  }, [cs.ready, controller]);

  const onFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const first = list[0];
      if (!first) return;

      // MIDI files → open as MIDI project (or add could be future work).
      if (isMidiFileName(first.name) || first.type === "audio/midi" || first.type === "audio/mid") {
        void first.arrayBuffer().then((buf) => openMidiBytes(new Uint8Array(buf), first.name));
        return;
      }

      if (controller.store.getState().project) void controller.addAudioFile(first, controller.engine.currentTime());
      else void controller.importFile(first);
    },
    [controller, openMidiBytes],
  );

  const togglePlay = useCallback(async () => {
    const e = controller.engine;
    if (e.playing) e.pause();
    else await e.play();
  }, [controller]);

  const project = ps.project;
  const busy = cs.busy !== null;

  const root = (children: React.ReactNode) => (
    <div
      className="relative flex min-h-[calc(100dvh-var(--shell-h))] flex-col bg-background text-foreground"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-background/80 text-sm text-foreground">
          Drop audio or MIDI (.mid) to {project ? "add / open it" : "open it in the studio"}
        </div>
      ) : null}
      <ProjectsDialog controller={controller} open={dialog} onClose={() => setDialog(false)} />
    </div>
  );

  if (waitingForNoteLab) {
    return (
      <div
        className="flex min-h-[calc(100dvh-var(--shell-h))] items-center justify-center bg-background text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Waiting for NoteLab MIDI…
      </div>
    );
  }

  if (!cs.ready) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--shell-h))] items-center justify-center bg-background text-sm text-muted-foreground" role="status">
        Loading studio…
      </div>
    );
  }

  const banners = (
    <>
      {cs.busy ? (
        <div className="border-b border-border bg-card px-4 py-2" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{cs.busy.label}</span>
            {cs.busy.pct !== null ? <span className="font-mono tabular-nums">{Math.round(cs.busy.pct)}%</span> : null}
          </div>
          <Progress value={cs.busy.pct ?? 8} className={cs.busy.pct === null ? "animate-pulse" : ""} />
        </div>
      ) : null}
      {cs.error ? <Banner tone="error" text={cs.error} onClose={() => controller.dismissError()} /> : null}
      {cs.notice ? <Banner tone="info" text={cs.notice} onClose={() => controller.dismissError()} /> : null}
      {cs.saveError ? <Banner tone="error" text={`Could not save: ${cs.saveError}`} /> : null}
      {cs.missing.length ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-destructive/10 px-4 py-2 text-xs">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <span className="text-foreground">Audio missing for this project. Choose the original file to relink it:</span>
          {cs.missing.map((m) => (
            <label key={m.id} className="cursor-pointer rounded-md bg-secondary px-2 py-1 text-foreground hover:bg-accent">
              {m.name}
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void controller.relinkAsset(m.id, f);
                  e.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </>
  );

  if (!project) {
    return root(
      <>
        {banners}
        <IdleScreen
          busy={busy}
          onFiles={(f) => onFiles(f)}
          onDemo={() => void controller.loadDemo()}
          onBlank={() => void controller.newBlankProject()}
          onOpenProjects={() => setDialog(true)}
          recent={cs.projects}
          onOpenRecent={(id) => void controller.openProject(id)}
        />
      </>,
    );
  }

  const duration = projectEnd(project);
  return root(
    <>
      <ProjectBar controller={controller} onOpen={() => setDialog(true)} />
      {banners}
      <div className="flex items-stretch border-b border-border">
        <div className="min-w-0 flex-1">
          <Transport
            project={project}
            playing={playing}
            currentTime={time}
            duration={duration}
            onPlayPause={() => void togglePlay()}
            onStop={() => {
              controller.engine.stop();
            }}
            onSeek={(t) => controller.engine.seek(t)}
            onMasterVolume={(v) => controller.store.commit((p) => ops.setMasterVolume(p, v))}
            onBpm={(b) => controller.store.commit((p) => ops.setBpm(p, b))}
            onKey={(k, m) => controller.store.commit((p) => ops.setKey(p, k, m))}
            onDownbeat={() => controller.store.commit((p) => ops.setDownbeat(p, controller.engine.currentTime()))}
          />
        </div>
        <div className="hidden w-56 shrink-0 border-l border-border md:block">
          <Spectrum active={playing} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <Timeline controller={controller} />
        <AnalysisSide controller={controller} currentTime={time} />
      </div>
    </>,
  );
}

function Banner({ tone, text, onClose }: { tone: "error" | "info"; text: string; onClose?: () => void }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        "flex items-center gap-3 border-b border-border px-4 py-2 text-xs " +
        (tone === "error" ? "bg-destructive/10 text-foreground" : "bg-card text-muted-foreground")
      }
    >
      {tone === "error" ? <AlertTriangle className="size-4 shrink-0 text-destructive" /> : null}
      <span className="flex-1">{text}</span>
      {onClose ? (
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Dismiss" onClick={onClose}>
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
