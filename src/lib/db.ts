import {
  getSupabaseClient,
  type Json,
  type LanesProjectInsert,
  type LanesProjectRow,
  type LanesProjectUpdate,
} from './supabase';

export type { Json, LanesProjectRow, LanesProjectInsert, LanesProjectUpdate };

export interface MidiNoteEvent {
  note: number | string;
  velocity?: number;
  startTime?: number;
  duration?: number;
  channel?: number;
  [key: string]: Json | undefined;
}

export interface MidiPayload {
  source?: string;
  bpm?: number;
  timeSignature?: [number, number] | string;
  notes?: MidiNoteEvent[];
  tracks?: Array<{
    id?: string;
    name?: string;
    notes?: MidiNoteEvent[];
    [key: string]: Json | undefined;
  }>;
  [key: string]: Json | undefined;
}

export interface DawProjectRecord {
  id: string;
  userId: string;
  projectName: string;
  dawState: Json;
  midiData: Json | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveLanesProjectInput {
  id?: string;
  projectName: string;
  dawState?: Json;
  midiData?: Json | null;
}

export interface AttachMidiInput {
  projectId: string;
  midiData: MidiPayload | Json;
  mergeNotes?: boolean;
}

function mapRowToRecord(row: LanesProjectRow): DawProjectRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectName: row.project_name,
    dawState: row.daw_state ?? {},
    midiData: row.midi_data ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(`Failed to verify Supabase auth session: ${error.message}`);
  }
  if (!data.user?.id) {
    throw new Error('Authentication required: sign in with Supabase Auth to access Lanes projects.');
  }
  return data.user.id;
}

export async function listUserLanesProjects(): Promise<DawProjectRecord[]> {
  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await client
    .from('lanes_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load Lanes projects: ${error.message}`);
  }

  return (data ?? []).map(mapRowToRecord);
}

export async function getLanesProjectById(projectId: string): Promise<DawProjectRecord | null> {
  const trimmedId = projectId.trim();
  if (!trimmedId) {
    throw new Error('Project ID is required.');
  }

  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await client
    .from('lanes_projects')
    .select('*')
    .eq('id', trimmedId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch Lanes project "${trimmedId}": ${error.message}`);
  }

  return data ? mapRowToRecord(data) : null;
}

export async function createLanesProject(input: SaveLanesProjectInput): Promise<DawProjectRecord> {
  const name = input.projectName.trim();
  if (!name) {
    throw new Error('Project name cannot be empty.');
  }

  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const now = new Date().toISOString();

  const insertPayload: LanesProjectInsert = {
    user_id: userId,
    project_name: name,
    daw_state: input.dawState ?? {},
    midi_data: input.midiData ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await client
    .from('lanes_projects')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create Lanes project: ${error?.message ?? 'Unknown database error'}`);
  }

  return mapRowToRecord(data);
}

export async function saveLanesProject(input: SaveLanesProjectInput): Promise<DawProjectRecord> {
  const name = input.projectName.trim();
  if (!name) {
    throw new Error('Project name cannot be empty.');
  }

  if (!input.id) {
    return createLanesProject({
      projectName: name,
      dawState: input.dawState,
      midiData: input.midiData,
    });
  }

  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const now = new Date().toISOString();

  const updatePayload: LanesProjectUpdate = {
    project_name: name,
    updated_at: now,
  };

  if (input.dawState !== undefined) {
    updatePayload.daw_state = input.dawState;
  }
  if (input.midiData !== undefined) {
    updatePayload.midi_data = input.midiData;
  }

  const { data, error } = await client
    .from('lanes_projects')
    .update(updatePayload)
    .eq('id', input.id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to save Lanes project "${input.id}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`Lanes project "${input.id}" was not found or is not owned by the current user.`);
  }

  return mapRowToRecord(data);
}

export async function updateDawState(projectId: string, dawState: Json): Promise<DawProjectRecord> {
  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('lanes_projects')
    .update({
      daw_state: dawState,
      updated_at: now,
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update DAW state for project "${projectId}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`Lanes project "${projectId}" was not found or is not owned by the current user.`);
  }

  return mapRowToRecord(data);
}

function mergeMidiPayloads(existing: Json | null, incoming: MidiPayload | Json): Json {
  if (
    existing &&
    typeof existing === 'object' &&
    !Array.isArray(existing) &&
    incoming &&
    typeof incoming === 'object' &&
    !Array.isArray(incoming)
  ) {
    const prevObj = existing as Record<string, Json | undefined>;
    const nextObj = incoming as Record<string, Json | undefined>;
    const prevNotes = Array.isArray(prevObj.notes) ? prevObj.notes : [];
    const nextNotes = Array.isArray(nextObj.notes) ? nextObj.notes : [];

    return {
      ...prevObj,
      ...nextObj,
      notes: [...prevNotes, ...nextNotes],
    };
  }

  return incoming;
}

export async function receiveNoteLabMidi(input: AttachMidiInput): Promise<DawProjectRecord> {
  const client = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const now = new Date().toISOString();

  let nextMidiPayload: Json = input.midiData as Json;

  if (input.mergeNotes) {
    const current = await getLanesProjectById(input.projectId);
    if (!current) {
      throw new Error(`Lanes project "${input.projectId}" was not found or is not owned by the current user.`);
    }
    nextMidiPayload = mergeMidiPayloads(current.midiData, input.midiData as Json);
  }

  const { data, error } = await client
    .from('lanes_projects')
    .update({
      midi_data: nextMidiPayload,
      updated_at: now,
    })
    .eq('id', input.projectId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to attach NoteLab MIDI data to project "${input.projectId}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`Lanes project "${input.projectId}" was not found or is not owned by the current user.`);
  }

  return mapRowToRecord(data);
}

export async function clearProjectMidiData(projectId: string): Promise<DawProjectRecord> {
  return receiveNoteLabMidi({
    projectId,
    midiData: null,
    mergeNotes: false,
  });
}

export async function ensureDbReady(): Promise<void> {
  await getSupabaseClient().auth.getSession();
}

export const db = {
  ensureReady: ensureDbReady,
  listProjects: listUserLanesProjects,
  getProject: getLanesProjectById,
  createProject: createLanesProject,
  saveProject: saveLanesProject,
  updateDawState,
  receiveNoteLabMidi,
  clearMidiData: clearProjectMidiData,
};
