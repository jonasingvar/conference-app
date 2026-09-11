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
  // sessionId -> 'confirmed' | 'waitlisted'
  const [reservations, setReservations] = useState(() => new Map());
  // sessionId -> live seat counts, so a reservation updates every view at once
  const [seatCounts, setSeatCounts] = useState(() => new Map());
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
        setReservations(new Map((u.reservations ?? []).map((r) => [r.sessionId, r.status])));
      })
      .catch(() => {
        setFavoriteIds(new Set());
        setFollowingIds(new Set());
        setReservations(new Map());
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

  /** Apply a seat-state payload from the API to local state. */
  const applySeatState = useCallback((state) => {
    setSeatCounts((prev) => new Map(prev).set(state.sessionId, {
      seatsTaken: state.seatsTaken,
      seatsLeft: state.seatsLeft,
      capacity: state.capacity,
      isFull: state.isFull,
      waitlistCount: state.waitlistCount,
    }));
    setReservations((prev) => {
      const next = new Map(prev);
      if (state.status) next.set(state.sessionId, state.status);
      else next.delete(state.sessionId);
      return next;
    });
  }, []);

  const reserveSeat = useCallback(async (sessionId) => {
    const state = await api.reserveSeat(currentUserId, sessionId);
    applySeatState(state);
    toast({
      message: state.status === 'waitlisted'
        ? `Room is full — you are #${state.waitlistPosition} on the waitlist`
        : 'Seat reserved',
      icon: state.status === 'waitlisted' ? 'clock' : 'ticket',
    });
    return state;
  }, [currentUserId, applySeatState, toast]);

  const releaseSeat = useCallback(async (sessionId) => {
    const state = await api.releaseSeat(currentUserId, sessionId);
    applySeatState(state);
    toast({
      message: state.promoted ? 'Seat released — passed to someone on the waitlist' : 'Seat released',
      icon: 'check',
    });
    return state;
  }, [currentUserId, applySeatState, toast]);

  /** Adopt seat state that arrived with a page payload (e.g. session detail). */
  const adoptSeatState = useCallback((state) => {
    if (!state) return;
    setSeatCounts((prev) => (prev.has(state.sessionId) ? prev : new Map(prev).set(state.sessionId, {
      seatsTaken: state.seatsTaken, seatsLeft: state.seatsLeft, capacity: state.capacity,
      isFull: state.isFull, waitlistCount: state.waitlistCount,
    })));
  }, []);

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
      reservations,
      reservationFor: (id) => reservations.get(id) ?? null,
      seatCounts,
      seatsFor: (id) => seatCounts.get(id) ?? null,
      reserveSeat,
      releaseSeat,
      applySeatState,
      adoptSeatState,
      trackBySlug: Object.fromEntries((data?.tracks ?? []).map((t) => [t.slug, t])),
      venueById: Object.fromEntries((data?.venues ?? []).map((v) => [v.id, v])),
      roomById: Object.fromEntries((data?.rooms ?? []).map((r) => [r.id, r])),
    };
  }, [data, error, clock, currentUserId, favoriteIds, toggleFavorite, followingIds, toggleFollow,
      reservations, seatCounts, reserveSeat, releaseSeat, applySeatState, adoptSeatState]);

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
