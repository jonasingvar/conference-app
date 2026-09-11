import { Icon } from './Icon.jsx';
import { cx } from './ui.jsx';

export function SearchInput({ value, onChange, placeholder = 'Search…', className, ...rest }) {
  return (
    <div className={cx('relative', className)}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-hairline bg-ground/70 pl-9 pr-3 text-sm placeholder:text-faint focus:border-violet-400/60 focus:bg-ground focus:outline-none"
        {...rest}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, className }) {
  return (
    <label className={cx('relative block', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-hairline bg-ground/70 pl-3 pr-8 text-sm text-ink focus:border-violet-400/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">{o.label}</option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
    </label>
  );
}

/** Horizontal scrolling tab strip — used for day selection. */
export function TabStrip({ tabs, value, onChange, className }) {
  return (
    <div className={cx('hide-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            data-testid={`tab-${t.value}`}
            className={cx(
              'shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all',
              active
                ? 'border-violet-400/50 bg-violet-500/15 text-ink'
                : 'border-hairline bg-surface text-muted hover:border-white/20 hover:bg-raised hover:text-ink',
            )}
          >
            <span className="block text-sm font-semibold leading-tight">{t.label}</span>
            {t.sublabel && <span className="block text-[11px] text-faint">{t.sublabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
