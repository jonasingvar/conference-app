import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { plural } from '../lib/format.js';
import { Avatar, Button, Chip, ErrorState, SectionHeader, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const TIERS = ['Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze'];

const TIER_STYLE = {
  Diamond: { cols: 'sm:grid-cols-2', size: 'xl', pad: 'p-7', title: 'font-display text-2xl' },
  Platinum: { cols: 'sm:grid-cols-3', size: 'lg', pad: 'p-6', title: 'font-display text-xl' },
  Gold: { cols: 'sm:grid-cols-3 lg:grid-cols-5', size: 'md', pad: 'p-5', title: 'text-base font-semibold' },
  Silver: { cols: 'sm:grid-cols-4 lg:grid-cols-6', size: 'sm', pad: 'p-4', title: 'text-sm font-semibold' },
  Bronze: { cols: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6', size: 'xs', pad: 'p-3.5', title: 'text-[13px] font-semibold' },
};

function SponsorCard({ sponsor, style, venue }) {
  return (
    <a
      href={sponsor.website}
      target="_blank"
      rel="noreferrer"
      className={cx(
        'group flex flex-col rounded-2xl border border-hairline bg-surface/70 transition-all',
        'hover:-translate-y-0.5 hover:border-white/15 hover:bg-raised/70',
        style.pad,
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar mono initials={sponsor.initials} accent={sponsor.accent} size={style.size} />
        <div className="min-w-0 flex-1">
          <h3 className={cx('truncate group-hover:text-violet-200', style.title)}>{sponsor.name}</h3>
          <p className="truncate text-[11px] text-faint">
            Booth {sponsor.booth} · {venue?.shortName}
          </p>
        </div>
        <Icon name="external" className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {['Diamond', 'Platinum', 'Gold'].includes(sponsor.tier) && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">{sponsor.blurb}</p>
      )}
      {(sponsor.perk || sponsor.hiring) && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {sponsor.perk && <Chip accent={sponsor.accent} className="!px-2 !py-0.5 !text-[10px]">{sponsor.perk}</Chip>}
          {sponsor.hiring && <Chip accent="emerald" className="!px-2 !py-0.5 !text-[10px]">Hiring</Chip>}
        </div>
      )}
    </a>
  );
}

export function ExpoPage() {
  const { venueById } = useConference();
  const { data, loading, error, reload } = useFetch(api.getSponsors, []);
  const sponsors = data ?? [];
  const hiring = sponsors.filter((s) => s.hiring).length;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Expo hall"
        title="Partners &amp; sponsors"
        description={`${sponsors.length || '—'} companies, most of them with something you can actually try at the booth. ${hiring} are hiring.`}
      />

      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>}

      {TIERS.map((tier) => {
        const tierSponsors = sponsors.filter((s) => s.tier === tier);
        if (!tierSponsors.length) return null;
        const style = TIER_STYLE[tier];
        return (
          <section key={tier} data-testid={`tier-${tier.toLowerCase()}`}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-faint">{tier}</h2>
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-[11px] text-faint">{plural(tierSponsors.length, 'partner')}</span>
            </div>
            <div className={cx('grid gap-3', style.cols)}>
              {tierSponsors.map((s) => (
                <SponsorCard key={s.id} sponsor={s} style={style} venue={venueById[s.venueId]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
