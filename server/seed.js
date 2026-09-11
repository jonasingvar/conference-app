import { db, migrate, dropAll, DB_PATH } from './db.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ================================================================== *
 *  ORBIT '26 — The Applied AI Conference
 *  Las Vegas, NV · October 12–15, 2026
 *  Two sites: the Aurora Convention Center, and the Foundry at
 *  Red Rock Yards, 6.2 miles west. There is a shuttle. It is slow.
 * ================================================================== */

let SEED = 20261012;
const rnd = () => { SEED = (SEED * 1664525 + 1013904223) % 4294967296; return SEED / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const pickN = (a, n) => { const p = [...a], o = []; while (o.length < n && p.length) o.push(p.splice(Math.floor(rnd() * p.length), 1)[0]); return o; };
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const flt = (lo, hi, d = 1) => Number((lo + rnd() * (hi - lo)).toFixed(d));
const chance = (p) => rnd() < p;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initialsOf = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const ACCENTS = ['violet', 'cyan', 'amber', 'rose', 'emerald', 'sky', 'fuchsia', 'lime', 'orange', 'teal'];

/**
 * Synthetic speaker portraits, if they have been downloaded (`npm run avatars`).
 * Any speaker without a file falls back to the generated SVG portrait, so a
 * missing or partial set is never a broken image.
 */
const AVATAR_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'avatars');
/** Apparent presentation of each portrait, so names can be matched to faces. */
const PRESENTATION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'avatar-presentation.json'), 'utf8'),
).presentation;

const AVATARS = existsSync(AVATAR_DIR)
  ? new Set(readdirSync(AVATAR_DIR).filter((f) => f.endsWith('.jpg')))
  : new Set();

console.log('→ Seeding ORBIT ’26 →', DB_PATH);
dropAll();
migrate();
const prep = (sql) => db.prepare(sql);

/* ============================== VENUES ============================= */
const VENUES = [
  {
    name: 'Aurora Convention Center', short: 'Aurora',
    address: '3200 Neon Boulevard', city: 'Las Vegas, NV',
    description: 'The main campus. Three connected buildings, twenty stages, and the Expo Hall. Everything except the industrial track happens here.',
    accent: 'violet', emoji: '🛰️', lat: 36.1215, lng: -115.1739, primary: 1,
    wifi: 'ORBIT26-Aurora', opens: '06:30', closes: '23:30',
  },
  {
    name: 'The Foundry at Red Rock Yards', short: 'The Foundry',
    address: '1145 Ironworks Road', city: 'Las Vegas, NV',
    description: 'A decommissioned steel works, 6.2 miles west. Hosts the hands-on workshops, the hardware track and the late shows. Shuttles run from Aurora’s north entrance — budget real time to get here.',
    accent: 'orange', emoji: '🏭', lat: 36.1401, lng: -115.2588, primary: 0,
    wifi: 'ORBIT26-Foundry', opens: '08:00', closes: '01:00',
  },
];
const vStmt = prep(`INSERT INTO venues (name,short_name,address,city,description,accent,emoji,lat,lng,is_primary,wifi_ssid,opens_at,closes_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
VENUES.forEach((v) => vStmt.run(v.name, v.short, v.address, v.city, v.description, v.accent, v.emoji, v.lat, v.lng, v.primary, v.wifi, v.opens, v.closes));
const venues = db.prepare('SELECT * FROM venues').all();
const AURORA = venues[0], FOUNDRY = venues[1];

const TRAVEL = [
  [AURORA.id, FOUNDRY.id, 'Shuttle', 27, 0, 'Free conference shuttle from Aurora north entrance. Departs every 20 minutes, 07:00–01:00. Queues get long between sessions.'],
  [AURORA.id, FOUNDRY.id, 'Rideshare', 18, 23.5, 'Pickup is on Level 1 west curb. Surge pricing is brutal right after the keynote lets out.'],
  [AURORA.id, FOUNDRY.id, 'Taxi', 19, 31.0, 'Taxi rank outside the Expo Hall. No app required, no surge.'],
  [AURORA.id, FOUNDRY.id, 'Walk', 96, 0, 'Technically possible. It is Las Vegas in October. Please do not.'],
  [FOUNDRY.id, AURORA.id, 'Shuttle', 29, 0, 'Departs from the Foundry loading yard every 20 minutes. Last shuttle back is 01:15.'],
  [FOUNDRY.id, AURORA.id, 'Rideshare', 18, 23.5, 'Pickup on Ironworks Road. Coverage is thinner out here — expect a 5 minute wait.'],
  [FOUNDRY.id, AURORA.id, 'Taxi', 19, 31.0, 'Call ahead. There is rarely a taxi waiting at the Yards.'],
  [FOUNDRY.id, AURORA.id, 'Walk', 96, 0, 'Still no.'],
];
const vtStmt = prep('INSERT INTO venue_travel (from_venue_id,to_venue_id,mode,minutes,cost_usd,note) VALUES (?,?,?,?,?,?)');
TRAVEL.forEach((t) => vtStmt.run(...t));

/* =============================== ROOMS ============================= */
// [name, building, floor, levelOrder, capacity, kind, walkMins, mapX, mapY, amenities]
const AURORA_ROOMS = [
  ['Nebula Main Stage', 'Main Hall', 'Level 1', 1, 4200, 'Keynote', 4, 500, 180, 'Livestream,Hearing loop,Overflow seating,Live captions'],
  ['Quasar Hall', 'Main Hall', 'Level 1', 1, 1800, 'Keynote', 5, 240, 150, 'Livestream,Hearing loop,Live captions'],
  ['Pulsar Theater', 'Main Hall', 'Level 1', 1, 1200, 'Theater', 6, 760, 150, 'Livestream,Tiered seating'],
  ['Vector Hall A', 'Main Hall', 'Level 2', 2, 650, 'Breakout', 7, 220, 330, 'Recorded,Power at every seat'],
  ['Vector Hall B', 'Main Hall', 'Level 2', 2, 650, 'Breakout', 7, 400, 330, 'Recorded,Power at every seat'],
  ['Vector Hall C', 'Main Hall', 'Level 2', 2, 480, 'Breakout', 8, 580, 330, 'Recorded'],
  ['Tensor 201', 'Main Hall', 'Level 2', 2, 320, 'Breakout', 9, 760, 330, 'Whiteboards'],
  ['Tensor 202', 'Main Hall', 'Level 2', 2, 320, 'Breakout', 9, 860, 330, 'Whiteboards'],
  ['Tensor 203', 'Main Hall', 'Level 2', 2, 280, 'Breakout', 10, 760, 420, 'Whiteboards'],
  ['Tensor 204', 'Main Hall', 'Level 2', 2, 280, 'Breakout', 10, 860, 420, ''],
  ['Gradient Studio', 'Main Hall', 'Level 3', 3, 180, 'Workshop', 11, 260, 520, 'Power at every seat,Wired network,Whiteboards'],
  ['Latent Lab', 'Main Hall', 'Level 3', 3, 140, 'Workshop', 12, 400, 520, 'Power at every seat,Wired network'],
  ['The Attention Room', 'Main Hall', 'Level 3', 3, 160, 'Workshop', 12, 540, 520, 'Power at every seat'],
  ['Context Window', 'Main Hall', 'Level 3', 3, 90, 'Roundtable', 13, 680, 520, 'Quiet space,Round tables'],
  ['Expo Stage North', 'Expo Hall', 'Level 1', 1, 250, 'Lightning', 9, 140, 620, 'Open plan,Standing room'],
  ['Expo Stage South', 'Expo Hall', 'Level 1', 1, 250, 'Lightning', 10, 380, 620, 'Open plan,Standing room'],
  ['The Sandbox', 'Expo Hall', 'Level 1', 1, 300, 'Demo', 11, 620, 620, 'Demo pods,Open plan'],
  ['Neon Lounge', 'Skyline Tower', 'Level 24', 24, 120, 'Roundtable', 16, 880, 560, 'City view,Round tables,Bar service'],
  ['Desert Terrace', 'Skyline Tower', 'Rooftop', 25, 400, 'Social', 18, 880, 660, 'Outdoor,Bar service,City view'],
];
const FOUNDRY_ROOMS = [
  ['The Blast Furnace', 'Foundry Main', 'Ground', 1, 1400, 'Keynote', 5, 480, 200, 'Livestream,Industrial acoustics,Live captions'],
  ['Hangar Seven', 'Foundry Main', 'Ground', 1, 900, 'Theater', 7, 200, 200, 'Recorded,Hangar doors open'],
  ['The Cooling Tower', 'Foundry Main', 'Mezzanine', 2, 380, 'Breakout', 9, 760, 200, 'Recorded,Spiral stairs only'],
  ['Ironworks A', 'Foundry Main', 'Ground', 1, 420, 'Breakout', 8, 200, 380, 'Recorded,Power at every seat'],
  ['Ironworks B', 'Foundry Main', 'Ground', 1, 420, 'Breakout', 8, 380, 380, 'Recorded,Power at every seat'],
  ['The Boiler Room', 'Foundry Main', 'Basement', 0, 200, 'Workshop', 11, 560, 380, 'Power at every seat,Wired network,No phone signal'],
  ['The Crucible', 'Foundry Main', 'Mezzanine', 2, 160, 'Workshop', 12, 760, 380, 'Power at every seat,Whiteboards'],
  ['Loading Dock 3', 'Yard', 'Ground', 1, 260, 'Demo', 13, 200, 560, 'Outdoor cover,Hardware benches,Power tools'],
  ['Cargo Bay', 'Yard', 'Ground', 1, 340, 'Breakout', 14, 440, 560, 'Recorded,Hardware benches'],
  ['The Smelter', 'Yard', 'Ground', 1, 700, 'Social', 15, 700, 560, 'Outdoor,Bar service,Live music'],
];
const rStmt = prep(`INSERT INTO rooms (venue_id,name,building,floor,level_order,capacity,kind,walk_minutes,map_x,map_y,amenities,accessible)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
AURORA_ROOMS.forEach((r) => rStmt.run(AURORA.id, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], 1));
FOUNDRY_ROOMS.forEach((r) => rStmt.run(FOUNDRY.id, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9],
  ['The Cooling Tower', 'The Boiler Room'].includes(r[0]) ? 0 : 1));
const rooms = db.prepare('SELECT * FROM rooms').all();
const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

/* ============================== TRACKS ============================= */
const TRACKS = [
  ['Foundation Models', 'violet', 'Pretraining, scaling behaviour, architecture research and the moving frontier of raw model capability.'],
  ['Agents & Tool Use', 'cyan', 'Autonomous agents, tool calling, planning loops, multi-agent orchestration and the harnesses that hold them together.'],
  ['RAG & Retrieval', 'emerald', 'Embeddings, vector stores, hybrid search, chunking strategy and actually grounding a generation in your data.'],
  ['AI Engineering', 'amber', 'Evals, prompt versioning, CI for probabilistic systems, observability and the day-2 realities of LLM applications.'],
  ['Inference & Hardware', 'orange', 'Serving, quantization, KV caching, accelerators, and the uncomfortable economics of a token.'],
  ['Responsible AI', 'rose', 'Safety, red teaming, harm evaluation, governance and what the EU AI Act means for your next release.'],
  ['Multimodal', 'fuchsia', 'Vision, audio, video, documents — and the models that reason across all of them at once.'],
  ['AI in Production', 'sky', 'War stories from teams running AI at scale, and a full accounting of everything that broke on the way.'],
  ['Developer Experience', 'lime', 'AI across the SDLC: coding agents, review automation, spec-driven delivery and the new shape of the inner loop.'],
  ['AI Product & Strategy', 'teal', 'Pricing, adoption curves, org design, and how to decide what is genuinely worth building.'],
];
const tStmt = prep('INSERT INTO tracks (name,slug,color,description) VALUES (?,?,?,?)');
TRACKS.forEach(([n, c, d]) => tStmt.run(n, slug(n), c, d));
const tracks = db.prepare('SELECT * FROM tracks').all();
const trackBy = Object.fromEntries(tracks.map((t) => [t.name, t]));

/* =============================== TAGS ============================== */
const TAGS = {
  topic: ['Evaluation', 'Prompt Engineering', 'Fine-Tuning', 'Retrieval', 'Embeddings', 'Agent Design', 'Tool Calling', 'Context Engineering', 'Guardrails', 'Hallucination', 'Model Routing', 'Distillation', 'Quantization', 'Synthetic Data', 'Human-in-the-Loop', 'Observability', 'Cost Optimization', 'Latency', 'Prompt Injection', 'Red Teaming', 'Governance', 'Compliance', 'Data Quality', 'Memory Systems', 'Long Context', 'Reasoning', 'Structured Output', 'Multi-Agent', 'Code Generation', 'Document AI', 'Speech', 'Computer Vision', 'Recommenders', 'Search Relevance', 'Benchmarking'],
  tech: ['Python', 'TypeScript', 'Rust', 'Go', 'Kubernetes', 'PostgreSQL', 'Open Weights', 'GPU', 'Edge', 'Serverless', 'Streaming', 'MCP', 'OpenTelemetry', 'CI/CD', 'Terraform'],
  audience: ['Engineers', 'Platform Teams', 'Data Teams', 'Product Managers', 'Engineering Leaders', 'Security Teams', 'SREs', 'Researchers', 'Startups', 'Enterprise', 'Regulated Industries'],
  vibe: ['Case Study', 'Hands-On', 'Opinionated', 'Live Demo', 'Failure Stories', 'Beginner Friendly', 'Deeply Technical', 'No Slides'],
};
const tagStmt = prep('INSERT INTO tags (name,slug,kind) VALUES (?,?,?)');
Object.entries(TAGS).forEach(([kind, list]) => list.forEach((n) => tagStmt.run(n, slug(n), kind)));
const tagRows = db.prepare('SELECT * FROM tags').all();
const tagsByKind = (k) => tagRows.filter((t) => t.kind === k);

/* ============================= SPEAKERS ============================ */
/**
 * First names are split by presentation so a speaker's name matches their
 * portrait. Which pool a speaker draws from is decided by their photo, not the
 * other way round — see server/avatar-presentation.json.
 */
const FIRST_M = ['Dmitri','Tobias','Marcus','Kenji','Elias','Idris','Hugo','Viktor','Theo','Rahul','Omar','Felix','Anton','Casper','Santiago','Kwame','Rafael','Bruno','Diego','Yusuf','Arne','Emil','Pierre','Samir','Otto','Magnus','Milo','Bastien','Ravi','Tariq','Matteo','Lars','Osei','Tomas','Bram','Oskar','Lucian','Malik','Aurelio','Jamal','Nikolai','Rune','Cormac','Anders','Mateusz','Ignacio','Tomasz','Joaquin','Henrik','Soren'];
const FIRST_F = ['Maya','Aisha','Priya','Lena','Sofia','Nadia','Ines','Clara','Yuki','Amara','Noor','Camille','Freya','Astrid','Zara','Mira','Leila','Ivy','Greta','Anouk','Saoirse','Tamsin','Hanne','Lucia','Neha','Ingrid','Delphine','Rosa','Amelie','Sanne','Nia','Ilse','Elke','Solveig','Adeola','Birgit','Imani','Chiara','Fenna','Marit','Esther','Noa','Farida','Sigrid','Renske','Hana','Katinka','Elin','Ayla','Divya','Liv','Idun','Annika','Beatriz','Carmen','Dalia','Eira','Johanna','Mariam','Rosalie'];
const LAST = ['Okonkwo','Petrov','Rahman','Lindqvist','Venkatesan','Delacroix','Hoffmann','Nakamura','Almeida','Vasquez','Haddad','Fitzgerald','Moreau','Abubakar','Novak','Silva','Tanaka','Diallo','Kovac','Bensaid','Papadakis','Laurent','Krishnan','Bergstrom','El-Amin','Halvorsen','Mansour','Wagner','Chatterjee','Sokolov','Nasser','Jensen','Whitfield','Ortega','Vandenberg','Mensah','de Vries','Costa','Byrne','Ferreira','Ashworth','Navarro','Solberg','Ozturk','Marchetti','Nilsson','Bhattacharya','Lindgren','Rousseau','Dahl','Khoury','Ellery','Brandt','Fontaine','Yamamoto','Delgado','Eriksen','Beaumont','Ashby','Visser','Radcliffe','Adeyemi','Girard','Boelens','Iyer','Farouk','Winters','Thorne','Vasilenko','Okafor','Bakker','Castellanos','Lindholm','Quintero','Aaltonen','Mbeki','Serrano','Hedlund','Duarte','Karlsen','Osborne','Pereira','Wieczorek','Amadi','Fontana','Skov','Toussaint','Vermeulen','Zielinski','Aguirre','Bjornsson','Cordova','Falk','Ghazali','Holm','Jadhav','Kestrel','Lauridsen'];
const COMPANIES = ['Hyperion Labs','Vertex Robotics','Northwind AI','Lumen Systems','Kestrel Research','Foundry Compute','Basalt','Meridian Health AI','Arcadia Bank','Volta Motors','Praxis Legal','Helix Bio','Orbital Retail','Cartographer','SignalFire Energy','Tessellate','Blackbird Security','Cobalt Studio','Riverbend Insurance','Atlas Logistics','Quanta Telecom','Sundial','Nimbus Cloud','Grove Education','Hearth Media','Ironwood Manufacturing','Solstice Games','Wayfare Travel','Pinnacle Consulting','Bramble','Longitude','Keystone Gov Digital','Cinder','Fathom Analytics','Aperture Media','Waypoint Labs','Trellis','Mosaic Retail','Halcyon','Driftwood Ventures','Palisade Robotics','Verdant Agritech','Clearwater Utilities','Northgate Rail'];
const JOBS = ['Principal Research Scientist','Staff ML Engineer','Head of AI Platform','Distinguished Engineer','VP of Engineering','Director of Applied AI','Founding Engineer','Research Lead','Principal AI Architect','Senior Staff Engineer','Chief Scientist','Head of Developer Experience','Lead MLOps Engineer','Director of Product, AI','Principal Security Researcher','Head of Model Evaluation','Staff Infrastructure Engineer','AI Engineering Manager','Chief Technology Officer','Head of Responsible AI','Senior Research Engineer','Platform Architect','Developer Advocate','Head of Data','Staff Applied Scientist'];
const CITIES = [['San Francisco','United States'],['Stockholm','Sweden'],['Berlin','Germany'],['Tokyo','Japan'],['Bengaluru','India'],['London','United Kingdom'],['Amsterdam','Netherlands'],['Toronto','Canada'],['Paris','France'],['São Paulo','Brazil'],['Lagos','Nigeria'],['Singapore','Singapore'],['Sydney','Australia'],['Kraków','Poland'],['Barcelona','Spain'],['Nairobi','Kenya'],['Seoul','South Korea'],['Dublin','Ireland'],['Oslo','Norway'],['Lisbon','Portugal'],['Austin','United States'],['New York','United States'],['Zurich','Switzerland'],['Tel Aviv','Israel'],['Mexico City','Mexico'],['Vancouver','Canada'],['Helsinki','Finland'],['Copenhagen','Denmark']];
const LANGS = ['English','Spanish','German','French','Japanese','Portuguese','Swedish','Hindi','Mandarin','Dutch','Arabic','Korean','Polish','Italian'];

const BIO_OPEN = ['spends most days','has spent the last decade','leads a small team that is','writes and speaks about','builds tooling for engineers who are','works at the messy seam between research and production,','runs the platform group responsible for','has shipped three generations of systems aimed at'];
const BIO_MID = ['turning research prototypes into systems that survive real traffic','making evaluation boring enough that teams actually run it','shaving latency off inference paths nobody else wants to touch','convincing large organizations that a good retrieval index beats a bigger model','designing agent harnesses that fail loudly instead of quietly','teaching product teams to write specs an agent can actually execute','building the guardrails that let a bank put a model in front of customers','dragging a twenty-year-old codebase into the age of coding agents','measuring what models actually do rather than what the demo suggested','keeping a fleet of accelerators busy without setting money on fire','replacing hand-written glue with systems that explain themselves','making document pipelines work on the PDFs nobody wants to open'];
const BIO_END = ['Previously at a company you have heard of, on a team you have not.','Maintains two open-source projects and regrets exactly one of them.','Believes most AI problems are data problems wearing a costume.','Has strong opinions about tokenizers, loosely held.','Once debugged a production outage from a gondola in Venice.','Writes a newsletter read by more people than they are comfortable with.','Will happily argue about eval design over coffee.','Co-author of the paper everyone cites and nobody finishes.','Reformed data scientist, recovering Kubernetes operator.','Thinks the hardest part of AI engineering is still naming things.','Keeps a running list of things that worked in the demo and nowhere else.','Has given this talk three times and rewritten it twice.'];

const spStmt = prep(`INSERT INTO speakers (name,pronouns,job_title,company,bio,initials,accent,image_url,city,country,languages,expertise,years_exp,talks_given,avg_rating,first_time,twitter,github,linkedin,website,featured)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const seen = new Set();

/**
 * Two of the seeded attendees are also presenting. Their speaker profiles are
 * written explicitly (not generated) so the app can link a signed-in attendee
 * to their own sessions and show them a speaker view.
 */
const SPEAKING_ATTENDEES = [
  {
    name: 'Amara Diallo', pronouns: 'she/her', jobTitle: 'Director of Applied AI', company: 'Meridian Health AI',
    bio: 'Amara leads the team putting clinical decision support in front of doctors who are, correctly, sceptical of it. Ten years in regulated ML, four of them spent learning that an audit trail is a product feature. Believes most AI governance is just engineering discipline with a lawyer in the room.',
    city: 'Boston', country: 'United States', languages: 'English,French',
    expertise: 'Governance,Compliance,Human-in-the-Loop,Hallucination',
    yearsExp: 14, talksGiven: 23, rating: 4.72, accent: 'rose',
    twitter: '@amaradiallo', github: 'amaradiallo', linkedin: 'in/amaradiallo', website: 'https://amaradiallo.dev',
  },
  {
    name: 'Priya Venkatesan', pronouns: 'she/her', jobTitle: 'Founding Engineer', company: 'Waypoint Labs',
    bio: 'Priya is six people into building an agent platform that large companies trust with their audit logs. Previously spent five years on infrastructure at a company that shall remain a logo on a slide. Ships on Fridays, and will defend it.',
    city: 'Oakland', country: 'United States', languages: 'English,Tamil',
    expertise: 'Multi-Agent,Memory Systems,Cost Optimization,Structured Output',
    yearsExp: 11, talksGiven: 9, rating: 4.55, accent: 'cyan',
    twitter: '@priyavenkat', github: 'priyavenkat', linkedin: 'in/priyavenkatesan', website: null,
  },
];
SPEAKING_ATTENDEES.forEach((s) => {
  seen.add(s.name);
  spStmt.run(s.name, s.pronouns, s.jobTitle, s.company, s.bio, initialsOf(s.name), s.accent, null,
    s.city, s.country, s.languages, s.expertise, s.yearsExp, s.talksGiven, s.rating, 0,
    s.twitter, s.github, s.linkedin, s.website, 1);
});

for (let i = 0; i < 108; i++) {
  // ids run 1,2 for the two hand-written speaking attendees, then 3 upward —
  // so this speaker's portrait is speaker-{i + 3}.jpg
  const presentation = PRESENTATION[String(i + 3)] ?? (chance(0.5) ? 'm' : 'f');
  const firstNames = presentation === 'm' ? FIRST_M : FIRST_F;

  let name; do { name = `${pick(firstNames)} ${pick(LAST)}`; } while (seen.has(name));
  seen.add(name);
  const h = name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const [city, country] = pick(CITIES);
  const first = name.split(' ')[0];
  const firstTime = chance(0.22);
  const pronouns = presentation === 'm'
    ? pick(['he/him', 'he/him', 'he/him', 'he/they'])
    : pick(['she/her', 'she/her', 'she/her', 'she/they']);

  spStmt.run(
    name, pronouns, pick(JOBS), pick(COMPANIES),
    `${first} ${pick(BIO_OPEN)} ${pick(BIO_MID)}. ${pick(BIO_END)}`,
    initialsOf(name), pick(ACCENTS),
    null, // image_url — drop generated portraits in here later
    city, country,
    ['English', ...(chance(0.45) ? pickN(LANGS.filter((l) => l !== 'English'), int(1, 2)) : [])].join(','),
    pickN(tagsByKind('topic'), int(2, 4)).map((t) => t.name).join(','),
    int(4, 22), firstTime ? 0 : int(2, 60), firstTime ? 0 : flt(3.9, 4.9, 2),
    firstTime ? 1 : 0,
    chance(0.7) ? `@${h}` : null,
    chance(0.6) ? h : null,
    chance(0.75) ? `in/${h}` : null,
    chance(0.3) ? `https://${h}.dev` : null,
    i < 10 ? 1 : 0,
  );
}
// Attach a portrait to every speaker we have a file for.
db.prepare('SELECT id FROM speakers').all().forEach(({ id }) => {
  const file = `speaker-${String(id).padStart(3, '0')}.jpg`;
  if (AVATARS.has(file)) {
    db.prepare('UPDATE speakers SET image_url = ? WHERE id = ?').run(`/avatars/${file}`, id);
  }
});

const speakers = db.prepare('SELECT * FROM speakers').all();
/** Generated sessions draw from everyone except the two hand-assigned attendees. */
const ATTENDEE_SPEAKER_NAMES = new Set(SPEAKING_ATTENDEES.map((s) => s.name));
const assignable = speakers.filter((s) => !ATTENDEE_SPEAKER_NAMES.has(s.name));

/* ============================== SESSIONS =========================== */
const T = [
  '{thing} in Production: {lesson}', 'Beyond {buzz}: {claim}', 'How We {verb} {thing} at {scale}',
  '{thing}, Honestly', 'The {adj} Guide to {thing}', 'Stop {ger}. Start {ger2}.',
  '{thing} Is Not {buzz}', 'What {n} Million {unit} Taught Us About {thing}',
  'Building {thing} That {survive}', '{thing}: From {a} to {b}',
  'We {verb} {thing} for {n} Months. Here Is What Broke.', '{adj} {thing} for {audience}',
  'The Case Against {thing}', '{thing} When You Cannot {constraint}', 'Rewriting {thing} in Anger',
];
const THINGS = ['Agent Harnesses','Eval Suites','Retrieval Pipelines','Prompt Versioning','Context Windows','Tool Calling','Model Routing','Fine-Tuning','Structured Output','Guardrails','Vector Indexes','Inference Caching','Multi-Agent Systems','Synthetic Data','Human Review Loops','Token Budgets','Coding Agents','Model Observability','Hallucination Detection','Embedding Drift','LLM Gateways','Semantic Caching','RAG Chunking','Reward Models','Speculative Decoding','Prompt Injection Defense','Agentic Workflows','Model Cards','Batch Inference','Streaming UIs','Function Schemas','Memory Systems','Long-Context Reasoning','Distillation','Quantization','Red Team Automation','Data Contracts','Feature Stores','Shadow Deployments','Continuous Evaluation','Document Extraction','Voice Agents','Vision Pipelines','Recommendation Models','Spec-Driven Delivery','Issue Triage Bots','Release Automation','On-Call Copilots','Knowledge Graphs','Reranking'];
const BUZZ = ['AGI','Vibe Coding','Prompt Engineering','Chatbots','Copilots','The Hype Cycle','Bigger Models','Benchmarks','Zero-Shot','Autonomy','Agentic Everything'];
const VERBS = ['Rebuilt','Shipped','Scaled','Broke','Instrumented','Automated','Replaced','Rewrote','Evaluated','Migrated','Deleted','Open-Sourced'];
const GER = ['Prompt Tweaking','Guessing','Cherry-Picking Demos','Chasing Benchmarks','Writing Glue Code','Manual QA','Over-Chunking','Hand-Rolling Agents','Fine-Tuning First','Trusting Vibes','Shipping on Fridays'];
const GER2 = ['Measuring','Shipping','Testing','Instrumenting','Versioning','Automating','Retrieving','Grounding','Evaluating','Iterating','Deleting Code'];
const ADJ = ['Pragmatic','Unreasonably Effective','Boring','Opinionated','Field','No-Nonsense','Grown-Up','Hostile','Complete','Reluctant','Uncomfortable'];
const SCALE = ['Planet Scale','40 Million Users','Fortune 50 Scale','Ten Thousand Requests a Second','Eleven Data Centers','a Regulated Bank','a 2,000-Engineer Org','the Edge','Half a Petabyte'];
const LESSON = ['The Parts Nobody Demos','Six Postmortems Later','A Field Report','What the Benchmarks Missed','Lessons From the On-Call Rotation','The Bill Came Due','Year Two'];
const CLAIM = ['What Actually Moves the Needle','Engineering Discipline for Probabilistic Systems','Measuring What Matters','The Unglamorous Work That Wins','A Sober Look at the Data'];
const SURVIVE = ['Survive Contact With Users','Do Not Page You at 3AM','Get Audited and Pass','Scale Past the Demo','Your Successor Can Maintain','Hold Up Under Adversarial Load'];
const AUD = ['Skeptical Engineers','Platform Teams','Regulated Industries','Small Teams','Legacy Codebases','Product Managers','SREs','Data Teams','Hardware People'];
const UNIT = ['Tokens','Requests','Traces','Evals','Agent Runs','Documents','Pull Requests','Support Tickets'];
const AB = [['Notebook','Production'],['Prototype','Platform'],['Demo','Deployment'],['Chaos','Contract'],['Vibes','Metrics'],['Prompt','Pipeline'],['Idea','Incident-Free'],['Spreadsheet','Service']];
const CONSTRAINT = ['Send Data to the Cloud','Retrain','Add Latency','Hire','Read the Logs','Ship Weekly','Trust the Input'];

const SUBTITLES = ['A field report from the last eighteen months','What two years and four rewrites taught us','With traces, numbers, and one very bad night','An honest accounting, including the parts that failed','Code, benchmarks, and a reference implementation you can steal','Told through three production incidents','Everything we wish someone had told us in 2024',null, null, null];

const OPEN = ['Everybody demos this. Almost nobody runs it.','We thought this would take a sprint. It took two quarters.','This is the talk you want before you sign the contract, not after.','It started as a hack week project and ended up on the critical path.','Half of what the ecosystem tells you about this is accidentally wrong.','We replaced a system that worked with one that works better, and it nearly went badly.','There is a version of this that fits on a slide and a version that fits in a runbook. This is the second one.','A year ago we could not answer a basic question about our own system. Here is how we fixed that.','The demo took an afternoon. Production took eleven months.','We were wrong about this twice, publicly, and it cost us a quarter.'];
const BODY = ['We walk through the architecture end to end, including the two designs we abandoned and why.','Expect real numbers: latency distributions, cost per request, and the eval scores that convinced leadership.','You leave with a reference implementation, a checklist, and a short list of things not worth bothering with.','We look at three production incidents in detail, with traces, and reconstruct what the system was actually doing.','Deliberately code-heavy — bring a laptop if you want to follow along.','We cover the organizational side too, because the hardest constraints here are rarely technical.','Includes a live demo against a real workload, running on a single node.','We compare four approaches on one benchmark and show exactly where each falls apart.','There is a cost model in the appendix that you can drop your own numbers into.'];
const CLOSE = ['Aimed at engineers who have already shipped something and now have to keep it alive.','No prior experience with the specific tooling is assumed, but you should be comfortable reading code.','If you are evaluating vendors in this space, come with questions.','Suitable for anyone who has ever written the sentence "it works locally".','Best for teams somewhere between their first prototype and their first audit.','Bring your war stories — the last fifteen minutes are open Q&A.','You will not need a GPU, but you will need opinions.'];
const TAKEAWAY = ['A concrete architecture you can copy on Monday','How to tell a real regression from sampling noise','Where this approach stops working, and what to do then','A cost model you can run your own numbers through','The three metrics worth alerting on','A checklist for your next design review','What to measure before you change anything','How to make the case internally without overselling','Which failure modes are worth engineering around and which are not'];
const PREREQS = ['Comfortable reading Python. No ML background required.','You should have deployed at least one LLM feature to real users.','Bring a laptop with Node 22+ and Docker installed. Setup guide linked below.','Familiarity with vector search concepts helps but is not required.','Some experience with CI pipelines assumed.',null,null,null];

const FORMATS = ['Talk','Talk','Talk','Talk','Deep Dive','Panel','Case Study','Fireside Chat'];
const LEVELS = ['Beginner','Intermediate','Intermediate','Intermediate','Advanced','Advanced'];

const makeTitle = () => {
  const [a, b] = pick(AB);
  return pick(T)
    .replace('{thing}', pick(THINGS)).replace('{buzz}', pick(BUZZ)).replace('{verb}', pick(VERBS))
    .replace('{ger2}', pick(GER2)).replace('{ger}', pick(GER)).replace('{adj}', pick(ADJ))
    .replace('{scale}', pick(SCALE)).replace('{lesson}', pick(LESSON)).replace('{claim}', pick(CLAIM))
    .replace('{survive}', pick(SURVIVE)).replace('{audience}', pick(AUD)).replace('{unit}', pick(UNIT))
    .replace('{constraint}', pick(CONSTRAINT))
    .replace('{n}', String(pick([3, 6, 9, 12, 18, 40, 100, 250]))).replace('{a}', a).replace('{b}', b);
};
const makeAbstract = () => `${pick(OPEN)} ${pick(BODY)} ${pick(CLOSE)}`;

const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const SLOTS = [
  ['09:00', '09:45'], ['10:15', '11:00'], ['11:30', '12:15'],
  ['13:30', '14:15'], ['14:45', '15:30'], ['16:00', '16:45'], ['17:15', '18:00'],
];
const KEYNOTES = [
  ['The Model Is the Easy Part', 'Four years into the applied AI era, the differentiator is no longer which model you picked — it is the system you wrapped around it. An opening look at where the engineering leverage has actually moved, and what that means for the next four years of building.', 'Foundation Models'],
  ['Agents That Earn Their Keep', 'Autonomous agents went from party trick to line item in about eighteen months. This keynote covers the handful of patterns that consistently survive production, the much larger set that does not, and how to tell them apart before you commit a roadmap to it.', 'Agents & Tool Use'],
  ['Evaluation Is the New Compiler', 'Probabilistic systems need a feedback loop as tight as the one we spent forty years building for deterministic code. A case for treating evals as core infrastructure — versioned, in CI, owned by the team that ships.', 'AI Engineering'],
  ['The Economics of a Token', 'Inference cost curves, hardware roadmaps, and the arithmetic of running AI features at real scale. A closing look at what gets cheap, what stubbornly does not, and how to plan a product around the difference.', 'Inference & Hardware'],
];

const sStmt = prep(`INSERT INTO sessions
  (title,subtitle,abstract,takeaways,prerequisites,track_id,room_id,day,starts_at,ends_at,duration_mins,format,level,language,capacity,seats_taken,is_keynote,is_recorded,requires_rsvp,livestream,recording_url,slides_url,repo_url,avg_rating,rating_count)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const ssStmt = prep('INSERT OR IGNORE INTO session_speakers (session_id,speaker_id,role) VALUES (?,?,?)');
const stStmt = prep('INSERT OR IGNORE INTO session_tags (session_id,tag_id) VALUES (?,?)');

const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const mainStage = rooms.find((r) => r.name === 'Nebula Main Stage');
const blastFurnace = rooms.find((r) => r.name === 'The Blast Furnace');
const bookable = rooms.filter((r) => !['Social'].includes(r.kind) && r.id !== mainStage.id);

const usedTitles = new Set();
/**
 * Speaking slots are dealt from a weighted pool rather than round-robin.
 * Round-robin gave almost everyone exactly the same number of talks; real
 * programmes have a long tail — most people speak once or twice, headliners
 * turn up everywhere.
 */
const buildSpeakerPool = () => {
  const pool = [];
  assignable.forEach((sp) => {
    const appearances = sp.featured ? int(4, 6)
      : chance(0.42) ? 1
      : chance(0.62) ? 2
      : int(3, 4);
    for (let n = 0; n < appearances; n++) pool.push(sp);
  });
  // Fisher-Yates with the seeded PRNG, so the deal stays deterministic.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

let speakerPool = buildSpeakerPool();
const nextSpeaker = () => {
  if (!speakerPool.length) speakerPool = buildSpeakerPool();
  return speakerPool.pop();
};

function addSession(opts) {
  const room = opts.room;
  const dur = mins(opts.end) - mins(opts.start);
  const recorded = opts.recorded ?? (room.amenities.includes('Recorded') || room.amenities.includes('Livestream'));
  const ratingCount = int(0, 180);
  const id = sStmt.run(
    opts.title, opts.subtitle ?? null, opts.abstract,
    pickN(TAKEAWAY, 3).join('|'), opts.prereq ?? null,
    opts.track.id, room.id, opts.day, opts.start, opts.end, dur,
    opts.format, opts.level, opts.language ?? 'English',
    room.capacity, opts.seats, opts.keynote ? 1 : 0,
    recorded ? 1 : 0, opts.rsvp ? 1 : 0, room.amenities.includes('Livestream') ? 1 : 0,
    recorded && chance(0.75) ? `https://recordings.orbitconf.dev/s/${usedTitles.size}` : null,
    chance(0.55) ? `https://slides.orbitconf.dev/s/${usedTitles.size}` : null,
    chance(0.3) ? `https://github.com/orbitconf/demo-${usedTitles.size}` : null,
    ratingCount ? flt(3.4, 4.9, 2) : 0, ratingCount,
  ).lastInsertRowid;

  const nSpeakers = opts.format === 'Panel' ? int(3, 4) : opts.format === 'Fireside Chat' ? 2 : chance(0.2) ? 2 : 1;
  for (let i = 0; i < nSpeakers; i++) {
    ssStmt.run(id, nextSpeaker().id, opts.format === 'Panel' && i === 0 ? 'Moderator' : opts.format === 'Fireside Chat' && i === 0 ? 'Host' : 'Speaker');
  }
  [...pickN(tagsByKind('topic'), int(2, 4)), ...pickN(tagsByKind('tech'), int(0, 2)),
   ...pickN(tagsByKind('audience'), int(1, 2)), ...pickN(tagsByKind('vibe'), int(1, 2))]
    .forEach((t) => stStmt.run(id, t.id));
  return id;
}

DAYS.forEach((day, dayIdx) => {
  const [kt, ka, ktrack] = KEYNOTES[dayIdx];
  const kRoom = dayIdx === 2 ? blastFurnace : mainStage; // Wednesday's keynote is across town. On purpose.
  const kid = addSession({
    title: kt, subtitle: `Day ${dayIdx + 1} opening keynote`, abstract: ka, track: trackBy[ktrack],
    room: kRoom, day, start: '08:00', end: '08:45', format: 'Keynote', level: 'All Levels',
    seats: Math.round(kRoom.capacity * flt(0.88, 0.99, 2)), keynote: true, recorded: true,
  });
  db.prepare('DELETE FROM session_speakers WHERE session_id = ?').run(kid);
  assignable.filter((s) => s.featured).slice(dayIdx * 3, dayIdx * 3 + int(1, 2)).forEach((s) => ssStmt.run(kid, s.id, 'Speaker'));

  /*
   * Real conferences run a room all day and give it a theme, rather than
   * scattering talks across whichever room happens to be free. Doing the same
   * here keeps the programme believable and, more practically, makes the grid
   * view a dense matrix instead of a mostly-empty spreadsheet.
   */
  const auroraRooms = bookable.filter((r) => r.venue_id === AURORA.id);
  const foundryRooms = bookable.filter((r) => r.venue_id === FOUNDRY.id);
  const todaysRooms = [
    ...pickN(auroraRooms, int(5, 6)),
    ...pickN(foundryRooms, 2), // always something across town
  ].sort((a, b) => a.venue_id - b.venue_id || a.name.localeCompare(b.name));

  const roomTrack = new Map(todaysRooms.map((r) => [r.id, pick(tracks)]));

  SLOTS.forEach(([start, end]) => {
    todaysRooms.forEach((room) => {
      if (!chance(0.88)) return; // the occasional empty slot — rooms get cleaned
      let title, guard = 0;
      do { title = makeTitle(); guard++; } while (usedTitles.has(title) && guard < 30);
      usedTitles.add(title);
      const isWorkshop = room.kind === 'Workshop';
      const format = isWorkshop ? (chance(0.8) ? 'Workshop' : 'Deep Dive')
        : room.kind === 'Lightning' ? 'Lightning'
        : room.kind === 'Roundtable' ? 'Roundtable'
        : room.kind === 'Demo' ? (chance(0.5) ? 'Demo' : 'Lightning')
        : pick(FORMATS);
      addSession({
        title, subtitle: pick(SUBTITLES), abstract: makeAbstract(),
        prereq: isWorkshop ? (pick(PREREQS) ?? 'Bring a laptop. Setup instructions are linked from this page.') : pick(PREREQS),
        track: roomTrack.get(room.id), room, day, start, end, format,
        level: isWorkshop ? pick(['Intermediate', 'Advanced']) : pick(LEVELS),
        language: chance(0.05) ? pick(['Spanish', 'Japanese', 'German']) : 'English',
        seats: Math.min(room.capacity, Math.round(room.capacity * flt(0.22, 1.04, 2))),
        rsvp: isWorkshop || room.kind === 'Roundtable',
      });
    });
  });
});

/* social events at the two party rooms */
const terrace = rooms.find((r) => r.name === 'Desert Terrace');
const smelter = rooms.find((r) => r.name === 'The Smelter');
[
  ['Opening Night Reception', terrace, DAYS[0], '19:00', '22:00', 'Drinks, small plates and a view of the Strip. Badge required, plus-ones welcome.'],
  ['Speakers & First-Timers Mixer', terrace, DAYS[1], '18:30', '20:30', 'Deliberately low-key. If this is your first ORBIT, start here — every speaker wearing an orange lanyard has volunteered to be interrupted.'],
  ['The Foundry Block Party', smelter, DAYS[2], '19:00', '01:00', 'Live music in the yard, food trucks, and the hardware demos left running all night. Last shuttle back to Aurora is 01:15.'],
  ['Closing Party', terrace, DAYS[3], '18:30', '23:00', 'The one where everyone swaps notes on what they are actually going to build. Cocktails and a very serious taco situation.'],
].forEach(([title, room, day, start, end, abstract]) => {
  addSession({
    title, subtitle: 'Social event', abstract, track: trackBy['AI Product & Strategy'],
    room, day, start, end, format: 'Social', level: 'All Levels',
    seats: Math.round(room.capacity * flt(0.6, 0.95, 2)), recorded: false,
  });
});

/**
 * Assign the two speaking attendees to concrete sessions, replacing whichever
 * generated speaker was on them. Each gets a spread across days and venues.
 */
const assignSpeaker = (speakerName, picks) => {
  const sp = db.prepare('SELECT id FROM speakers WHERE name = ?').get(speakerName);
  picks.forEach(({ day, startsAt, role = 'Speaker' }) => {
    const target = db.prepare(
      'SELECT id FROM sessions WHERE day = ? AND starts_at = ? AND is_keynote = 0 ORDER BY capacity DESC LIMIT 1',
    ).get(day, startsAt);
    if (!target) return;
    db.prepare('DELETE FROM session_speakers WHERE session_id = ?').run(target.id);
    ssStmt.run(target.id, sp.id, role);
  });
};
assignSpeaker('Amara Diallo', [
  { day: DAYS[1], startsAt: '10:15' },
  { day: DAYS[1], startsAt: '16:00', role: 'Moderator' },
  { day: DAYS[3], startsAt: '11:30' },
]);
assignSpeaker('Priya Venkatesan', [
  { day: DAYS[0], startsAt: '14:45' },
  { day: DAYS[2], startsAt: '09:00' },
]);

const sessions = db.prepare('SELECT id, day, room_id FROM sessions').all();

/* ============================== USERS ============================== */
const USERS = [
  ['Jonas Claesson', 'jonas@orbitconf.dev', 'Principal Engineer', 'Provision', 'he/him', 'Stockholm', 'Europe/Stockholm', 'VIP', 'Runs the platform group. Here for the agent tooling, the eval talks, and the brisket.', 'Agent Design,Evaluation,Code Generation,Observability'],
  ['Amara Diallo', 'amara@orbitconf.dev', 'Director of Applied AI', 'Meridian Health AI', 'she/her', 'Boston', 'America/New_York', 'Speaker', 'Building clinical decision support that clinicians actually trust. Speaking Tuesday.', 'Governance,Compliance,Human-in-the-Loop,Hallucination'],
  ['Kenji Nakamura', 'kenji@orbitconf.dev', 'Staff ML Engineer', 'Volta Motors', 'he/him', 'Tokyo', 'Asia/Tokyo', 'Standard', 'Perception stack, edge inference, and far too many accelerators. First ORBIT.', 'Quantization,Computer Vision,Edge,Latency'],
  ['Sofia Almeida', 'sofia@orbitconf.dev', 'Head of Developer Experience', 'Cobalt Studio', 'she/her', 'Lisbon', 'Europe/Lisbon', 'VIP', 'Obsessed with the inner loop. Will demo her terminal setup unprompted.', 'Code Generation,Tool Calling,Agent Design,Observability'],
  ['Marcus Whitfield', 'marcus@orbitconf.dev', 'VP of Engineering', 'Arcadia Bank', 'he/him', 'Chicago', 'America/Chicago', 'Standard', 'Getting a regulated bank to ship AI without ending up in the news. Mostly succeeding.', 'Governance,Compliance,Red Teaming,Guardrails'],
  ['Priya Venkatesan', 'priya@orbitconf.dev', 'Founding Engineer', 'Waypoint Labs', 'she/her', 'Oakland', 'America/Los_Angeles', 'Speaker', 'Six people, one agent platform, zero sleep. Speaking twice, regrets one.', 'Multi-Agent,Memory Systems,Cost Optimization,Structured Output'],
];
const uStmt = prep('INSERT INTO users (name,email,job_title,company,initials,accent,image_url,bio,pronouns,home_city,timezone,ticket_tier,interests,speaker_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const speakerIdFor = (name) => db.prepare('SELECT id FROM speakers WHERE name = ?').get(name)?.id ?? null;
USERS.forEach((u, i) => {
  const speakerId = u[7] === 'Speaker' ? speakerIdFor(u[0]) : null;
  // Attendees who are speaking reuse their speaker portrait so the two views agree.
  const speakerPortrait = speakerId
    ? db.prepare('SELECT image_url FROM speakers WHERE id = ?').get(speakerId)?.image_url
    : null;
  const ownFile = `attendee-${String(i + 1).padStart(3, '0')}.jpg`;
  const portrait = speakerPortrait ?? (AVATARS.has(ownFile) ? `/avatars/${ownFile}` : null);

  uStmt.run(u[0], u[1], u[2], u[3], initialsOf(u[0]), ACCENTS[i * 2 % ACCENTS.length],
    portrait, u[8], u[4], u[5], u[6], u[7], u[9], speakerId);
});
const users = db.prepare('SELECT * FROM users').all();

/**
 * Favourites — a realistic day, not a full timetable.
 *
 * Nobody attends seven sessions a day. You go to the keynote, pick two or
 * three talks, and spend the rest of the day in the hallway track, the expo,
 * lunch, or asleep. So each attendee books a handful of slots per day they
 * actually show up for, leaving most of the grid deliberately empty.
 */
const fStmt = prep('INSERT OR IGNORE INTO favorites (user_id,session_id,created_at) VALUES (?,?,?)');
const savedAt = () =>
  `2026-10-${String(int(1, 11)).padStart(2, '0')}T${String(int(8, 22)).padStart(2, '0')}:${String(int(10, 59)).padStart(2, '0')}:00Z`;

const slotsByDay = {};
DAYS.forEach((day) => {
  slotsByDay[day] = db.prepare(
    'SELECT DISTINCT starts_at FROM sessions WHERE day = ? AND is_keynote = 0 ORDER BY starts_at',
  ).all(day).map((r) => r.starts_at);
});
const sessionsInSlot = db.prepare('SELECT id FROM sessions WHERE day = ? AND starts_at = ? AND is_keynote = 0');
const keynoteOn = db.prepare('SELECT id FROM sessions WHERE day = ? AND is_keynote = 1');

// days attended · talks booked per day (excluding the keynote) · chance of
// double-booking one slot · chance of bothering with that morning's keynote
// days attended · talks booked per day (excluding the keynote) · chance of
// double-booking one slot · chance of bothering with that morning's keynote
const PLAN_SHAPE = [
  { days: 4, perDay: [2, 3], clash: 0.15, keynote: 0.85 }, // Jonas — here for the whole thing
  { days: 3, perDay: [1, 2], clash: 0.08, keynote: 0.70 }, // Amara — speaking, so less time
  { days: 2, perDay: [2, 3], clash: 0.00, keynote: 1.00 }, // Kenji — first ORBIT, does not miss a keynote
  { days: 4, perDay: [2, 4], clash: 0.15, keynote: 0.90 }, // Sofia — wants to see everything
  { days: 2, perDay: [2, 3], clash: 0.00, keynote: 0.50 }, // Marcus — flew in for a couple of specific talks
  { days: 3, perDay: [2, 3], clash: 0.10, keynote: 0.60 }, // Priya — speaking twice
];

/*
 * Plant Jonas's cross-town traps FIRST: an Aurora session immediately followed
 * by a Foundry session. They do not overlap in time, so simple clash detection
 * says they are fine — but the shuttle takes 27 minutes. Booking them before
 * the organic picks below means those slots are already taken, so the trap does
 * not accidentally turn into an ordinary double-booking.
 */
const auroraIds = rooms.filter((r) => r.venue_id === AURORA.id).map((r) => r.id);
const foundryIds = rooms.filter((r) => r.venue_id === FOUNDRY.id).map((r) => r.id);
const pairFor = (day, s1, s2) => [
  db.prepare(`SELECT id FROM sessions WHERE day=? AND starts_at=? AND room_id IN (${auroraIds.join(',')}) LIMIT 1`).get(day, s1),
  db.prepare(`SELECT id FROM sessions WHERE day=? AND starts_at=? AND room_id IN (${foundryIds.join(',')}) LIMIT 1`).get(day, s2),
];
[[DAYS[0], '10:15', '11:30'], [DAYS[3], '09:00', '10:15']].forEach(([d, s1, s2]) => {
  pairFor(d, s1, s2).forEach((row, n) => {
    if (row) fStmt.run(users[0].id, row.id, `2026-10-09T11:0${n}:00Z`);
  });
});

/** Slots this attendee has already committed to on a given day. */
const takenSlots = db.prepare(`
  SELECT DISTINCT s.starts_at FROM favorites f
  JOIN sessions s ON s.id = f.session_id
  WHERE f.user_id = ? AND s.day = ?`);

users.forEach((u, i) => {
  const shape = PLAN_SHAPE[i] ?? { days: 3, perDay: [2, 3], clash: 0.1, keynote: 0.7 };
  DAYS.slice(0, shape.days).forEach((day) => {
    if (chance(shape.keynote)) {
      const k = keynoteOn.get(day);
      if (k) fStmt.run(u.id, k.id, savedAt());
    }

    const busy = new Set(takenSlots.all(u.id, day).map((r) => r.starts_at));
    const free = slotsByDay[day].filter((slot) => !busy.has(slot));
    // perDay counts talks, so the keynote must not eat into the budget —
    // only already-booked *talk* slots (a planted trap) count against it.
    const bookedTalks = slotsByDay[day].filter((slot) => busy.has(slot)).length;
    const wanted = Math.max(0, int(shape.perDay[0], shape.perDay[1]) - bookedTalks);

    pickN(free, wanted).forEach((slot) => {
      const candidates = sessionsInSlot.all(day, slot);
      if (!candidates.length) return;
      // occasionally book two things at once — that is what clash detection is for
      const take = chance(shape.clash) ? 2 : 1;
      pickN(candidates, take).forEach((c) => fStmt.run(u.id, c.id, savedAt()));
    });
  });
});

/* speaker follows */
const flStmt = prep('INSERT OR IGNORE INTO speaker_follows (user_id,speaker_id) VALUES (?,?)');
users.forEach((u, i) => pickN(speakers, [17, 8, 24, 5, 12, 19][i] ?? 10).forEach((s) => flStmt.run(u.id, s.id)));

/* ratings */
const COMMENTS = ['Best session of the day. The incident walkthrough alone was worth the ticket.','Great content, but ran out of time before the Q&A. Would watch a longer version.','Practical and specific. Took four pages of notes.','A bit more vendor pitch than I expected in the last ten minutes.','Finally, someone showing the failure cases instead of the happy path.','Room was far too small for the demand — had to sit on the floor.','Solid intro, but I expected more depth given the Advanced label.','The eval harness they open-sourced is going straight into our stack.','Slides were dense, delivery was excellent.','Honestly the most useful 45 minutes I have spent this year.','Had to leave halfway to make it across to the Foundry. Watching the recording.','Speaker knew the material cold and it showed in the Q&A.'];
const ratStmt = prep('INSERT OR IGNORE INTO ratings (user_id,session_id,stars,comment,created_at) VALUES (?,?,?,?,?)');
// You can only rate a session you went to, so ratings are drawn from the
// attendee's own plan rather than from the programme at large.
users.forEach((u) => {
  const attended = db.prepare('SELECT session_id, day FROM favorites f JOIN sessions s ON s.id = f.session_id WHERE f.user_id = ?').all(u.id);
  pickN(attended, Math.ceil(attended.length * 0.55)).forEach((a) =>
    ratStmt.run(u.id, a.session_id, pick([2, 3, 4, 4, 5, 5, 5]),
      chance(0.7) ? pick(COMMENTS) : null, `${a.day}T19:${String(int(10, 59))}:00Z`));
});

/* ============================== VENDORS ============================ */
// [name,cuisine,description,venueKey,building,floor,x,y,open,close,price,rating,dietary,emoji,wait]
const VENDOR_DATA = [
  ['Gradient Grounds','Coffee','Third-wave espresso bar with a rotating single-origin program and cold brew on nitro.','A','Main Hall','Level 1',320,240,'06:30','18:00','$',4.8,'vegan,gluten-free','☕',6],
  ['The Inference Engine','Coffee','Cold brew, matcha, and an alarming amount of caffeine per square meter.','A','Main Hall','Level 2',640,400,'07:00','17:00','$',4.6,'vegan','⚡',9],
  ['Taco Latente','Mexican','Street tacos, al pastor off the trompo, and a salsa flight that ranks itself.','A','Expo Hall','Level 1',260,660,'11:00','20:00','$$',4.7,'gluten-free,vegetarian','🌮',14],
  ['Ramen Overflow','Japanese','Tonkotsu, shoyu, and a vegan miso broth that converts skeptics.','A','Main Hall','Level 1',680,240,'11:30','21:00','$$',4.9,'vegan,vegetarian','🍜',22],
  ['Prompt & Proper','Sandwiches','Pressed sandwiches, sharp pickles, and a soup that changes daily.','A','Main Hall','Level 2',500,400,'10:30','16:00','$$',4.3,'vegetarian','🥪',8],
  ['Vector Fields','Salads','Build-your-own bowls with far too many toppings and an honest vinaigrette.','A','Main Hall','Level 1',420,240,'10:00','17:00','$$',4.2,'vegan,gluten-free,vegetarian','🥗',5],
  ['Base Case Bagels','Bakery','New York-style bagels, house cream cheese, lox flown in daily.','A','Main Hall','Level 1',180,240,'06:00','13:00','$',4.6,'vegetarian','🥯',7],
  ['Tokenized','Bubble Tea','Brown sugar boba, fruit teas, and a sugar scale that runs from 0 to regret.','A','Expo Hall','Level 1',480,660,'10:00','19:00','$',4.5,'vegetarian','🧋',12],
  ['Hallucination Station','Desserts','Soft serve, cookie flights, and a doughnut wall that is mostly a photo op.','A','Expo Hall','Level 1',700,660,'12:00','19:00','$',4.4,'vegetarian','🍩',10],
  ['Batch Normalized','Juice Bar','Cold-pressed juice, smoothies, and shots you will pretend to enjoy.','A','Main Hall','Level 3',340,580,'07:00','16:00','$$',4.1,'vegan,gluten-free','🥤',4],
  ['Chunk & Overlap','Poke','Poke bowls, sashimi-grade fish, and a spicy mayo they refuse to explain.','A','Expo Hall','Level 1',120,700,'11:00','18:00','$$',4.5,'gluten-free','🐟',11],
  ['Context Café','Breakfast','All-day breakfast, proper hash browns, bottomless filter coffee.','A','Main Hall','Level 2',780,440,'06:30','15:00','$$',4.4,'vegetarian','🍳',9],
  ['The Long Context','Steakhouse','Proper sit-down dinner service. Reservations strongly recommended.','A','Skyline Tower','Level 24',900,600,'17:00','23:00','$$$$',4.9,'gluten-free','🥩',0],
  ['Embedding Espresso','Coffee','Tiny bar, four seats, extremely serious about extraction.','A','Skyline Tower','Level 24',920,520,'07:00','15:00','$$',4.9,'vegan','☕',13],
  ['Attention Is All You Eat','Tapas','Small plates, a big wine list, designed for sharing between sessions.','A','Skyline Tower','Level 24',840,600,'12:00','23:00','$$$',4.8,'vegetarian,gluten-free','🍤',14],
  ['Rate Limited','Bar','Cocktails, local beer, and a zero-proof list that is genuinely good.','A','Skyline Tower','Rooftop',900,680,'16:00','01:00','$$$',4.7,'vegan','🍸',17],
  ['Silicon Smokehouse','BBQ','Central Texas brisket, twelve-hour pork, and cornbread worth the queue.','F','Yard','Ground',320,620,'11:00','20:00','$$$',4.8,'gluten-free','🍖',31],
  ['Fine-Tuned Pizza','Pizza','Neapolitan, 90 seconds in a wood oven. The white pie is the actual order.','F','Foundry Main','Ground',620,300,'11:00','22:00','$$',4.6,'vegetarian','🍕',18],
  ['Null Pointer Noodles','Thai','Pad thai, khao soi, and a green curry with genuine heat.','F','Foundry Main','Ground',380,300,'11:00','21:00','$$',4.4,'vegan,vegetarian,gluten-free','🍲',15],
  ['Weights & Biscuits','Southern','Fried chicken biscuits, gravy, and a hot honey that earns its name.','F','Yard','Ground',560,620,'07:00','14:00','$$',4.8,'vegetarian','🍗',20],
  ['The Fallback Handler','Burgers','Smash burgers, seasoned fries, and a veggie patty people order on purpose.','F','Yard','Ground',760,620,'11:00','22:00','$$',4.5,'vegetarian','🍔',21],
  ['Stochastic Parrots','Wings','Twelve sauces, a heat ladder, and a wall of shame.','F','Yard','Ground',180,620,'11:00','21:00','$$',4.3,'gluten-free','🔥',19],
  ['The Greenhouse','Mediterranean','Mezze, falafel, warm pita, and a garlic sauce that ends conversations.','F','Foundry Main','Mezzanine',820,300,'11:00','22:00','$$',4.7,'vegan,vegetarian','🫒',16],
  ['Cold Start Coffee','Coffee','The only coffee at the Foundry. They know it. It is still good.','F','Foundry Main','Ground',480,140,'07:30','18:00','$$',4.5,'vegan','☕',24],
];
const venStmt = prep(`INSERT INTO vendors (venue_id,name,cuisine,description,building,floor,map_x,map_y,opens_at,closes_at,price_tier,rating,review_count,dietary,emoji,wait_mins,accepts_meal_credit)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
VENDOR_DATA.forEach((v) => venStmt.run(
  v[3] === 'A' ? AURORA.id : FOUNDRY.id, v[0], v[1], v[2], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11],
  int(40, 900), v[12], v[13], v[14], chance(0.75) ? 1 : 0));

/* ============================== SPONSORS =========================== */
const SPONSOR_DATA = [
  ['Hyperion Labs','Diamond','Frontier model research, and the API half this room builds on.','Free credits for every attendee',1],
  ['Foundry Compute','Diamond','On-demand accelerator capacity without the twelve-month commit.','Spin up a GPU at the booth',1],
  ['Northwind AI','Platinum','The agent platform for regulated industries.','Architecture review, 30 minutes, free',1],
  ['Lumen Systems','Platinum','Observability built for probabilistic systems.','Live trace teardown of your app',1],
  ['Tessellate','Platinum','Vector search that does not fall over at a billion rows.','Benchmark your index at the booth',0],
  ['Basalt','Gold','Eval infrastructure and human review workflows in one place.','Free eval suite audit',1],
  ['Kestrel Research','Gold','Open-weight models and the tooling around them.','Model card clinic',1],
  ['Cartographer','Gold','Document understanding for the messiest PDFs you own.','Bring your worst PDF',0],
  ['Blackbird Security','Gold','Red teaming and prompt-injection defense as a service.','Live red team of a volunteer app',1],
  ['Nimbus Cloud','Gold','Inference, storage and networking on a single bill.','Cost model workshop, hourly',1],
  ['Cinder','Silver','Fine-tuning pipelines for teams without an ML platform.',null,0],
  ['Trellis','Silver','Data labeling with domain experts on tap.',null,1],
  ['Waypoint Labs','Silver','Agent orchestration with real audit trails.','Swag actually worth carrying home',1],
  ['Longitude','Silver','Feature store and retrieval layer, unified.',null,0],
  ['Fathom Analytics','Silver','Product analytics for AI-native applications.',null,0],
  ['Mosaic Retail','Silver','Recommendation systems for commerce teams.',null,1],
  ['Sundial','Silver','Scheduling and batch inference orchestration.',null,0],
  ['Halcyon','Silver','Guardrails, PII redaction and policy enforcement.','Policy template pack',1],
  ['Quanta Telecom','Bronze','Connectivity partner for ORBIT ’26.',null,0],
  ['Ironwood Manufacturing','Bronze','Industrial AI, edge inference and predictive maintenance.',null,1],
  ['Grove Education','Bronze','Upskilling programs for engineering organizations.',null,0],
  ['Praxis Legal','Bronze','AI governance counsel and AI Act readiness.','Ask a lawyer, no invoice',0],
  ['Hearth Media','Bronze','Media partner. Recording the whole thing.',null,0],
  ['Bramble','Bronze','Developer tooling for prompt versioning.',null,1],
  ['Atlas Logistics','Bronze','Route optimization at continental scale.',null,1],
  ['Solstice Games','Bronze','Generative content pipelines for live games.','Play the demo build',1],
  ['Palisade Robotics','Bronze','Manipulation policies for warehouse robots.','Robot arm demo in Loading Dock 3',1],
  ['Verdant Agritech','Bronze','Computer vision for crop health at field scale.',null,0],
];
const spoStmt = prep('INSERT INTO sponsors (venue_id,name,tier,booth,blurb,website,accent,initials,perk,hiring) VALUES (?,?,?,?,?,?,?,?,?,?)');
SPONSOR_DATA.forEach(([name, tier, blurb, perk, hiring], i) => {
  const atFoundry = ['Palisade Robotics', 'Ironwood Manufacturing', 'Foundry Compute', 'Solstice Games'].includes(name);
  spoStmt.run(atFoundry ? FOUNDRY.id : AURORA.id, name, tier,
    `${atFoundry ? 'Y' : ['A', 'B', 'C', 'D'][i % 4]}${100 + i * 3}`, blurb,
    `https://${slug(name)}.example.com`, ACCENTS[i % ACCENTS.length], initialsOf(name), perk, hiring);
});

/* =========================== ANNOUNCEMENTS ========================= */
const ANN = [
  ['Budget 30 minutes to get to the Foundry', 'The Foundry at Red Rock Yards is 6.2 miles from Aurora. The free shuttle takes about 27 minutes door to door and runs every 20 minutes; a rideshare is roughly 18 minutes. Back-to-back sessions across the two sites are not realistically possible.', 'warning', FOUNDRY.id, '2026-10-11T15:00:00Z', 1],
  ['Wednesday’s keynote is at the Foundry', 'Day 3 opens with “Evaluation Is the New Compiler” in The Blast Furnace, not at Aurora. Shuttles run continuously from 06:30 that morning. Arrive early — the yard entrance backs up.', 'warning', FOUNDRY.id, '2026-10-13T05:00:00Z', 1],
  ['Doors open at 07:30 on Day 1', 'Registration is on Level 1 of the Aurora Convention Center, past the north entrance. Badge pickup opens at 07:30. Bring photo ID matching your ticket.', 'info', AURORA.id, '2026-10-11T16:00:00Z', 0],
  ['Nebula Main Stage will reach capacity for the opening keynote', 'Overflow viewing with full audio is available in Quasar Hall and Pulsar Theater. Both open 20 minutes before the session starts.', 'warning', AURORA.id, '2026-10-12T13:30:00Z', 0],
  ['Workshop laptops: set up before you arrive', 'Every hands-on workshop expects Node 22+ and Docker installed locally. The setup guide is linked from each workshop session page. There is not enough conference wifi in Nevada for four hundred people to pull a 4GB image at once.', 'info', null, '2026-10-11T09:00:00Z', 0],
  ['The Boiler Room has no phone signal', 'It is a basement inside a steel works. Wifi is wired-backhauled and solid, cellular is not. Tell someone where you are going.', 'info', FOUNDRY.id, '2026-10-12T07:00:00Z', 0],
  ['Block party moved to the Smelter yard', 'Wednesday night’s party has moved outdoors to The Smelter. Same time, better sound, bring a jacket — the desert gets cold after dark. Last shuttle back to Aurora is 01:15.', 'success', FOUNDRY.id, '2026-10-13T18:00:00Z', 0],
  ['Recordings go live 24 hours after each session', 'Everything in Nebula, Quasar, Pulsar, Vector, Ironworks and Hangar Seven is recorded. Workshops and roundtables are not. Recordings appear on the session page automatically.', 'info', null, '2026-10-12T08:00:00Z', 0],
  ['Quiet room available on Level 3', 'Context Window is reserved as a quiet space from 09:00–18:00 daily. No calls, no sessions scheduled, no exceptions.', 'success', AURORA.id, '2026-10-12T07:00:00Z', 0],
  ['The Cooling Tower is stairs-only', 'The spiral staircase to the Cooling Tower mezzanine is the only access. If you need step-free routing, the same sessions are livestreamed to Ironworks B.', 'warning', FOUNDRY.id, '2026-10-12T06:30:00Z', 0],
];
const aStmt = prep('INSERT INTO announcements (title,body,kind,venue_id,posted_at,pinned) VALUES (?,?,?,?,?,?)');
ANN.forEach((a) => aStmt.run(...a));

/* ============================== SUMMARY ============================ */
const c = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
console.log(`✓ ${c('venues')} venues · ${c('rooms')} rooms · ${c('tracks')} tracks · ${c('tags')} tags`);
console.log(`✓ ${db.prepare('SELECT COUNT(*) n FROM speakers WHERE image_url IS NOT NULL').get().n}/${c('speakers')} speakers have portraits`);
console.log(`✓ ${c('sessions')} sessions · ${c('speakers')} speakers · ${c('session_speakers')} speaking slots · ${c('session_tags')} tag links`);
console.log(`✓ ${c('vendors')} vendors · ${c('sponsors')} sponsors · ${c('announcements')} announcements`);
console.log(`✓ ${db.prepare('SELECT COUNT(*) n FROM users WHERE speaker_id IS NOT NULL').get().n} of ${c('users')} are also speaking · ${c('favorites')} favorites · ${c('speaker_follows')} follows · ${c('ratings')} ratings`);
