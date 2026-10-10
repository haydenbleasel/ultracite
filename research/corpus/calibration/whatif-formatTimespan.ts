// What-if for example c-pure-21-30 (next.js formatTimespan): identical behaviour, but the
// `if (seconds > 0) { … }` wrapper is inverted into an early return. Written for this analysis;
// not from any repository. Measured with the same tools to show what the nesting penalty costs.
const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60;
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;
const WEEK_IN_SECONDS = DAY_IN_SECONDS * 7;
const MONTH_30_DAYS_IN_SECONDS = DAY_IN_SECONDS * 30;

export function formatTimespanEarlyReturn(seconds: number): string {
  if (seconds <= 0) {
    return `${seconds} seconds`;
  }
  if (seconds === MONTH_30_DAYS_IN_SECONDS) {
    return "1 month";
  }
  if (seconds === WEEK_IN_SECONDS) {
    return "1 week";
  }
  if (seconds === DAY_IN_SECONDS) {
    return "1 day";
  }
  if (seconds === HOUR_IN_SECONDS) {
    return "1 hour";
  }
  if (seconds === MINUTE_IN_SECONDS) {
    return "1 minute";
  }
  if (seconds % MONTH_30_DAYS_IN_SECONDS === 0) {
    return `${seconds / MONTH_30_DAYS_IN_SECONDS} months`;
  }
  if (seconds % 18144000 === 0) {
    return `${seconds / 18144000} months`;
  }
  if (seconds % WEEK_IN_SECONDS === 0) {
    return `${seconds / WEEK_IN_SECONDS} weeks`;
  }
  if (seconds % DAY_IN_SECONDS === 0) {
    return `${seconds / DAY_IN_SECONDS} days`;
  }
  if (seconds % HOUR_IN_SECONDS === 0) {
    return `${seconds / HOUR_IN_SECONDS} hours`;
  }
  if (seconds % MINUTE_IN_SECONDS === 0) {
    return `${seconds / MINUTE_IN_SECONDS} minutes`;
  }
  return `${seconds} seconds`;
}
