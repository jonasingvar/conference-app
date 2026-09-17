import { Router } from 'express';
import { db } from '../db.js';
import { SESSION_SELECT, hydrateSessions, toUser, toSpeaker, toSession, toMinutes } from '../lib/query.js';
import { reserveSeat, releaseSeat, seatState } from '../lib/seats.js';
import { attendanceState, checkIn, rateSession } from '../lib/attendance.js';
import { agendaCalendar } from '../lib/ical.js';

/** Sessions this user is presenting, if their account is linked to a speaker. */
function speakingSessions(speakerId) {
  if (!speakerId) return [];
  return db.prepare(`${SESSION_SELECT}
    JOIN session_speakers ss ON ss.session_id = s.id
    WHERE ss.speaker_id = ? ORDER BY s.day, s.starts_at`).all(speakerId).map((r) => toSession(r));
}

export const usersRouter = Router();

const userExists = db.prepare('SELECT 1 FROM users WHERE id = ?');

usersRouter.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map((u) => toUser(u)));
});

usersRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Attendee not found' });

  const followedSpeakers = db.prepare(`
    SELECT sp.* FROM speaker_follows sf JOIN speakers sp ON sp.id = sf.speaker_id
    WHERE sf.user_id = ? ORDER BY sp.name`).all(row.id).map((s) => toSpeaker(s));

  const speaker = row.speaker_id
    ? toSpeaker(db.prepare('SELECT * FROM speakers WHERE id = ?').get(row.speaker_id))
    : null;

  res.json(toUser(row, {
    followedSpeakers,
    speaker,
    speakingSessions: speakingSessions(row.speaker_id),
    reservations: db.prepare('SELECT session_id, status FROM reservations WHERE user_id = ?').all(row.id)
      .map((r) => ({ sessionId: r.session_id, status: r.status })),
    checkIns: db.prepare('SELECT session_id FROM check_ins WHERE user_id = ?').all(row.id)
      .map((c) => c.session_id),
    ratings: db.prepare('SELECT session_id, stars FROM ratings WHERE user_id = ?').all(row.id)
      .map((r) => ({ sessionId: r.session_id, stars: r.stars })),
  }));
});

/** A subscribable feed of everything this attendee holds a seat for. */
usersRouter.get('/:id/agenda.ics', (req, res) => {
  const ics = agendaCalendar(Number(req.params.id));
  if (!ics) return res.status(404).json({ error: 'Attendee not found' });
  res.type('text/calendar').set('Content-Disposition', 'attachment; filename="orbit-agenda.ics"').send(ics);
});

/**
 * GET /api/users/:id/today?day=&time=
 *
 * Everything the home page needs about *this* attendee at *this* moment:
 * what they are in now, what is next, what they are waiting on, and — for the
 * slots they have left empty — a few suggestions drawn from what they have
 * actually been booking rather than what they once declared.
 */
usersRouter.get('/:id/today', (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Attendee not found' });

  const { day, time = '00:00' } = req.query;
  if (!day) return res.status(400).json({ error: 'day is required' });
  const now = toMinutes(time);

  const mine = hydrateSessions(db.prepare(`${SESSION_SELECT}
    JOIN reservations r ON r.session_id = s.id AND r.user_id = ?
    WHERE s.day = ? ORDER BY s.starts_at`).all(userId, day));

  const status = new Map(
    db.prepare('SELECT session_id, status FROM reservations WHERE user_id = ?').all(userId)
      .map((r) => [r.session_id, r.status]));
  const checkedIn = new Set(
    db.prepare('SELECT session_id FROM check_ins WHERE user_id = ?').all(userId).map((c) => c.session_id));
  const rated = new Set(
    db.prepare('SELECT session_id FROM ratings WHERE user_id = ?').all(userId).map((r) => r.session_id));

  const decorate = (s) => ({
    ...s,
    reservation: status.get(s.id) ?? null,
    checkedIn: checkedIn.has(s.id),
    rated: rated.has(s.id),
  });

  const booked = mine.filter((s) => status.get(s.id) === 'confirmed').map(decorate);
  const current = booked.find((s) => now >= toMinutes(s.startsAt) && now < toMinutes(s.endsAt)) ?? null;
  const next = booked.find((s) => toMinutes(s.startsAt) > now) ?? null;
  const finished = booked.filter((s) => now >= toMinutes(s.endsAt));

  // Taste is what you book, not what you ticked at registration.
  const tasteRows = db.prepare(`
    SELECT tg.slug, COUNT(*) n FROM reservations r
    JOIN session_tags st ON st.session_id = r.session_id
    JOIN tags tg ON tg.id = st.tag_id AND tg.kind = 'topic'
    WHERE r.user_id = ? GROUP BY tg.slug ORDER BY n DESC LIMIT 8`).all(userId);
  const taste = new Set(tasteRows.map((t) => t.slug));

  // Slots today that are still ahead and that they have not booked anything in.
  const allSlots = db.prepare(
    'SELECT DISTINCT starts_at FROM sessions WHERE day = ? ORDER BY starts_at').all(day)
    .map((r) => r.starts_at).filter((t) => toMinutes(t) > now);
  const taken = new Set(booked.map((s) => s.startsAt));
  const openSlot = allSlots.find((t) => !taken.has(t)) ?? null;

  let suggestions = [];
  if (openSlot) {
    const candidates = hydrateSessions(db.prepare(`${SESSION_SELECT}
      WHERE s.day = ? AND s.starts_at = ? AND s.is_keynote = 0 AND s.format != 'Social'
        AND s.seats_taken < s.capacity`).all(day, openSlot));
    suggestions = candidates
      .map((s) => ({
        ...s,
        // how much it looks like the things they already chose
        affinity: s.tags.filter((t) => t.kind === 'topic' && taste.has(t.slug)).length,
      }))
      .sort((a, b) => b.affinity - a.affinity || b.avgRating - a.avgRating)
      .slice(0, 3);
  }

  res.json({
    day,
    time,
    current,
    next,
    finished,
    // things needing a decision
    unrated: finished.filter((s) => s.checkedIn && !s.rated),
    waitlisted: mine.filter((s) => status.get(s.id) === 'waitlisted').map(decorate),
    openSlot,
    suggestions,
  });
});

/**
 * GET /api/users/:id/schedule
 * Every session this attendee holds a seat or a waitlist place for.
 */
usersRouter.get('/:id/schedule', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Attendee not found' });

  const rows = db.prepare(`${SESSION_SELECT}
    JOIN reservations r ON r.session_id = s.id AND r.user_id = ?
    ORDER BY s.day, s.starts_at`).all(user.id);

  const seats = new Map(
    db.prepare('SELECT session_id, status FROM reservations WHERE user_id = ?').all(user.id)
      .map((r) => [r.session_id, r.status]));

  const sessions = hydrateSessions(rows).map((s) => ({ ...s, reservation: seats.get(s.id) ?? null }));

  const byDay = new Map();
  for (const s of sessions) {
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day).push(s);
  }

  const days = [...byDay.entries()].map(([date, items]) => {
    const conflicts = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (toMinutes(a.startsAt) < toMinutes(b.endsAt) && toMinutes(b.startsAt) < toMinutes(a.endsAt)) {
          conflicts.push({ type: 'overlap', sessionIds: [a.id, b.id] });
        }
      }
    }
    return {
      date,
      sessions: items,
      conflicts,
      totalMinutes: items.reduce((n, s) => n + s.durationMins, 0),
      venuesVisited: [...new Set(items.map((s) => s.venue.shortName))],
    };
  });

  res.json({
    user: toUser(user),
    days,
  });
});

/**
 * Seats. PUT takes one (or joins the waitlist if the room is full), DELETE
 * gives it back and promotes whoever has waited longest. Both return the whole
 * seat state so the client never has to guess.
 */
usersRouter.put('/:id/reservations/:sessionId', (req, res) => {
  if (!userExists.get(req.params.id)) return res.status(404).json({ error: 'Attendee not found' });
  const state = reserveSeat(Number(req.params.id), Number(req.params.sessionId),
    { day: req.body?.day, time: req.body?.time });
  if (!state) return res.status(404).json({ error: 'Session not found' });
  // 409: overlaps a seat you hold, or the session is already over
  res.status(state.rejected ? 409 : 200).json(state);
});

/**
 * Turning up and saying what you thought. `now` comes from the client, because
 * the conference clock is simulated — see CLAUDE.md.
 */
usersRouter.get('/:id/attendance/:sessionId', (req, res) => {
  const state = attendanceState(Number(req.params.sessionId), Number(req.params.id),
    { day: req.query.day, time: req.query.time });
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.json(state);
});

usersRouter.put('/:id/checkins/:sessionId', (req, res) => {
  if (!userExists.get(req.params.id)) return res.status(404).json({ error: 'Attendee not found' });
  const state = checkIn(Number(req.params.id), Number(req.params.sessionId),
    { day: req.body?.day, time: req.body?.time });
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.status(state.rejected ? 409 : 200).json(state);
});

usersRouter.put('/:id/ratings/:sessionId', (req, res) => {
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'stars must be an integer from 1 to 5' });
  }
  const state = rateSession(Number(req.params.id), Number(req.params.sessionId),
    { stars, comment: req.body?.comment }, { day: req.body?.day, time: req.body?.time });
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.status(state.rejected ? 409 : 200).json(state);
});

usersRouter.delete('/:id/reservations/:sessionId', (req, res) => {
  const state = releaseSeat(Number(req.params.id), Number(req.params.sessionId));
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.json(state);
});

usersRouter.get('/:id/reservations/:sessionId', (req, res) => {
  const state = seatState(Number(req.params.sessionId), Number(req.params.id));
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.json(state);
});

usersRouter.put('/:id/follows/:speakerId', (req, res) => {
  if (!userExists.get(req.params.id)) return res.status(404).json({ error: 'Attendee not found' });
  if (!db.prepare('SELECT 1 FROM speakers WHERE id = ?').get(req.params.speakerId)) {
    return res.status(404).json({ error: 'Speaker not found' });
  }
  db.prepare('INSERT OR IGNORE INTO speaker_follows (user_id, speaker_id) VALUES (?, ?)')
    .run(req.params.id, req.params.speakerId);
  res.json({ following: true, speakerId: Number(req.params.speakerId) });
});

usersRouter.delete('/:id/follows/:speakerId', (req, res) => {
  db.prepare('DELETE FROM speaker_follows WHERE user_id = ? AND speaker_id = ?')
    .run(req.params.id, req.params.speakerId);
  res.json({ following: false, speakerId: Number(req.params.speakerId) });
});
