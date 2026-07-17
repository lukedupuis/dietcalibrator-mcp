/** Today's date as a local `YYYY-MM-DD` string. */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Matches a `YYYY-MM-DD` date string. */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
