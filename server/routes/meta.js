import { Router } from 'express';
import { db } from '../db.js';
import { SESSION_SELECT, hydrateSessions, toVenue, toRoom, toSponsor, toVendor, toAnnouncement, toUser } from '../lib/query.js';

export const metaRouter = Router();

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4'];

/** Everything the app shell needs, in one request. */
metaRouter.get('/bootstrap', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues ORDER BY is_primary DESC, name').all().map(toVenue);
  const travel = db.prepare('SELECT * FROM venue_travel').all().map((t) => ({
    fromVenueId: t.from_venue_id, toVenueId: t.to_venue_id, mode: t.mode,
    minutes: t.minutes, costUsd: t.cost_usd, note: t.note,
  }));
  const tracks = db.prepare('SELECT * FROM tracks ORDER BY name').all();
  const tags = db.prepare('SELECT * FROM tags ORDER BY kind, name').all();
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY venue_id, level_order, name').all().map(toRoom);
  const users = db.prepare('SELECT * FROM users ORDER BY id').all().map((u) => toUser(u, {
    favoriteCount: db.prepare('SELECT COUNT(*) n FROM favorites WHERE user_id = ?').get(u.id).n,
    speakingCount: u.speaker_id
      ? db.prepare('SELECT COUNT(*) n FROM session_speakers WHERE speaker_id = ?').get(u.speaker_id).n
      : 0,
  }));
  const days = db.prepare('SELECT day, COUNT(*) n FROM sessions GROUP BY day ORDER BY day').all()
    .map((d, i) => ({
      date: d.day,
      label: DAY_LABELS[i] ?? `Day ${i + 1}`,
      weekday: new Date(`${d.day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      sessionCount: d.n,
    }));
  const cuisines = db.prepare('SELECT DISTINCT cuisine FROM vendors ORDER BY cuisine').all().map((c) => c.cuisine);
  const formats = db.prepare('SELECT format, COUNT(*) n FROM sessions GROUP BY format ORDER BY n DESC').all()
    .map((f) => ({ name: f.format, count: f.n }));
  const levels = db.prepare('SELECT level, COUNT(*) n FROM sessions GROUP BY level').all()
    .map((l) => ({ name: l.level, count: l.n }));

  res.json({
    conference: {
      name: 'ORBIT',
      edition: "'26",
      tagline: 'The Applied AI Conference',
      city: 'Las Vegas, NV',
      dates: 'October 12–15, 2026',
      startDate: days[0]?.date ?? '2026-10-12',
    },
    venues, travel, tracks, tags, rooms, users, days, formats, levels, cuisines,
  });
});

metaRouter.get('/venues', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues ORDER BY is_primary DESC').all().map(toVenue);
  res.json(venues.map((v) => ({
    ...v,
    rooms: db.prepare('SELECT * FROM rooms WHERE venue_id = ? ORDER BY level_order, name').all(v.id).map(toRoom),
    vendorCount: db.prepare('SELECT COUNT(*) n FROM vendors WHERE venue_id = ?').get(v.id).n,
    sessionCount: db.prepare(
      'SELECT COUNT(*) n FROM sessions s JOIN rooms r ON r.id = s.room_id WHERE r.venue_id = ?').get(v.id).n,
  })));
});

metaRouter.get('/vendors', (req, res) => {
  const { venueId, cuisine, dietary, q } = req.query;
  let sql = 'SELECT * FROM vendors WHERE 1=1';
  const args = [];
  if (venueId) { sql += ' AND venue_id = ?'; args.push(venueId); }
  if (cuisine) { sql += ' AND cuisine = ?'; args.push(cuisine); }
  if (dietary) { sql += ' AND dietary LIKE ?'; args.push(`%${dietary}%`); }
  if (q) { sql += ' AND (name LIKE ? OR description LIKE ? OR cuisine LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY rating DESC, name';
  res.json(db.prepare(sql).all(...args).map(toVendor));
});

metaRouter.get('/sponsors', (req, res) => {
  const order = `CASE tier WHEN 'Diamond' THEN 0 WHEN 'Platinum' THEN 1 WHEN 'Gold' THEN 2 WHEN 'Silver' THEN 3 ELSE 4 END`;
  res.json(db.prepare(`SELECT * FROM sponsors ORDER BY ${order}, name`).all().map(toSponsor));
});

metaRouter.get('/announcements', (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, posted_at DESC').all().map(toAnnouncement));
});

/**
 * GET /api/live?day=YYYY-MM-DD&time=HH:MM
 * What is running right now, and what starts next. Drives the live strip.
 */
metaRouter.get('/live', (req, res) => {
  const { day, time } = req.query;
  if (!day || !time) return res.status(400).json({ error: 'day and time are required' });

  const running = db.prepare(`${SESSION_SELECT}
    WHERE s.day = ? AND s.starts_at <= ? AND s.ends_at > ?
    ORDER BY s.is_keynote DESC, s.capacity DESC`).all(day, time, time);

  const nextSlot = db.prepare(
    'SELECT MIN(starts_at) t FROM sessions WHERE day = ? AND starts_at > ?').get(day, time)?.t;

  const upcoming = nextSlot
    ? db.prepare(`${SESSION_SELECT}
        WHERE s.day = ? AND s.starts_at = ?
        ORDER BY s.is_keynote DESC, s.avg_rating DESC`).all(day, nextSlot)
    : [];

  res.json({
    day,
    time,
    nextSlot: nextSlot ?? null,
    happeningNow: hydrateSessions(running),
    upNext: hydrateSessions(upcoming),
  });
});

metaRouter.get('/stats', (req, res) => {
  const one = (sql) => db.prepare(sql).get().n;
  res.json({
    sessions: one('SELECT COUNT(*) n FROM sessions'),
    speakers: one('SELECT COUNT(*) n FROM speakers'),
    rooms: one('SELECT COUNT(*) n FROM rooms'),
    venues: one('SELECT COUNT(*) n FROM venues'),
    tracks: one('SELECT COUNT(*) n FROM tracks'),
    vendors: one('SELECT COUNT(*) n FROM vendors'),
    sponsors: one('SELECT COUNT(*) n FROM sponsors'),
    attendees: 8400,
    countries: one('SELECT COUNT(DISTINCT country) n FROM speakers'),
    workshops: one("SELECT COUNT(*) n FROM sessions WHERE format = 'Workshop'"),
    recorded: one('SELECT COUNT(*) n FROM sessions WHERE is_recorded = 1'),
    topTracks: db.prepare(`
      SELECT t.name, t.color, t.slug, COUNT(*) n FROM sessions s
      JOIN tracks t ON t.id = s.track_id GROUP BY t.id ORDER BY n DESC`).all(),
  });
});
