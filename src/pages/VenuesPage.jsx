import { Link } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { accent } from '../lib/accents.js';
import { plural } from '../lib/format.js';
import { routesBetween } from '../lib/travel.js';
import { Button, Chip, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { VenueRouteMap } from '../components/VenueRouteMap.jsx';
import { Icon } from '../components/Icon.jsx';

const KIND_ICON = {
  Keynote: 'mic', Theater: 'mic', Breakout: 'users', Workshop: 'layers',
  Roundtable: 'users', Lightning: 'sparkle', Demo: 'grid', Social: 'food',
};

function TravelPanel({ venueData }) {
  const { venues, travel, rooms } = useConference();
  const [from, to] = venues;
  if (!from || !to) return null;
  const options = routesBetween(travel, from.id, to.id);
  const withCounts = venues.map((v) => ({
    ...v,
    roomCount: (venueData ?? []).find((x) => x.id === v.id)?.rooms.length
      ?? rooms.filter((r) => r.venueId === v.id).length,
  }));

  return (
    <section className="card overflow-hidden" data-testid="travel-panel">
      <div className="border-b border-hairline p-6 sm:p-8 sm:pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Icon name="car" className="size-5 text-amber-300" />
          <h2 className="font-display text-2xl">Getting between the two sites</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {from.shortName} and {to.shortName} are 6.2 miles apart. A session at one and a session at the other
          in adjacent slots is not a plan — it is a wish.
        </p>
      </div>

      <VenueRouteMap venues={withCounts} routes={options} className="!rounded-none !border-x-0 !border-t-0" />

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        {options.map((o) => (
          <div key={o.mode} className={cx(
            'rounded-2xl border p-4',
            o.mode === 'Walk' ? 'border-hairline bg-raised/30 opacity-60' : 'border-hairline bg-surface/70',
          )}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{o.mode}</h3>
              <span className="text-[11px] text-faint">{o.costUsd ? `$${o.costUsd.toFixed(2)}` : 'Free'}</span>
            </div>
            <div className="mt-1.5 font-display text-3xl leading-none">
              {o.minutes}<span className="text-sm text-muted"> min</span>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{o.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Simple floor-plan style map. Rooms carry map_x / map_y coordinates in the
 * database, so this is a positioned scatter rather than a real floor plan —
 * enough to see the shape of a site and where a room sits within it.
 */
function VenueMap({ venue, rooms }) {
  const a = accent(venue.accent);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-ground/60" data-testid={`venue-map-${venue.id}`}>
      <svg viewBox="0 0 1000 760" className="h-auto w-full" role="img" aria-label={`Stage layout for ${venue.name}`}>
        <defs>
          <pattern id={`grid-${venue.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="760" fill={`url(#grid-${venue.id})`} />
        {rooms.map((r) => {
          const w = Math.max(84, Math.min(180, r.capacity / 26));
          const h = 46;
          return (
            <g key={r.id} transform={`translate(${r.mapX - w / 2}, ${r.mapY - h / 2})`}>
              <rect
                width={w} height={h} rx="10"
                className={cx('fill-white/[0.04] stroke-white/10')}
                strokeWidth="1"
              />
              <rect width={w} height="2.5" rx="1.25" className={cx('fill-current', a.text)} opacity="0.8" />
              <text x={w / 2} y={h / 2 + 1} textAnchor="middle" className="fill-white/85 text-[11px] font-semibold">
                {r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name}
              </text>
              <text x={w / 2} y={h / 2 + 14} textAnchor="middle" className="fill-white/35 text-[9px]">
                {r.capacity.toLocaleString()} seats
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VenueSection({ venue }) {
  const a = accent(venue.accent);
  const buildings = venue.rooms.reduce((acc, r) => {
    (acc[r.building] ??= []).push(r);
    return acc;
  }, {});

  return (
    <section className="space-y-5" data-testid={`venue-${venue.id}`}>
      <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface/70 p-6 sm:p-8">
        <span className={cx('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', a.grad)} />
        <div className="flex flex-wrap items-start gap-4">
          <span className="text-4xl" aria-hidden="true">{venue.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl leading-tight">{venue.name}</h2>
              {venue.isPrimary && <Chip accent={venue.accent}>Main site</Chip>}
            </div>
            <p className="mt-1 text-sm text-muted">{venue.address} · {venue.city}</p>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{venue.description}</p>
          </div>
          <dl className="grid grid-cols-3 gap-5 sm:gap-6">
            {[
              [venue.rooms.length, 'stages'],
              [venue.sessionCount, 'sessions'],
              [venue.vendorCount, 'food'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block font-display text-2xl leading-none">{v}</span>
                  <span className="text-[10px] uppercase tracking-wider text-faint">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="size-3.5 text-faint" />Open {venue.opensAt}–{venue.closesAt}</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="wifi" className="size-3.5 text-faint" />{venue.wifiSsid}</span>
          <Button size="sm" to={`/schedule?venue=${venue.id}`}>See its sessions</Button>
        </div>
      </div>

      <VenueMap venue={venue} rooms={venue.rooms} />

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(buildings).map(([building, rooms]) => (
          <div key={building} className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="building" className="size-4 text-faint" />
              {building}
              <span className="text-xs font-normal text-faint">· {plural(rooms.length, 'stage')}</span>
            </h3>
            <ul className="mt-3 divide-y divide-hairline">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Icon name={KIND_ICON[r.kind] ?? 'pin'} className="size-4 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/schedule?venue=${venue.id}`} className="truncate text-sm font-medium hover:text-violet-200">
                      {r.name}
                    </Link>
                    <p className="truncate text-[11px] text-faint">
                      {r.floor} · {r.capacity.toLocaleString()} seats · ~{r.walkMinutes} min walk
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!r.accessible && (
                      <span title="Not step-free" className="text-[10px] font-bold text-amber-300">STAIRS</span>
                    )}
                    <Chip className="!px-2 !py-0.5 !text-[10px]">{r.kind}</Chip>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VenuesPage() {
  const { data, loading, error } = useFetch(api.getVenues, []);
  const stageCount = (data ?? []).reduce((n, v) => n + v.rooms.length, 0);

  return (
    <div className="space-y-12">
      <SectionHeader
        eyebrow="Where to go"
        title="Venues &amp; stages"
        description={`${stageCount || '—'} stages across two sites. Check which one a session is at before you commit your morning to it.`}
      />
      <TravelPanel venueData={data} />
      {loading && <Skeleton className="h-96" />}
      {error && <p className="text-sm text-rose-300">{error.message}</p>}
      {(data ?? []).map((v) => <VenueSection key={v.id} venue={v} />)}
    </div>
  );
}
