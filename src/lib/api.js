/**
 * Thin fetch wrapper. Every network call in the app goes through `api()`.
 *
 * Convention: callers get parsed JSON or a thrown Error. No component
 * should ever call fetch() directly — put the endpoint here instead.
 */
const BASE = '/api';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

/** Build a query string, dropping empty/undefined values. */
const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};

export const getBootstrap = () => api('/bootstrap');
export const getStats = () => api('/stats');
export const getLive = ({ day, time }) => api(`/live${qs({ day, time })}`);
export const getSessions = (filters) => api(`/sessions${qs(filters)}`);
export const getSession = (id) => api(`/sessions/${id}`);
export const getSpeakers = (filters) => api(`/speakers${qs(filters)}`);
export const getSpeaker = (id) => api(`/speakers/${id}`);
export const getVenues = () => api('/venues');
export const getVendors = (filters) => api(`/vendors${qs(filters)}`);
export const getSponsors = () => api('/sponsors');
export const getAnnouncements = () => api('/announcements');
export const getUsers = () => api('/users');
export const getUser = (id) => api(`/users/${id}`);
export const getSchedule = (userId) => api(`/users/${userId}/schedule`);

export const addFavorite = (userId, sessionId) => api(`/users/${userId}/favorites/${sessionId}`, { method: 'PUT' });
export const removeFavorite = (userId, sessionId) => api(`/users/${userId}/favorites/${sessionId}`, { method: 'DELETE' });
export const followSpeaker = (userId, speakerId) => api(`/users/${userId}/follows/${speakerId}`, { method: 'PUT' });
export const unfollowSpeaker = (userId, speakerId) => api(`/users/${userId}/follows/${speakerId}`, { method: 'DELETE' });
