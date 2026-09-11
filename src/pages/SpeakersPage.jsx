import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { plural } from '../lib/format.js';
import { SpeakerCard } from '../components/SpeakerCard.jsx';
import { SpeakerSpotlight } from '../components/SpeakerSpotlight.jsx';
import { SearchInput, Select } from '../components/FilterBar.jsx';
import { Button, EmptyState, ErrorState, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const ALL = 'all';

/**
 * 180 speakers is too many for one flat wall of cards. The page is tiered:
 * the keynote names get headline treatment, the rest of the people actually
 * presenting get cards, and the long tail becomes a scannable list.
 * Searching or filtering collapses all of that into a single result grid.
 */
export function SpeakersPage() {
  const { tracks } = useConference();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const track = params.get('track') ?? ALL;
  const group = params.get('group') ?? ALL;
  const sort = params.get('sort') ?? 'featured';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useFetch(
    () => api.getSpeakers({
      q,
      trackSlug: track,
      featured: group === 'featured' ? 'true' : undefined,
      firstTime: group === 'first-time' ? 'true' : undefined,
    }),
    [q, track, group],
  );

  const filtering = Boolean(q) || track !== ALL || group !== ALL;

  const speakers = useMemo(() => {
    const list = [...(data ?? [])];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'sessions') list.sort((a, b) => (b.sessionCount ?? 0) - (a.sessionCount ?? 0));
    if (sort === 'rating') list.sort((a, b) => b.avgRating - a.avgRating);
    return list;
  }, [data, sort]);

  // Tiers, used only when nothing is filtered.
  const headline = speakers.filter((s) => s.featured);
  const presenting = speakers.filter((s) => !s.featured && (s.sessionCount ?? 0) >= 3);
  const rest = speakers.filter((s) => !s.featured && (s.sessionCount ?? 0) < 3);

  const filters = (
    <div className="card grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
      <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Name, company, expertise…"
        data-testid="speaker-search" />
      <Select label="Track" value={track} onChange={(v) => set('track', v)}
        options={[{ value: ALL, label: 'All tracks' }, ...tracks.map((t) => ({ value: t.slug, label: t.name }))]} />
      <Select label="Group" value={group} onChange={(v) => set('group', v)}
        options={[
          { value: ALL, label: 'Everyone' },
          { value: 'featured', label: 'Keynote speakers' },
          { value: 'first-time', label: 'First-time speakers' },
        ]} />
      <Select label="Sort" value={sort} onChange={(v) => set('sort', v)}
        options={[
          { value: 'featured', label: 'Most prominent' },
          { value: 'sessions', label: 'Most sessions' },
          { value: 'rating', label: 'Highest rated' },
          { value: 'name', label: 'A–Z' },
        ]} />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Who is talking" title="Speakers" />
        {filters}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Who is talking"
        title="Speakers"
        description={`${speakers.length} people who have shipped something and are willing to talk about what broke.`}
      />
      {filters}

      {speakers.length === 0 && (
        <EmptyState
          icon="users"
          title="No speakers match"
          description="Try a different search or clear the filters."
          action={<Button size="sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
        />
      )}

      {/* Filtered view: one flat grid, no tiers. */}
      {filtering && speakers.length > 0 && (
        <section>
          <p className="mb-4 text-xs text-muted" data-testid="speaker-count">
            {plural(speakers.length, 'speaker')}
          </p>
          <div className="stagger grid gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {speakers.map((s, i) => (
              <div key={s.id} style={{ '--i': Math.min(i, 14) }} className="contents">
                <SpeakerCard speaker={s} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unfiltered view: tiered by prominence. */}
      {!filtering && speakers.length > 0 && (
        <>
          <p className="sr-only" data-testid="speaker-count">{plural(speakers.length, 'speaker')}</p>

          {headline.length > 0 && (
            <section data-testid="headline-speakers">
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-display text-xl">The headliners</h2>
                <span className="h-px flex-1 bg-hairline" />
                <span className="text-[11px] text-faint">{plural(headline.length, 'keynote')}</span>
              </div>

              <SpeakerSpotlight speakers={headline} />

              <div className="stagger mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {headline.map((s, i) => (
                  <div key={s.id} style={{ '--i': i }} className="contents">
                    <SpeakerCard speaker={s} variant="headline" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {presenting.length > 0 && (
            <section data-testid="presenting-speakers">
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-display text-xl">Speaking three or more times</h2>
                <span className="h-px flex-1 bg-hairline" />
                <span className="text-[11px] text-faint">{presenting.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {presenting.map((s) => <SpeakerCard key={s.id} speaker={s} />)}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section data-testid="all-speakers">
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-display text-xl">Everyone else on the programme</h2>
                <span className="h-px flex-1 bg-hairline" />
                <span className="text-[11px] text-faint">{rest.length}</span>
              </div>
              <div className="card divide-y divide-hairline p-1.5">
                {rest.map((s) => <SpeakerCard key={s.id} speaker={s} variant="row" />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
