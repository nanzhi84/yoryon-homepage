export const LIFE_START = "2004-11-26";
export const LIFE_TIME_ZONE = "Asia/Shanghai";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIFE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Compare calendar dates, rather than elapsed hours or the viewer's time zone.
// The birth date is day zero. UTC is only used to compare these calendar dates.
export function getLifeDays(now = new Date()): number {
  const parts = dayFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((value) => value.type === type)?.value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  return Math.max(0, Math.floor((today - Date.UTC(2004, 10, 26)) / 86_400_000));
}

export const formatLifeDays = (days: number) => days.toLocaleString("en-US");
