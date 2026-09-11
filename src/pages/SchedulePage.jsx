import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import * as api from '../lib/api.js';
import { accent } from '../lib/accents.js';
import { dayLabel, plural, shortDay } from '../lib/format.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { ScheduleGrid } from '../components/ScheduleGrid.jsx';
import { SearchInput, Select } from '../components/FilterBar.jsx';
import { Button, EmptyState, ErrorState, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const ALL = 'all';
const VIEWS = [
  { value: 'grid', label: 'Grid', icon: 'grid' },
  { value: 'list', label: 'List', icon: 'layers' },
];

export function SchedulePage() {
  const { days, tracks, venues, formats, levels, tags, favoriteIds } = useConference();
  const [params, setParams] = useSearchParams();
  const [railOpen, setRailOpen] = useState(false);

  const filters = {
    day: params.get('day') ?? days[0]?.date,
    track: params.get('track') ?? ALL,
    venue: params.get('venue') ?? ALL,
    level: params.get('level') ?? ALL,
    format: params.get('format') ?? ALL,
    tag: params.get('tag') ?? ALL,
    q: params.get('q') ?? '',
  };
  // A horizontally scrolling matrix is a poor default on a phone, so the grid
  // is only the default where there is room for it. An explicit ?view= wins.
  const wide = useMediaQuery('(min-width: 1024px)');
  const view = params.get('view') ?? (wide ? 'grid' : 'list');

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useFetch(
    () => api.getSessions({
      day: filters.day,
      trackSlug: filters.track,
      venueId: filters.venue,
      level: filters.level,
      format: filters.format,
      tagSlug: filters.tag,
      q: filters.q,
    }),
    [filters.day, filters.track, filters.venue, filters.level, filters.format, filters.tag, filters.q],
  );

  const sessions = data ?? [];
  const activeKeys = ['track', 'venue', 'level', 'format', 'tag', 'q'].filter((k) => filters[k] && filters[k] !== ALL);
  const clearAll = () => setParams(new URLSearchParams({ day: filters.day, view }));

  const slots = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      if (!map.has(s.startsAt)) map.set(s.startsAt, []);
      map.get(s.startsAt).push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  const topicTags = tags.filter((t) => t.kind === 'topic');
  const savedToday = sessions.filter((s) => favoriteIds.has(s.id)).length;
  // Filtering hides columns, so the matrix only makes sense unfiltered-ish.
  const gridUsable = view === 'grid' && !filters.q && filters.track === ALL && filters.tag === ALL;

  const rail = (
    <div className="space-y-5">
      <SearchInput
        value={filters.q}
        onChange={(v) => set('q', v)}
        placeholder="Search sessions…"
        data-testid="search-input"
      />

      <div className="rounded-xl border border-hairline bg-raised p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Starred</span>
          <Link to="/my-plan" className="text-[11px] font-semibold text-violet-300 hover:text-violet-200">
            My plan →
          </Link>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none" data-testid="starred-count">{favoriteIds.size}</span>
          <span className="text-[11px] text-muted">saved · {savedToday} today</span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Day</h3>
        <div className="grid gap-1.5">
          {days.map((d) => {
            const active = d.date === filters.day;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => set('day', d.date)}
                data-testid={`tab-${d.date}`}
                aria-pressed={active}
                className={cx(
                  'flex items-baseline justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                  active ? 'border-violet-400/50 bg-violet-500/15 text-ink'
                    : 'border-hairline bg-raised text-muted hover:bg-overlay hover:text-ink',
                )}
              >
                <span className="text-[13px] font-semibold">{d.label} · {shortDay(d.date)}</span>
                <span className="font-mono text-[10px] text-faint">{d.sessionCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Track</h3>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => set('track', ALL)}
            className={cx('rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              filters.track === ALL ? 'border-white/25 bg-overlay text-ink' : 'border-hairline text-muted hover:text-ink')}>
            All
          </button>
          {tracks.map((t) => {
            const a = accent(t.color);
            const active = filters.track === t.slug;
            return (
              <button key={t.id} type="button" onClick={() => set('track', active ? ALL : t.slug)}
                className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active ? a.chip : 'border-hairline text-muted hover:text-ink')}>
                <span className={cx('size-1.5 rounded-full', a.dot)} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <Select label="Venue" value={filters.venue} onChange={(v) => set('venue', v)}
          options={[{ value: ALL, label: 'Both venues' }, ...venues.map((v) => ({ value: String(v.id), label: v.shortName }))]} />
        <Select label="Level" value={filters.level} onChange={(v) => set('level', v)}
          options={[{ value: ALL, label: 'Any level' }, ...levels.map((l) => ({ value: l.name, label: l.name }))]} />
        <Select label="Format" value={filters.format} onChange={(v) => set('format', v)}
          options={[{ value: ALL, label: 'Any format' }, ...formats.map((f) => ({ value: f.name, label: f.name }))]} />
        <Select label="Topic" value={filters.tag} onChange={(v) => set('tag', v)}
          options={[{ value: ALL, label: 'Any topic' }, ...topicTags.map((t) => ({ value: t.slug, label: t.name }))]} />
      </div>

      {activeKeys.length > 0 && (
        <Button size="sm" variant="ghost" onClick={clearAll} className="w-full">
          <Icon name="close" className="size-3.5" />
          Clear {plural(activeKeys.length, 'filter')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Programme"
        title="The schedule"
        description={`${days.reduce((n, d) => n + d.sessionCount, 0)} sessions over ${plural(days.length, 'day')}. Star what you want; it lands in your plan.`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-hairline bg-raised p-0.5" role="tablist" aria-label="Schedule view">
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  role="tab"
                  aria-selected={view === v.value}
                  onClick={() => set('view', v.value)}
                  data-testid={`view-${v.value}`}
                  className={cx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    view === v.value ? 'bg-overlay text-ink' : 'text-muted hover:text-ink')}
                >
                  <Icon name={v.icon} className="size-3.5" />
                  {v.label}
                </button>
              ))}
            </div>
            <Button size="sm" className="lg:hidden" onClick={() => setRailOpen((o) => !o)}>
              <Icon name="filter" className="size-3.5" />
              Filters{activeKeys.length ? ` (${activeKeys.length})` : ''}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className={cx('lg:sticky lg:top-24 lg:block lg:self-start', railOpen ? 'block' : 'hidden')}
          aria-label="Schedule filters">
          <div className="card p-4">{rail}</div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted" data-testid="result-count">
              {loading ? 'Loading…' : `${plural(sessions.length, 'session')} on ${dayLabel(filters.day)}`}
            </p>
            {view === 'grid' && !gridUsable && !loading && (
              <p className="text-[11px] text-amber-300">
                Grid shows whole rooms — searching or filtering by track switches to the list.
              </p>
            )}
          </div>

          {error && <ErrorState error={error} onRetry={reload} />}
          {loading && <Skeleton className="h-[32rem]" />}

          {!loading && !error && sessions.length === 0 && (
            <EmptyState
              title="No sessions match"
              description="Try widening the filters — or clearing them entirely."
              action={<Button size="sm" onClick={clearAll}>Clear filters</Button>}
            />
          )}

          {!loading && sessions.length > 0 && gridUsable && <ScheduleGrid sessions={sessions} />}

          {!loading && sessions.length > 0 && !gridUsable && slots.map(([time, items]) => (
            <section key={time} className="card overflow-hidden" data-testid={`slot-${time}`}>
              <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-mono text-base font-bold text-ink">{time}</h2>
                  <span className="text-xs text-faint">–&nbsp;{items[0]?.endsAt}</span>
                </div>
                <span className="text-[11px] font-medium text-faint">{plural(items.length, 'session')}</span>
              </header>
              <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-3 p-3 sm:p-4">
                {items.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
