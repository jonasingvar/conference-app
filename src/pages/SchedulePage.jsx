import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { dayLabel, plural, shortDay } from '../lib/format.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { SearchInput, Select, TabStrip } from '../components/FilterBar.jsx';
import { Button, EmptyState, ErrorState, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const ALL = 'all';

export function SchedulePage() {
  const { days, tracks, venues, formats, levels, tags } = useConference();
  const [params, setParams] = useSearchParams();

  const filters = {
    day: params.get('day') ?? days[0]?.date,
    track: params.get('track') ?? ALL,
    venue: params.get('venue') ?? ALL,
    level: params.get('level') ?? ALL,
    format: params.get('format') ?? ALL,
    tag: params.get('tag') ?? ALL,
    q: params.get('q') ?? '',
  };

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
  const activeFilters = ['track', 'venue', 'level', 'format', 'tag', 'q'].filter((k) => filters[k] && filters[k] !== ALL);

  /** Group into time slots so the day reads as a timeline, not a wall. */
  const slots = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      if (!map.has(s.startsAt)) map.set(s.startsAt, []);
      map.get(s.startsAt).push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  const topicTags = tags.filter((t) => t.kind === 'topic');

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Programme"
        title="The schedule"
        description={`${days.reduce((n, d) => n + d.sessionCount, 0)} sessions over ${plural(days.length, 'day')}. Filter it down, then save what you want to your plan.`}
      />

      <TabStrip
        value={filters.day}
        onChange={(v) => set('day', v)}
        tabs={days.map((d) => ({
          value: d.date,
          label: `${d.label} · ${shortDay(d.date)}`,
          sublabel: `${d.sessionCount} sessions`,
        }))}
      />

      <div className="card space-y-3 p-3 sm:p-4" data-testid="filters">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SearchInput
            value={filters.q}
            onChange={(v) => set('q', v)}
            placeholder="Search titles, abstracts, speakers…"
            className="lg:col-span-3"
            data-testid="search-input"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Track" value={filters.track} onChange={(v) => set('track', v)}
            options={[{ value: ALL, label: 'All tracks' }, ...tracks.map((t) => ({ value: t.slug, label: t.name }))]} />
          <Select label="Venue" value={filters.venue} onChange={(v) => set('venue', v)}
            options={[{ value: ALL, label: 'Both venues' }, ...venues.map((v) => ({ value: String(v.id), label: v.shortName }))]} />
          <Select label="Level" value={filters.level} onChange={(v) => set('level', v)}
            options={[{ value: ALL, label: 'Any level' }, ...levels.map((l) => ({ value: l.name, label: l.name }))]} />
          <Select label="Format" value={filters.format} onChange={(v) => set('format', v)}
            options={[{ value: ALL, label: 'Any format' }, ...formats.map((f) => ({ value: f.name, label: f.name }))]} />
          <Select label="Topic" value={filters.tag} onChange={(v) => set('tag', v)}
            options={[{ value: ALL, label: 'Any topic' }, ...topicTags.map((t) => ({ value: t.slug, label: t.name }))]} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted" data-testid="result-count">
            {loading ? 'Loading…' : `${plural(sessions.length, 'session')} on ${dayLabel(filters.day)}`}
          </p>
          {activeFilters.length > 0 && (
            <Button size="sm" variant="subtle" onClick={() => setParams(new URLSearchParams({ day: filters.day }))}>
              <Icon name="close" className="size-3.5" />
              Clear {plural(activeFilters.length, 'filter')}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          title="No sessions match"
          description="Try widening the filters — or clearing them entirely."
          action={<Button size="sm" onClick={() => setParams(new URLSearchParams({ day: filters.day }))}>Clear filters</Button>}
        />
      )}

      {/* Each time slot is its own module: a panel with a header, cards inside. */}
      {!loading && slots.map(([time, items]) => (
        <section key={time} className="card overflow-hidden" data-testid={`slot-${time}`}>
          <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
            <div className="flex items-baseline gap-3">
              <h2 className="font-mono text-base font-bold text-ink">{time}</h2>
              <span className="text-xs text-faint">–&nbsp;{items[0]?.endsAt}</span>
            </div>
            <span className="text-[11px] font-medium text-faint">{plural(items.length, 'session')}</span>
          </header>
          {/* auto-fit means a slot with one session fills the row rather than
              leaving two empty columns next to it */}
          <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-3 p-3 sm:p-4">
            {items.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
