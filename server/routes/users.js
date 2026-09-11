import { Router } from 'express';
import { db } from '../db.js';
import { SESSION_SELECT, hydrateSessions, toUser, toSpeaker, toSession, toMinutes } from '../lib/query.js';
import { reserveSeat, releaseSeat, seatState } from '../lib/seats.js';

/** Sessions this user is presenting, if their account is linked to a speaker. */
function speakingSessions(speakerId) {
  if (!speakerId) return [];
  return db.prepare(`${SESSION_SELECT}
    JOIN session_speakers ss ON ss.session_id = s.id
    WHERE ss.speaker_id = ? ORDER BY s.day, s.starts_at`).all(speakerId).map((r) => toSession(r));
}

export const usersRouter = Router();

usersRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json(rows.map((u) => toUser(u, {
    reservedCount: db.prepare("SELECT COUNT(*) n FROM reservations WHERE user_id = ? AND status = 'confirmed'").get(u.id).n,
    followCount: db.prepare('SELECT COUNT(*) n FROM speaker_follows WHERE user_id = ?').get(u.id).n,
    speakingCount: u.speaker_id
      ? db.prepare('SELECT COUNT(*) n FROM session_speakers WHERE speaker_id = ?').get(u.speaker_id).n
      : 0,
  })));
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
  }));
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
      reservedCount: items.filter((s) => s.reservation === 'confirmed').length,
    };
  });

  res.json({
    user: toUser(user),
    days,
    totalSessions: sessions.length,
    totalReserved: sessions.filter((s) => s.reservation === 'confirmed').length,
    totalWaitlisted: sessions.filter((s) => s.reservation === 'waitlisted').length,
  });
});

/**
 * Seats. PUT takes one (or joins the waitlist if the room is full), DELETE
 * gives it back and promotes whoever has waited longest. Both return the whole
 * seat state so the client never has to guess.
 */
usersRouter.put('/:id/reservations/:sessionId', (req, res) => {
  const state = reserveSeat(Number(req.params.id), Number(req.params.sessionId));
  if (!state) return res.status(404).json({ error: 'Session not found' });
  res.json(state);
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
  db.prepare('INSERT OR IGNORE INTO speaker_follows (user_id, speaker_id) VALUES (?, ?)')
    .run(req.params.id, req.params.speakerId);
  res.json({ following: true, speakerId: Number(req.params.speakerId) });
});

usersRouter.delete('/:id/follows/:speakerId', (req, res) => {
  db.prepare('DELETE FROM speaker_follows WHERE user_id = ? AND speaker_id = ?')
    .run(req.params.id, req.params.speakerId);
  res.json({ following: false, speakerId: Number(req.params.speakerId) });
});
