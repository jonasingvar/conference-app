import { useSearchParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { plural } from '../lib/format.js';
import { SpeakerCard } from '../components/SpeakerCard.jsx';
import { SearchInput, Select } from '../components/FilterBar.jsx';
import { Button, EmptyState, ErrorState, SectionHeader, Skeleton } from '../components/ui.jsx';

const ALL = 'all';

export function SpeakersPage() {
  const { tracks } = useConference();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const track = params.get('track') ?? ALL;
  const group = params.get('group') ?? ALL;

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

  const speakers = data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Who is talking"
        title="Speakers"
        description={`${speakers.length || '—'} people who have shipped something and are willing to talk about what broke.`}
      />

      <div className="card grid gap-2 p-3 sm:grid-cols-3 sm:p-4">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Name, company, expertise…" data-testid="speaker-search" />
        <Select label="Track" value={track} onChange={(v) => set('track', v)}
          options={[{ value: ALL, label: 'All tracks' }, ...tracks.map((t) => ({ value: t.slug, label: t.name }))]} />
        <Select label="Group" value={group} onChange={(v) => set('group', v)}
          options={[
            { value: ALL, label: 'Everyone' },
            { value: 'featured', label: 'Keynote speakers' },
            { value: 'first-time', label: 'First-time speakers' },
          ]} />
      </div>

      <p className="text-xs text-muted" data-testid="speaker-count">
        {loading ? 'Loading…' : plural(speakers.length, 'speaker')}
      </p>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }, (_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : speakers.length === 0 ? (
        <EmptyState
          icon="users"
          title="No speakers match"
          description="Try a different search or clear the filters."
          action={<Button size="sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {speakers.map((s) => <SpeakerCard key={s.id} speaker={s} />)}
        </div>
      )}
    </div>
  );
}
