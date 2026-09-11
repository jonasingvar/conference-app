import { Link } from 'react-router-dom';
import { Avatar, Chip, cx } from './ui.jsx';
import { Icon } from './Icon.jsx';

export function SpeakerCard({ speaker }) {
  return (
    <Link
      to={`/speakers/${speaker.id}`}
      className={cx(
        'group relative flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface/70 p-5 text-center',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-raised/70 hover:shadow-xl hover:shadow-black/40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
      )}
    >
      {speaker.featured && (
        <span className="absolute right-3 top-3 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
          Keynote
        </span>
      )}
      <Avatar name={speaker.name} initials={speaker.initials} accent={speaker.accent} imageUrl={speaker.imageUrl} size="lg" />
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
        <span className="inline-flex items-center gap-1">
          <Icon name="mic" className="size-3" />
          {speaker.sessionCount ?? speaker.sessions?.length ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="globe" className="size-3" />
          {speaker.city}
        </span>
      </div>
    </Link>
  );
}
