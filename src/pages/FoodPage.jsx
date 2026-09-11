import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { accent } from '../lib/accents.js';
import { plural, time } from '../lib/format.js';
import { SearchInput, Select } from '../components/FilterBar.jsx';
import { Button, Chip, EmptyState, ErrorState, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const ALL = 'all';

function WaitBadge({ mins }) {
  if (!mins) return <Chip accent="emerald" className="!py-0.5">Walk right up</Chip>;
  const tone = mins >= 25 ? 'rose' : mins >= 15 ? 'amber' : 'emerald';
  return (
    <Chip accent={tone} className="!py-0.5">
      <Icon name="clock" className="size-3" />{mins} min wait
    </Chip>
  );
}

function VendorCard({ vendor, venue }) {
  const a = accent(venue?.accent ?? 'violet');
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface/70 p-5 transition-all hover:-translate-y-0.5 hover:border-white/15 hover:bg-raised/70">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-raised text-2xl" aria-hidden="true">
          {vendor.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg leading-tight">{vendor.name}</h3>
          <p className="text-xs text-muted">{vendor.cuisine} · {vendor.priceTier}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 text-sm font-semibold">
            <Icon name="star" filled className="size-3.5 text-amber-400" />
            {vendor.rating.toFixed(1)}
          </div>
          <div className="text-[10px] text-faint">{vendor.reviewCount} reviews</div>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted">{vendor.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {vendor.dietary.map((d) => (
          <Chip key={d} accent="emerald" className="!px-2 !py-0.5 !text-[10px]">{d}</Chip>
        ))}
        {vendor.acceptsMealCredit && (
          <Chip className="!px-2 !py-0.5 !text-[10px]">
            <Icon name="ticket" className="size-3" />Meal credit
          </Chip>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-[11px] text-muted">
        <span className={cx('inline-flex items-center gap-1 font-medium', a.text)}>
          <Icon name="pin" className="size-3" />{venue?.shortName}
        </span>
        <span className="text-faint">{vendor.building} · {vendor.floor}</span>
        <span className="inline-flex items-center gap-1 text-faint">
          <Icon name="clock" className="size-3" />{time(vendor.opensAt)}–{time(vendor.closesAt)}
        </span>
        <span className="ml-auto"><WaitBadge mins={vendor.waitMins} /></span>
      </div>
    </article>
  );
}

export function FoodPage() {
  const { venues, venueById } = useConference();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const venue = params.get('venue') ?? ALL;
  const dietary = params.get('dietary') ?? ALL;
  const sort = params.get('sort') ?? 'rating';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useFetch(
    () => api.getVendors({ q, venueId: venue, dietary }),
    [q, venue, dietary],
  );

  const vendors = useMemo(() => {
    const list = [...(data ?? [])];
    if (sort === 'wait') list.sort((a, b) => a.waitMins - b.waitMins);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, sort]);

  const cuisines = [...new Set((data ?? []).map((v) => v.cuisine))].length;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Eat something"
        title="Food &amp; drink"
        description={`${vendors.length || '—'} vendors across both sites. The queue at Silicon Smokehouse is real; plan accordingly.`}
      />

      <div className="card grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Search food…" data-testid="food-search" />
        <Select label="Venue" value={venue} onChange={(v) => set('venue', v)}
          options={[{ value: ALL, label: 'Both venues' }, ...venues.map((v) => ({ value: String(v.id), label: v.shortName }))]} />
        <Select label="Dietary" value={dietary} onChange={(v) => set('dietary', v)}
          options={[
            { value: ALL, label: 'Any dietary' },
            { value: 'vegan', label: 'Vegan options' },
            { value: 'vegetarian', label: 'Vegetarian options' },
            { value: 'gluten-free', label: 'Gluten-free options' },
          ]} />
        <Select label="Sort" value={sort} onChange={(v) => set('sort', v)}
          options={[
            { value: 'rating', label: 'Highest rated' },
            { value: 'wait', label: 'Shortest wait' },
            { value: 'name', label: 'A–Z' },
          ]} />
      </div>

      <p className="text-xs text-muted" data-testid="vendor-count">
        {loading ? 'Loading…' : `${plural(vendors.length, 'vendor')} · ${cuisines} cuisines`}
      </p>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : vendors.length === 0 ? (
        <EmptyState
          icon="food"
          title="Nothing matches"
          description="Try a different dietary filter or clear the search."
          action={<Button size="sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => <VendorCard key={v.id} vendor={v} venue={venueById[v.venueId]} />)}
        </div>
      )}
    </div>
  );
}
