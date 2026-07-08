const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatRelativeTime = (fromSeconds: number, toSeconds: number): string => {
  const deltaSeconds = fromSeconds - toSeconds;
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(deltaSeconds) >= unitSeconds || unit === "second") {
      return relativeFormatter.format(Math.round(deltaSeconds / unitSeconds), unit);
    }
  }
  return relativeFormatter.format(0, "second");
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount);

export const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
};

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/(?:^-+)|(?:-+$)/gu, "");
