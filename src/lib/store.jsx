import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';

/**
 * One app-wide context holding:
 *   - the bootstrap payload (venues, tracks, tags, rooms, days, attendees)
 *   - the currently selected attendee and their favourite session ids
 *
 * Page-level data (session lists, speaker detail, …) is fetched per page
 * with the `useFetch` hook below. Only genuinely global state lives here.
 */
const ConferenceContext = createContext(null);

const STORAGE_KEY = 'orbit:currentUserId';

export function ConferenceProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 1;
  });
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

  useEffect(() => {
    api.getBootstrap().then(setData).catch(setError);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(currentUserId));
    api.getUser(currentUserId)
      .then((u) => setFavoriteIds(new Set(u.favoriteIds)))
      .catch(() => setFavoriteIds(new Set()));
  }, [currentUserId]);

  const toggleFavorite = useCallback(async (sessionId) => {
    const isFavorite = favoriteIds.has(sessionId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
    const call = isFavorite ? api.removeFavorite : api.addFavorite;
    await call(currentUserId, sessionId);
  }, [currentUserId, favoriteIds]);

  const value = useMemo(() => {
    const users = data?.users ?? [];
    return {
      ...(data ?? {}),
      ready: !!data,
      error,
      currentUser: users.find((u) => u.id === currentUserId) ?? users[0] ?? null,
      currentUserId,
      setCurrentUserId,
      favoriteIds,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      trackBySlug: Object.fromEntries((data?.tracks ?? []).map((t) => [t.slug, t])),
      venueById: Object.fromEntries((data?.venues ?? []).map((v) => [v.id, v])),
      roomById: Object.fromEntries((data?.rooms ?? []).map((r) => [r.id, r])),
    };
  }, [data, error, currentUserId, favoriteIds, toggleFavorite]);

  return <ConferenceContext.Provider value={value}>{children}</ConferenceContext.Provider>;
}

export function useConference() {
  const ctx = useContext(ConferenceContext);
  if (!ctx) throw new Error('useConference must be used inside <ConferenceProvider>');
  return ctx;
}

/**
 * Minimal data-fetching hook: `useFetch(() => api.getSessions({ day }), [day])`.
 * Returns { data, loading, error, reload }.
 */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve(fn())
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
