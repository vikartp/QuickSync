/**
 * API client for QuickSync backend.
 * Provides typed fetch wrappers for all REST endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Generic fetch wrapper that auto-injects JWT if available. */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('quicksync_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ==========================================
// Auth API
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tier: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

/** Exchange a Google id_token for a QuickSync JWT. */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}

/** Get the currently authenticated user's profile. */
export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

// ==========================================
// Meetings API
// ==========================================

export interface Meeting {
  meeting_id: string;
  title?: string;
  created_by?: string;
  is_guest_meeting: boolean;
  participants_limit: number;
  status: string;
  join_url: string;
  created_at: string;
}

export interface CreateMeetingPayload {
  title?: string;
  guest_name?: string;
}

/** Create a new meeting (works for both logged-in users and guests). */
export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  return apiFetch<Meeting>('/api/meetings/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Get all meetings for the currently authenticated user. */
export async function getMyMeetings(): Promise<{ meetings: Meeting[] }> {
  return apiFetch<{ meetings: Meeting[] }>('/api/meetings/my');
}

/** Get meeting details by UUID (no auth required — link = access). */
export async function getMeeting(meetingId: string): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/meetings/${meetingId}`);
}

/** Manually end a meeting. */
export async function endMeeting(meetingId: string): Promise<void> {
  await apiFetch(`/api/meetings/${meetingId}/end`, { method: 'PATCH' });
}

/** Delete a meeting from history. */
export async function deleteMeeting(meetingId: string): Promise<void> {
  await apiFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
}
