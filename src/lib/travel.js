/**
 * Travel-time helpers for a conference spread across two sites.
 *
 * The Foundry is 6.2 miles from Aurora. Getting between them is a real
 * cost in minutes, and any feature that reasons about an attendee's day
 * should account for it.
 */

/** All modes between two venues, cheapest-in-time first. */
export function routesBetween(travel, fromVenueId, toVenueId) {
  return travel
    .filter((t) => t.fromVenueId === fromVenueId && t.toVenueId === toVenueId)
    .sort((a, b) => a.minutes - b.minutes);
}

/**
 * Can you get from one session to the next in the gap between them?
 *
 * Returns every mode that fits and every mode that does not, because the
 * interesting answer is rarely yes or no — it is usually "not on the free
 * shuttle, but a rideshare just about does it".
 */
export function assessTravel({ travel, from, to, gapMinutes }) {
  if (!from || !to || from.venue.id === to.venue.id) return null;

  const walk = to.room.walkMinutes ?? 0;
  const options = travel
    .filter((t) => t.fromVenueId === from.venue.id && t.toVenueId === to.venue.id && t.mode !== 'Walk')
    .map((t) => ({ ...t, total: t.minutes + walk, fits: gapMinutes >= t.minutes + walk }))
    .sort((a, b) => a.total - b.total);

  if (!options.length) return null;
  const free = options.find((o) => o.costUsd === 0);

  return {
    gapMinutes,
    walk,
    options,
    fastest: options[0],
    free,
    // nothing fits at all, or only something you have to pay for
    impossible: options.every((o) => !o.fits),
    freeTooSlow: Boolean(free && !free.fits && options.some((o) => o.fits)),
  };
}

const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Every cross-town hop in one day of an agenda.
 *
 * Pairs each confirmed session with the next one, in start order, and keeps
 * the pairs that change venue. A waitlist place is skipped rather than paired:
 * it is not somewhere you will be, so the sessions either side of it are the
 * real journey.
 */
export function travelLegs({ travel, sessions, isConfirmed }) {
  const held = sessions
    .filter(isConfirmed)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return held.slice(1).flatMap((to, i) => {
    const from = held[i];
    const check = assessTravel({ travel, from, to, gapMinutes: minutesOf(to.startsAt) - minutesOf(from.endsAt) });
    return check ? [{ from, to, check }] : [];
  });
}
