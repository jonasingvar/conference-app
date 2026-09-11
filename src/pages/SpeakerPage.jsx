import { useParams } from 'react-router-dom';
import { useConference, useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { plural } from '../lib/format.js';
import { dayLabel } from '../lib/format.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { Avatar, Button, Chip, EmptyState, ErrorState, Skeleton, cx } from '../components/ui.jsx';
import { Icon, BrandIcon } from '../components/Icon.jsx';
import { GeneratedCover } from '../components/GeneratedCover.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';

/** Each network gets its own mark — four identical icons told you nothing. */
const SOCIAL_LINKS = [
  { key: 'twitter', brand: 'x', label: 'X', href: (v) => `https://x.com/${v.replace('@', '')}` },
  { key: 'github', brand: 'github', label: 'GitHub', href: (v) => `https://github.com/${v}` },
  { key: 'linkedin', brand: 'linkedin', label: 'LinkedIn', href: (v) => `https://linkedin.com/${v}` },
  { key: 'website', icon: 'globe', label: 'Website', href: (v) => v },
];

export function SpeakerPage() {
  const { id } = useParams();
  const { isFollowing, toggleFollow } = useConference();
  const { data: speaker, loading, error, reload } = useFetch(() => api.getSpeaker(id), [id]);
  useDocumentTitle(speaker?.name);
  const following = speaker ? isFollowing(speaker.id) : false;

  if (loading) return <div className="space-y-4"><Skeleton className="h-56" /><Skeleton className="h-64" /></div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!speaker) return <EmptyState title="Speaker not found" />;

  const byDay = speaker.sessions.reduce((acc, s) => {
    (acc[s.day] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-10" data-testid="speaker-detail">
      <Button to="/speakers" variant="subtle" size="sm" className="-ml-2">
        <Icon name="chevronLeft" className="size-3.5" /> All speakers
      </Button>

      <header className="card relative overflow-hidden">
        {/* Key art band so a profile is not a wall of grey */}
        <div className="relative h-24 sm:h-32">
          <GeneratedCover seed={speaker.name} accent={speaker.accent} variant="strata" className="size-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/55 to-transparent" />
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-9 sm:pt-6">
          <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent}
            imageUrl={speaker.imageUrl} size="xl" className="-mt-16 ring-4 ring-surface sm:-mt-24" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {speaker.featured && <Chip accent="violet">Keynote speaker</Chip>}
              {speaker.firstTime && <Chip accent="emerald">First time at ORBIT</Chip>}
            </div>
            <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl" data-testid="speaker-name">
              {speaker.name}
            </h1>
            {speaker.pronouns && <p className="text-xs text-faint">{speaker.pronouns}</p>}
            <p className="mt-2 text-base text-muted">{speaker.jobTitle}</p>
            <p className="text-base font-medium">{speaker.company}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="pin" className="size-3.5 text-faint" />{speaker.city}, {speaker.country}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="globe" className="size-3.5 text-faint" />{speaker.languages.join(', ')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" className="size-3.5 text-faint" />
                {plural(speaker.followerCount + (following ? 1 : 0), 'follower')}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                variant={following ? 'ghost' : 'primary'}
                size="sm"
                onClick={() => toggleFollow(speaker.id)}
                aria-pressed={following}
                data-testid="follow-speaker"
              >
                <Icon name={following ? 'check' : 'bell'} className="size-3.5" />
                {following ? 'Following' : 'Follow'}
              </Button>
              <span className="mx-1 h-5 w-px bg-hairline" />
              {SOCIAL_LINKS.map(({ key, brand, icon, label, href }) => speaker.socials[key] && (
                <a
                  key={key}
                  href={href(speaker.socials[key])}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${speaker.name} on ${label}`}
                  title={label}
                  className="grid size-9 place-items-center rounded-lg border border-hairline bg-raised text-muted transition-colors hover:border-white/20 hover:bg-overlay hover:text-ink"
                >
                  {brand ? <BrandIcon name={brand} className="size-4" /> : <Icon name={icon} className="size-4" />}
                </a>
              ))}
            </div>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-3 rounded-xl border border-hairline bg-raised p-4 sm:w-40 sm:grid-cols-1 sm:gap-3 sm:pt-4 sm:text-right">
            {[
              [speaker.sessions.length, plural(speaker.sessions.length, 'session').split(' ')[1]],
              [speaker.yearsExperience, 'years in field'],
              [speaker.talksGiven || '—', 'talks given'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-display text-2xl leading-none">{value}</span>
                  <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="px-6 pb-6 sm:px-9 sm:pb-9">
          <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{speaker.bio}</p>
          {speaker.expertise.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {speaker.expertise.map((e) => <Chip key={e} accent={speaker.accent}>{e}</Chip>)}
            </div>
          )}
        </div>
      </header>

      <section>
        <h2 className="font-display text-2xl">
          {speaker.sessions.length ? `Speaking ${plural(speaker.sessions.length, 'time')}` : 'Not currently scheduled'}
        </h2>
        <div className="mt-5 space-y-8">
          {Object.entries(byDay).map(([day, items]) => (
            <div key={day}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">{dayLabel(day)}</h3>
              <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
                {items.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
