import { Link } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { accent } from '../lib/accents.js';
import { dayLabel, plural, timeRange } from '../lib/format.js';
import { fastestRoute } from '../lib/travel.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { HeroMedia } from '../components/HeroMedia.jsx';
import { SponsorMarquee } from '../components/SponsorMarquee.jsx';
import { CountUp } from '../components/CountUp.jsx';
import { LiveNow } from '../components/LiveNow.jsx';
import { GeneratedCover } from '../components/GeneratedCover.jsx';
import { SpeakerCard } from '../components/SpeakerCard.jsx';
import { Avatar, Button, Chip, SectionHeader, Skeleton, Stat, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';

function Hero({ conference, stats }) {
  const { days, venues } = useConference();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-hairline" data-testid="hero">
      {/* Photography if any has been added; otherwise the gradient below carries it. */}
      <HeroMedia />
      <div className="absolute inset-0 bg-[radial-gradient(42rem_24rem_at_12%_-5%,rgba(139,92,246,0.30),transparent_62%),radial-gradient(34rem_20rem_at_92%_8%,rgba(34,211,238,0.22),transparent_60%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(60rem_30rem_at_30%_0%,black,transparent)]" />

      <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_minmax(0,21rem)] lg:items-center lg:gap-12 lg:px-12">
        <div>
          <Chip accent="cyan" className="mb-5 !py-1.5">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-cyan-400" />
            {conference.dates} · {conference.city}
          </Chip>

          <h1 className="font-display text-[3rem] leading-[0.9] tracking-[-0.045em] sm:text-7xl lg:text-[5rem]">
            <span className="text-gradient">The model is<br />the easy part.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Four days of engineers who actually shipped it.{' '}
            <strong className="font-semibold text-ink">{stats?.sessions ?? '—'} sessions</strong> across two sites,
            {' '}{stats?.tracks ?? '—'} tracks, and an unreasonable number of war stories
            about the parts nobody demos.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button to="/schedule" variant="primary" size="lg" data-testid="hero-cta-schedule">
              Browse the schedule
              <Icon name="arrowRight" className="size-4" />
            </Button>
            <Button to="/my-agenda" size="lg">My agenda</Button>
          </div>

          {/* a hard modular grid — every figure in its own cell */}
          <dl className="mt-9 grid max-w-xl grid-cols-2 border-l border-t border-white/[0.10] sm:grid-cols-4">
            {[
              [stats?.sessions, 'Sessions'],
              [stats?.speakers, 'Speakers'],
              [stats?.rooms, 'Stages'],
              [stats?.countries, 'Countries'],
            ].map(([value, label]) => (
              <div key={label} className="border-b border-r border-white/[0.10] px-4 py-3.5">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-display text-3xl leading-none tracking-tight sm:text-4xl">
                    {value ? <CountUp value={value} /> : '—'}
                  </span>
                  <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Programme at a glance — real data, and it stops the hero feeling empty. */}
        <div className="flex flex-col rounded-2xl border border-white/[0.09] bg-black/25 p-5 backdrop-blur-sm">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-faint">Programme at a glance</h2>
          <ul className="mt-4 space-y-3">
            {days.map((d, i) => {
              const max = Math.max(...days.map((x) => x.sessionCount));
              return (
                <li key={d.date}>
                  <Link to={`/schedule?day=${d.date}`} className="group block">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-ink group-hover:text-violet-200">
                        {d.label} <span className="text-faint">· {d.weekday}</span>
                      </span>
                      <span className="font-mono text-[11px] text-muted">{d.sessionCount}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all group-hover:brightness-125"
                        style={{ width: `${(d.sessionCount / max) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4">
            {venues.map((v) => (
              <div key={v.id} className="flex items-center gap-2.5 text-xs">
                <span aria-hidden="true">{v.emoji}</span>
                <span className="truncate text-muted">{v.name}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] leading-relaxed text-faint">
              6.2 miles apart. The shuttle takes 27 minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnnouncementStrip({ announcements }) {
  const pinned = announcements.filter((a) => a.pinned).slice(0, 2);
  if (!pinned.length) return null;
  const tone = {
    warning: 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200',
    success: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200',
    info: 'border-sky-500/25 bg-sky-500/[0.07] text-sky-200',
  };
  return (
    <section className="grid gap-3 sm:grid-cols-2" data-testid="announcements">
      {pinned.map((a) => (
        <div key={a.id} className={cx('flex gap-3 rounded-2xl border p-4', tone[a.kind] ?? tone.info)}>
          <Icon name={a.kind === 'warning' ? 'alert' : 'info'} className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{a.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{a.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function VenueSplit() {
  const { venues, travel, rooms } = useConference();
  const route = fastestRoute(travel, venues[0]?.id, venues[1]?.id);

  return (
    <section data-testid="venue-split">
      <SectionHeader
        eyebrow="Two sites"
        title="One conference, six miles apart"
        description="Most of ORBIT happens at Aurora. The hardware track, the workshops and the late shows are at the Foundry — and getting there takes real time."
        action={<Button to="/venues" size="sm">Venue detail <Icon name="chevronRight" className="size-3.5" /></Button>}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        {venues.map((v, i) => {
          const a = accent(v.accent);
          const venueRooms = rooms.filter((r) => r.venueId === v.id);
          return (
            <div key={v.id} className={cx('relative overflow-hidden rounded-2xl border border-hairline bg-surface/70 p-6', i === 1 && 'lg:order-3')}>
              <span className={cx('absolute inset-x-0 top-0 h-px bg-gradient-to-r', a.grad)} />
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden="true">{v.emoji}</span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight">{v.name}</h3>
                  <p className="text-xs text-faint">{v.address} · {v.city}</p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{v.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {venueRooms.slice(0, 5).map((r) => (
                  <Chip key={r.id} className="!px-2 !py-0.5 !text-[10px]">{r.name}</Chip>
                ))}
                {venueRooms.length > 5 && (
                  <Chip className="!px-2 !py-0.5 !text-[10px] !text-faint">+{venueRooms.length - 5} more</Chip>
                )}
              </div>
            </div>
          );
        })}

        {route && (
          <div className="lg:order-2 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline px-5 py-4 lg:flex-col lg:px-4 lg:py-6">
            <Icon name="car" className="size-5 text-faint" />
            <div className="text-center">
              <div className="font-display text-2xl leading-none">{route.minutes}<span className="text-sm"> min</span></div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">by {route.mode}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TrackGrid() {
  const { tracks } = useConference();
  const { data: stats } = useFetch(api.getStats, []);
  const counts = Object.fromEntries((stats?.topTracks ?? []).map((t) => [t.slug, t.n]));

  return (
    <section data-testid="tracks">
      <SectionHeader eyebrow="Programme" title="Ten tracks" description="Pick a lane, or ignore them entirely — nobody checks." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tracks.map((t) => {
          const a = accent(t.color);
          return (
            <Link
              key={t.id}
              to={`/schedule?track=${t.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-white/20 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              <div className="absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-90">
                <GeneratedCover seed={t.name} accent={t.color} variant="mesh" className="size-full" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-surface/70 via-surface/88 to-surface" />
              <span className={cx('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r', a.grad)} />
              <div className="relative p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className={cx('font-semibold leading-tight', a.text)}>{t.name}</h3>
                <span className="shrink-0 font-mono text-[11px] text-faint">{counts[t.slug] ?? '—'}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-muted">{t.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Keynotes() {
  const { data, loading } = useFetch(() => api.getSessions({ sort: 'time' }), []);
  const keynotes = (data ?? []).filter((s) => s.isKeynote);

  return (
    <section data-testid="keynotes">
      <SectionHeader eyebrow="Main stage" title="Four keynotes" description="One each morning at 08:00. Day 3 is at the Foundry — plan the journey." />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-52" />)
          : keynotes.map((s, i) => {
            const v = accent(s.venue.accent);
            return (
              <Link
                key={s.id}
                to={`/sessions/${s.id}`}
                style={{ '--i': i }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-white/20 hover:bg-raised"
              >
                <div className="relative h-28 overflow-hidden">
                  <GeneratedCover seed={s.title} accent={s.track.color} variant="orbit"
                    className="size-full transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/45 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-6 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                    Day {i + 1} · {dayLabel(s.day)}
                  </span>
                  {!s.venue.isPrimary && (
                    <Chip accent={s.venue.accent} className="!py-0.5">
                      <Icon name="car" className="size-3" /> {s.venue.shortName}
                    </Chip>
                  )}
                </div>
                <h3 className="mt-3 font-display text-2xl leading-tight transition-colors group-hover:text-violet-200">
                  {s.title}
                </h3>
                <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-muted">{s.abstract}</p>
                <div className="mt-auto flex items-center gap-3 pt-5">
                  <div className="flex -space-x-2">
                    {s.speakers.map((sp) => (
                      <Avatar key={sp.id} name={sp.name} initials={sp.initials} accent={sp.accent} size="sm" className="ring-2 ring-surface" />
                    ))}
                  </div>
                  <div className="min-w-0 text-[11px]">
                    <div className="truncate font-medium">{s.speakers.map((sp) => sp.name).join(', ')}</div>
                    <div className={cx('truncate', v.text)}>{s.room.name} · {timeRange(s.startsAt, s.endsAt)}</div>
                  </div>
                </div>
                </div>
              </Link>
            );
          })}
      </div>
    </section>
  );
}

function YourPlan() {
  const { currentUser } = useConference();
  const { data, loading } = useFetch(() => api.getSchedule(currentUser.id), [currentUser.id]);
  const firstDay = data?.days?.[0];

  return (
    <section data-testid="your-plan">
      <SectionHeader
        eyebrow={`Hey ${currentUser.name.split(' ')[0]}`}
        title="Your agenda"
        description={data ? `${plural(data.totalSessions, 'session')} booked across ${plural(data.days.length, 'day')}.` : null}
        action={<Button to="/my-agenda" size="sm">Open agenda <Icon name="chevronRight" className="size-3.5" /></Button>}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)
          : (firstDay?.sessions ?? []).slice(0, 3).map((s) => <SessionCard key={s.id} session={s} variant="row" />)}
      </div>
    </section>
  );
}

/** Following a speaker has to buy you something — this is the payoff. */
function FromSpeakersYouFollow() {
  const { currentUser, followingIds } = useConference();
  const { data, loading } = useFetch(
    () => api.getFollowedSessions(currentUser.id),
    [currentUser.id, followingIds.size],
  );
  const sessions = (data ?? []).slice(0, 3);
  if (!loading && sessions.length === 0) return null;

  return (
    <section data-testid="followed-sessions">
      <SectionHeader
        eyebrow={`${followingIds.size} speakers followed`}
        title="From speakers you follow"
        description="Everyone you follow, and what they are presenting."
        action={<Button to="/speakers" size="sm">Find more <Icon name="chevronRight" className="size-3.5" /></Button>}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64" />)
          : sessions.map((s) => <SessionCard key={s.id} session={s} showDay />)}
      </div>
    </section>
  );
}

function FeaturedSpeakers() {
  const { data, loading } = useFetch(() => api.getSpeakers({ featured: 'true' }), []);
  const { data: stats } = useFetch(api.getStats, []);
  return (
    <section data-testid="featured-speakers">
      <SectionHeader
        eyebrow="On stage"
        title="Featured speakers"
        action={<Button to="/speakers" size="sm">All {stats?.speakers ?? ""} <Icon name="chevronRight" className="size-3.5" /></Button>}
      />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56" />)
          : (data ?? []).slice(0, 6).map((s) => <SpeakerCard key={s.id} speaker={s} />)}
      </div>
    </section>
  );
}

function PopularSessions() {
  const { data, loading } = useFetch(() => api.getSessions({ sort: 'rating' }), []);
  const top = (data ?? []).filter((s) => !s.isKeynote && s.ratingCount > 60).slice(0, 6);
  return (
    <section data-testid="popular-sessions">
      <SectionHeader
        eyebrow="Highest rated"
        title="What people are talking about"
        action={<Button to="/schedule" size="sm">See all <Icon name="chevronRight" className="size-3.5" /></Button>}
      />
      <div className="mt-6 grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72" />)
          : top.map((s) => <SessionCard key={s.id} session={s} showDay />)}
      </div>
    </section>
  );
}

export function HomePage() {
  const { conference } = useConference();
  useDocumentTitle("ORBIT '26");
  const { data: stats } = useFetch(api.getStats, []);
  const { data: announcements } = useFetch(api.getAnnouncements, []);

  return (
    <div className="space-y-16 sm:space-y-20">
      <Hero conference={conference} stats={stats} />
      <SponsorMarquee />
      <Reveal><LiveNow /></Reveal>
      {announcements && <Reveal><AnnouncementStrip announcements={announcements} /></Reveal>}
      <Reveal><YourPlan /></Reveal>
      <Reveal><Keynotes /></Reveal>
      <Reveal><TrackGrid /></Reveal>
      <Reveal><VenueSplit /></Reveal>
      <Reveal><FromSpeakersYouFollow /></Reveal>
      <Reveal><FeaturedSpeakers /></Reveal>
      <Reveal><PopularSessions /></Reveal>
    </div>
  );
}
