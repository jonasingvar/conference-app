import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import { useConferenceClock } from './clock.js';
import { useToast } from '../components/Toaster.jsx';

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
  const [followingIds, setFollowingIds] = useState(() => new Set());
  const clock = useConferenceClock(data?.days ?? []);
  const toast = useToast();

  useEffect(() => {
    api.getBootstrap().then(setData).catch(setError);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(currentUserId));
    api.getUser(currentUserId)
      .then((u) => {
        setFavoriteIds(new Set(u.favoriteIds));
        setFollowingIds(new Set(u.followedSpeakers.map((s) => s.id)));
      })
      .catch(() => {
        setFavoriteIds(new Set());
        setFollowingIds(new Set());
      });
  }, [currentUserId]);

  const setFavorite = useCallback(async (sessionId, wanted) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wanted) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    });
    const call = wanted ? api.addFavorite : api.removeFavorite;
    await call(currentUserId, sessionId);
  }, [currentUserId]);

  const toggleFavorite = useCallback(async (sessionId) => {
    const wasFavorite = favoriteIds.has(sessionId);
    await setFavorite(sessionId, !wasFavorite);
    toast({
      message: wasFavorite ? 'Removed from your plan' : 'Saved to your plan',
      icon: wasFavorite ? 'close' : 'check',
      action: { label: 'Undo', onClick: () => setFavorite(sessionId, wasFavorite) },
    });
  }, [favoriteIds, setFavorite, toast]);

  const toggleFollow = useCallback(async (speakerId) => {
    const following = followingIds.has(speakerId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (following) next.delete(speakerId);
      else next.add(speakerId);
      return next;
    });
    const call = following ? api.unfollowSpeaker : api.followSpeaker;
    await call(currentUserId, speakerId);
    toast({ message: following ? 'Unfollowed' : 'Following — their sessions show in your feed', icon: 'bell' });
  }, [currentUserId, followingIds, toast]);

  const value = useMemo(() => {
    const users = data?.users ?? [];
    return {
      ...(data ?? {}),
      ready: !!data,
      error,
      clock,
      currentUser: users.find((u) => u.id === currentUserId) ?? users[0] ?? null,
      currentUserId,
      setCurrentUserId,
      favoriteIds,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      followingIds,
      isFollowing: (id) => followingIds.has(id),
      toggleFollow,
      trackBySlug: Object.fromEntries((data?.tracks ?? []).map((t) => [t.slug, t])),
      venueById: Object.fromEntries((data?.venues ?? []).map((v) => [v.id, v])),
      roomById: Object.fromEntries((data?.rooms ?? []).map((r) => [r.id, r])),
    };
  }, [data, error, clock, currentUserId, favoriteIds, toggleFavorite, followingIds, toggleFollow]);

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
