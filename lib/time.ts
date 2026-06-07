// Duration helpers for time tracking. Internally we work in seconds.

/** Format seconds as a compact human string: "2h 30m", "45m", "1h", "30s". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!h && !m && sec) parts.push(`${sec}s`);
  return parts.join(" ") || "0m";
}

/** Format seconds as a live clock for a running timer: "1:23:45" or "12:05". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Parse a human duration into seconds. Accepts "1h 30m", "90m", "2h", "45",
 * "1.5h", "1:30" (h:m). Returns null when nothing usable is found.
 */
export function parseDuration(input: string): number | null {
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // "h:mm" clock form
  const clock = str.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return parseInt(clock[1], 10) * 3600 + parseInt(clock[2], 10) * 60;

  let total = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|seconds)?/g;
  let mch: RegExpExecArray | null;
  while ((mch = re.exec(str)) !== null) {
    if (!mch[0].trim()) continue;
    const value = parseFloat(mch[1]);
    if (Number.isNaN(value)) continue;
    const unit = mch[2] ?? "m"; // bare number → minutes
    matched = true;
    if (unit.startsWith("h")) total += value * 3600;
    else if (unit.startsWith("s")) total += value;
    else total += value * 60;
  }
  return matched ? Math.round(total) : null;
}
