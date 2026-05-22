/**
 * API client for QuickSync backend.
 * Provides typed fetch wrappers for all REST endpoints.
 */

import { getApiUrl } from './url';

const API_BASE = getApiUrl();

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

/** Ping the server health endpoint. Throws if unreachable or non-OK. */
export async function checkHealth(): Promise<void> {
  const res = await fetch(`${API_BASE}/`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  duration_minutes?: number;
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

// ==========================================
// Users API
// ==========================================

/** Search for users by name or email. Excludes the current user. Requires auth. */
export async function searchUsers(q: string): Promise<User[]> {
  return apiFetch<User[]>(`/api/auth/search?q=${encodeURIComponent(q)}`);
}

// ==========================================
// Permanent Channels API
// ==========================================

export interface ChannelMember {
  id: string;
  name: string;
  avatar_url?: string;
  status: string;
}

export interface Channel {
  channel_id: string;
  title: string;
  created_by: string;
  created_by_name: string;
  members: ChannelMember[];
  created_at: string;
}

/** Create a permanent channel with the given members. */
export async function createChannel(title: string, member_ids: string[]): Promise<Channel> {
  return apiFetch<Channel>('/api/meetings/channels', {
    method: 'POST',
    body: JSON.stringify({ title, member_ids }),
  });
}

/** Get all permanent channels the current user belongs to. */
export async function getMyChannels(): Promise<{ channels: Channel[] }> {
  return apiFetch<{ channels: Channel[] }>('/api/meetings/channels');
}

/** Delete a recurring meeting channel. Only the creator can delete. */
export async function deleteChannel(channelId: string): Promise<void> {
  await apiFetch(`/api/meetings/channels/${channelId}`, { method: 'DELETE' });
}

/** Accept or reject a recurring meeting invitation. */
export async function updateChannelInvitation(channelId: string, status: 'accepted' | 'rejected'): Promise<void> {
  await apiFetch(`/api/meetings/channels/${channelId}/invitation`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** Submit feedback to admin */
export async function submitFeedback(message: string): Promise<void> {
  await apiFetch('/api/feedbacks', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export interface Feedback {
  id: string;
  user_email: string;
  message: string;
  created_at: string;
}

/** Get all feedbacks (admin only) */
export async function getFeedbacks(adminKey: string): Promise<Feedback[]> {
  return apiFetch(`/admin/feedbacks?admin_key=${encodeURIComponent(adminKey)}`);
}

/** Delete a feedback (admin only) */
export async function deleteFeedback(feedbackId: string, adminKey: string): Promise<void> {
  await apiFetch(`/admin/feedbacks/${feedbackId}?admin_key=${encodeURIComponent(adminKey)}`, {
    method: 'DELETE',
  });
}
