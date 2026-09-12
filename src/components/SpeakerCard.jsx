import { Link } from 'react-router-dom';
import { useConference } from '../lib/store.jsx';
import { Avatar, Chip, cx } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { GeneratedCover } from './GeneratedCover.jsx';

/**
 * Three densities, because 180 speakers cannot all be equally important:
 *   "headline" — the keynote names, photo-forward with a bio line
 *   "grid"     — the default card
 *   "row"      — a compact line for the long tail
 */
export function SpeakerCard({ speaker, variant = 'grid' }) {
  const { isFollowing } = useConference();
  const following = isFollowing(speaker.id);
  const sessionCount = speaker.sessionCount ?? speaker.sessions?.length ?? 0;

  if (variant === 'headline') {
    return (
      <Link
        to={`/speakers/${speaker.id}`}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-raised transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-overlay/70 hover:shadow-2xl hover:shadow-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        <div className="relative h-20 overflow-hidden">
          <GeneratedCover seed={speaker.name} accent={speaker.accent} variant="strata"
            className="size-full transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-raised via-raised/45 to-transparent" />
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Keynote
          </span>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5">
          <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent}
            imageUrl={speaker.imageUrl} size="lg" className="-mt-9 ring-4 ring-raised transition-transform duration-300 group-hover:scale-110" />
          <h3 className="mt-3 font-display text-lg leading-tight transition-colors group-hover:text-violet-200">
            {speaker.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{speaker.jobTitle}</p>
          <p className="text-xs font-semibold text-faint">{speaker.company}</p>
          <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">{speaker.bio}</p>
          <div className="mt-auto flex items-center gap-3 pt-4 text-[11px] text-faint">
            <span className="inline-flex items-center gap-1"><Icon name="mic" className="size-3" />{sessionCount}</span>
            <span className="inline-flex items-center gap-1"><Icon name="pin" className="size-3" />{speaker.city}</span>
            {speaker.avgRating > 0 && (
              <span className="ml-auto inline-flex items-center gap-1">
                <Icon name="star" filled className="size-3 text-amber-400" />{speaker.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  /**
   * The long tail. Ninety-odd people, so this is a name index, not a profile
   * list — title, company and city all truncated to nothing at this width and
   * only added height. They are one tap away on the profile.
   */
  if (variant === 'compact') {
    return (
      <Link
        to={`/speakers/${speaker.id}`}
        title={`${speaker.name} — ${speaker.jobTitle}, ${speaker.company}`}
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent}
          imageUrl={speaker.imageUrl} size="xs" ring={false} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium group-hover:text-violet-200">
          {speaker.name}
        </span>
        {following && <Icon name="check" className="size-3 shrink-0 text-emerald-400" />}
        {sessionCount > 1 && (
          <span className="shrink-0 font-mono text-[10px] text-faint">{sessionCount}</span>
        )}
      </Link>
    );
  }

  if (variant === 'row') {
    return (
      <Link
        to={`/speakers/${speaker.id}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      >
        <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent}
          imageUrl={speaker.imageUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold group-hover:text-violet-200">{speaker.name}</div>
          <div className="truncate text-[11px] text-muted">{speaker.jobTitle} · {speaker.company}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-[11px] text-faint sm:flex">
          <span className="inline-flex items-center gap-1"><Icon name="mic" className="size-3" />{sessionCount}</span>
          <span className="w-24 truncate text-right">{speaker.city}</span>
        </div>
        <Icon name="chevronRight" className="size-4 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <Link
      to={`/speakers/${speaker.id}`}
      className={cx(
        'group relative flex flex-col items-center gap-3 rounded-xl border border-hairline bg-raised p-5 text-center',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-overlay/70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
      )}
    >
      {following && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
          <Icon name="check" className="size-2.5" />Following
        </span>
      )}
      {speaker.featured && (
        <span className="absolute right-3 top-3 rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
          Keynote
        </span>
      )}
      <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent}
        imageUrl={speaker.imageUrl} size="lg" />
      <div className="min-w-0">
        <h3 className="truncate font-semibold leading-tight transition-colors group-hover:text-violet-200">
          {speaker.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{speaker.jobTitle}</p>
        <p className="line-clamp-1 text-xs font-medium text-faint">{speaker.company}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-center gap-1.5">
        {speaker.expertise.slice(0, 2).map((e) => (
          <Chip key={e} className="!px-2 !py-0.5 !text-[10px]">{e}</Chip>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1"><Icon name="mic" className="size-3" />{sessionCount}</span>
        <span className="inline-flex items-center gap-1"><Icon name="globe" className="size-3" />{speaker.city}</span>
      </div>
    </Link>
  );
}
