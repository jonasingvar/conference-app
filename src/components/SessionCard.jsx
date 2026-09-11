import { Link } from 'react-router-dom';
import { accent } from '../lib/accents.js';
import { timeRange } from '../lib/format.js';
import { useConference } from '../lib/store.jsx';
import { Avatar, Chip, FavoriteButton, Rating, cx } from './ui.jsx';
import { Icon } from './Icon.jsx';

/**
 * The workhorse card, in two layouts:
 *   variant="grid" — schedule grid and search results
 *   variant="row"  — compact, used inside day timelines and speaker pages
 *
 * The grid card is deliberately banded: a coloured track rail, a header strip,
 * the body, then a footer strip. The bands are what let you scan a wall of
 * these without every card melting into the next.
 */
export function SessionCard({ session, variant = 'grid', showDay = false }) {
  const { isFavorite, toggleFavorite } = useConference();
  const favorite = isFavorite(session.id);
  const a = accent(session.track.color);
  const v = accent(session.venue.accent);
  const nearlyFull = session.fillRate >= 0.92;
  const offsite = !session.venue.isPrimary;

  if (variant === 'row') {
    return (
      <div className={cx(
        'group relative flex scroll-mt-28 items-stretch gap-0 overflow-hidden rounded-xl border bg-raised transition-colors',
        'hover:border-white/20 hover:bg-overlay',
        favorite ? 'border-amber-400/30' : 'border-hairline',
      )}>
        <span className={cx('w-1 shrink-0 bg-gradient-to-b', a.grad)} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-start gap-3 p-3">
          <div className="w-[4.25rem] shrink-0 pt-0.5">
            <div className="font-mono text-xs font-semibold text-ink">{session.startsAt}</div>
            <div className="font-mono text-[10px] text-faint">{session.endsAt}</div>
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/sessions/${session.id}`} className="block focus-visible:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-violet-200">
                {session.title}
              </h3>
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className={cx('inline-flex items-center gap-1.5 font-semibold', a.text)}>
                <span className={cx('size-1.5 rounded-full', a.dot)} />
                {session.track.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" className="size-3" />
                {session.room.name}
              </span>
              {offsite && (
                <span className={cx('inline-flex items-center gap-1 font-semibold', v.text)}>
                  <Icon name="car" className="size-3" /> {session.venue.shortName}
                </span>
              )}
            </div>
          </div>
          <FavoriteButton size="sm" active={favorite} onClick={() => toggleFavorite(session.id)} />
        </div>
      </div>
    );
  }

  return (
    <article
      className={cx(
        'group relative flex scroll-mt-28 flex-col overflow-hidden rounded-xl border bg-raised transition-colors duration-150',
        'hover:border-white/20 hover:bg-overlay/70',
        favorite ? 'border-amber-400/40' : 'border-hairline',
      )}
    >
      {/* Track rail — the primary way to tell cards apart at a glance. */}
      <span className={cx('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', a.grad)} aria-hidden="true" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 pl-5 pt-3.5">
        <div className="min-w-0">
          <span className={cx('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', a.text)}>
            <span className={cx('size-1.5 shrink-0 rounded-full', a.dot)} />
            <span className="truncate">{session.track.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
            {showDay && <span className="text-faint">{session.day.slice(5)}</span>}
            <Icon name="clock" className="size-3 shrink-0 text-faint" />
            {timeRange(session.startsAt, session.endsAt)}
          </span>
        </div>
        <FavoriteButton active={favorite} onClick={() => toggleFavorite(session.id)} />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-4 pt-2.5">
        <Link to={`/sessions/${session.id}`} className="focus-visible:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          <h3 className="line-clamp-2 font-display text-[1.0625rem] leading-snug transition-colors group-hover:text-violet-200">
            {session.title}
          </h3>
        </Link>
        {session.subtitle && (
          <p className="mt-1 line-clamp-1 text-[11px] italic text-faint">{session.subtitle}</p>
        )}

        <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{session.abstract}</p>

        {session.speakers?.length > 0 && (
          <div className="mt-4 flex items-center gap-2.5 pt-1">
            <div className="flex -space-x-2">
              {session.speakers.slice(0, 3).map((s) => (
                <Avatar key={s.id} name={s.name} initials={s.initials} accent={s.accent}
                  imageUrl={s.imageUrl} size="sm" className="ring-2 ring-raised" />
              ))}
            </div>
            <div className="min-w-0 text-[11px] leading-tight">
              <div className="truncate font-semibold text-ink">
                {session.speakers[0].name}
                {session.speakers.length > 1 && (
                  <span className="font-normal text-faint"> +{session.speakers.length - 1}</span>
                )}
              </div>
              <div className="truncate text-faint">{session.speakers[0].company}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-hairline px-4 py-2.5 pl-5 text-[11px] text-muted">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Icon name="pin" className="size-3 shrink-0 text-faint" />
          <span className="truncate font-medium">{session.room.name}</span>
        </span>
        {offsite && (
          <Chip accent={session.venue.accent} className="!py-0.5 !text-[10px]">
            <Icon name="car" className="size-3" /> {session.venue.shortName}
          </Chip>
        )}
        <span className="text-faint">{session.format}</span>
        <span className="text-overlay">·</span>
        <span className="text-faint">{session.level}</span>
        <div className="ml-auto flex items-center gap-2.5">
          {nearlyFull && <span className="font-bold text-rose-300">Nearly full</span>}
          {session.isRecorded && <Icon name="play" className="size-3 text-faint" />}
          <Rating value={session.avgRating} count={session.ratingCount} showValue={false} />
        </div>
      </div>
    </article>
  );
}
