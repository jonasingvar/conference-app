import { useParams } from 'react-router-dom';
import { useFetch } from '../lib/store.jsx';
import * as api from '../lib/api.js';
import { plural } from '../lib/format.js';
import { dayLabel } from '../lib/format.js';
import { SessionCard } from '../components/SessionCard.jsx';
import { Avatar, Button, Chip, EmptyState, ErrorState, Skeleton, cx } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';

const SOCIAL_LINKS = [
  { key: 'twitter', icon: 'external', href: (v) => `https://x.com/${v.replace('@', '')}` },
  { key: 'github', icon: 'external', href: (v) => `https://github.com/${v}` },
  { key: 'linkedin', icon: 'external', href: (v) => `https://linkedin.com/${v}` },
  { key: 'website', icon: 'globe', href: (v) => v },
];

export function SpeakerPage() {
  const { id } = useParams();
  const { data: speaker, loading, error, reload } = useFetch(() => api.getSpeaker(id), [id]);

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

      <header className="card p-6 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent} imageUrl={speaker.imageUrl} size="xl" />
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
                <Icon name="users" className="size-3.5 text-faint" />{speaker.followerCount} following
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(({ key, icon, href }) => speaker.socials[key] && (
                <Button key={key} size="sm" href={href(speaker.socials[key])} target="_blank" rel="noreferrer">
                  <Icon name={icon} className="size-3" />
                  {speaker.socials[key].replace('https://', '').replace('in/', '')}
                </Button>
              ))}
            </div>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-4 sm:grid-cols-1 sm:gap-3 sm:text-right">
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

        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">{speaker.bio}</p>

        {speaker.expertise.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {speaker.expertise.map((e) => <Chip key={e} accent={speaker.accent}>{e}</Chip>)}
          </div>
        )}
      </header>

      <section>
        <h2 className="font-display text-2xl">
          {speaker.sessions.length ? `Speaking ${plural(speaker.sessions.length, 'time')}` : 'Not currently scheduled'}
        </h2>
        <div className="mt-5 space-y-8">
          {Object.entries(byDay).map(([day, items]) => (
            <div key={day}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">{dayLabel(day)}</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
                {items.map((s) => <SessionCard key={s.id} session={s} />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
