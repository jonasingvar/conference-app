/**
 * Travel-time helpers for a conference spread across two sites.
 *
 * The Foundry is 6.2 miles from Aurora. Getting between them is a real
 * cost in minutes, and any feature that reasons about an attendee's day
 * should account for it.
 */

/** Fastest listed mode between two venues, ignoring walking. */
export function fastestRoute(travel, fromVenueId, toVenueId) {
  if (fromVenueId === toVenueId) return null;
  const options = travel
    .filter((t) => t.fromVenueId === fromVenueId && t.toVenueId === toVenueId && t.mode !== 'Walk')
    .sort((a, b) => a.minutes - b.minutes);
  return options[0] ?? null;
}

/** All modes between two venues, cheapest-in-time first. */
export function routesBetween(travel, fromVenueId, toVenueId) {
  return travel
    .filter((t) => t.fromVenueId === fromVenueId && t.toVenueId === toVenueId)
    .sort((a, b) => a.minutes - b.minutes);
}
