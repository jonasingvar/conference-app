import { Router } from 'express';
import { db } from '../db.js';
import { SESSION_SELECT, toSpeaker, toSession } from '../lib/query.js';

export const speakersRouter = Router();

speakersRouter.get('/', (req, res) => {
  const { q, featured, trackSlug, country, firstTime, day } = req.query;
  const where = [];
  const args = [];
  if (q) { where.push('(sp.name LIKE ? OR sp.company LIKE ? OR sp.job_title LIKE ? OR sp.expertise LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  if (featured === 'true') where.push('sp.featured = 1');
  if (firstTime === 'true') where.push('sp.first_time = 1');
  if (country) { where.push('sp.country = ?'); args.push(country); }
  if (day) {
    where.push(`EXISTS (SELECT 1 FROM session_speakers ss JOIN sessions s ON s.id = ss.session_id
                WHERE ss.speaker_id = sp.id AND s.day = ?)`);
    args.push(day);
  }
  if (trackSlug) {
    where.push(`EXISTS (SELECT 1 FROM session_speakers ss JOIN sessions s ON s.id = ss.session_id
                JOIN tracks t ON t.id = s.track_id WHERE ss.speaker_id = sp.id AND t.slug = ?)`);
    args.push(trackSlug);
  }

  const rows = db.prepare(`
    SELECT sp.*, COUNT(ss.session_id) AS session_count
    FROM speakers sp
    LEFT JOIN session_speakers ss ON ss.speaker_id = sp.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY sp.id
    ORDER BY sp.featured DESC, sp.name
  `).all(...args);

  res.json(rows.map((r) => toSpeaker(r, { sessionCount: r.session_count })));
});

speakersRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM speakers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Speaker not found' });

  const sessions = db.prepare(`${SESSION_SELECT}
    JOIN session_speakers ss ON ss.session_id = s.id
    WHERE ss.speaker_id = ? ORDER BY s.day, s.starts_at`).all(row.id).map((r) => toSession(r));

  const followerCount = db.prepare('SELECT COUNT(*) n FROM speaker_follows WHERE speaker_id = ?').get(row.id).n;

  res.json(toSpeaker(row, { sessions, followerCount }));
});
