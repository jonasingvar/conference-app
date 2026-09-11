/**
 * Download synthetic speaker portraits.
 *
 * Faces come from thispersondoesnotexist.com, which serves StyleGAN2 output:
 * every image is generated, so no real person is depicted and there are no
 * likeness rights to worry about. They are downloaded ONCE, downscaled, and
 * committed to the repo — the app never calls out to the network at runtime,
 * and a workshop room with bad wifi still works.
 *
 *   npm run avatars           # fill in whatever is missing
 *   npm run avatars -- 200    # target a different count
 *   npm run avatars -- --force  # re-download everything
 *
 * Speakers whose file is missing fall back to the generated SVG portrait,
 * so a partial run is harmless.
 */
import { mkdirSync, existsSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'avatars');
const TMP_DIR = join(OUT_DIR, '.tmp');

const SOURCE = 'https://thispersondoesnotexist.com/random-person.jpeg';
const REFERER = 'https://thispersondoesnotexist.com/';
const SIZE = 256;          // plenty for a 96px avatar at 2× DPI
const CONCURRENCY = 4;     // gentle on a free public service
const GAP_MS = 250;

const args = process.argv.slice(2);
const force = args.includes('--force');
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 180);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const name = (i) => `speaker-${String(i).padStart(3, '0')}.jpg`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const todo = [];
for (let i = 1; i <= count; i++) {
  if (force || !existsSync(join(OUT_DIR, name(i)))) todo.push(i);
}

if (!todo.length) {
  console.log(`✓ ${count} portraits already present in public/avatars`);
  process.exit(0);
}
console.log(`→ fetching ${todo.length} portraits (${SIZE}px) …`);

let done = 0;
let failed = 0;

async function fetchOne(i) {
  const tmp = join(TMP_DIR, name(i));
  const out = join(OUT_DIR, name(i));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(SOURCE, {
        headers: { 'User-Agent': 'orbit-conference-app/1.0 (workshop sample data)', Referer: REFERER },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 20_000) throw new Error(`suspiciously small (${buf.length}b)`);

      writeFileSync(tmp, buf);
      // sips ships with macOS; on other platforms the full-size file is kept.
      try {
        execFileSync('sips', ['-Z', String(SIZE), '-s', 'formatOptions', '72', tmp, '--out', out], { stdio: 'ignore' });
      } catch {
        writeFileSync(out, buf);
      }
      unlinkSync(tmp);

      done++;
      if (done % 20 === 0 || done === todo.length) {
        console.log(`   ${done}/${todo.length}`);
      }
      return;
    } catch (err) {
      if (attempt === 3) {
        failed++;
        console.warn(`   ✗ ${name(i)}: ${err.message}`);
        return;
      }
      await sleep(1200 * attempt);
    }
  }
}

// A small worker pool, staggered so we never open a burst of sockets.
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async (_, w) => {
    await sleep(w * GAP_MS);
    while (queue.length) {
      await fetchOne(queue.shift());
      await sleep(GAP_MS);
    }
  }),
);

try { readdirSync(TMP_DIR).forEach((f) => unlinkSync(join(TMP_DIR, f))); } catch {}
const total = readdirSync(OUT_DIR).filter((f) => f.endsWith('.jpg')).length;
console.log(`✓ ${total} portraits in public/avatars${failed ? ` (${failed} failed — re-run to fill gaps)` : ''}`);
