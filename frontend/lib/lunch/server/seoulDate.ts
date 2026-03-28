/**
 * spec.md §5 — MVP는 한국 시간 단일 기준으로 "오늘" 날짜(YYYY-MM-DD)를 맞춘다.
 */
export function seoulDateString(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/** 11:30 KST → UTC ISO (한국은 서머타임 없음) */
export function defaultClosesAtUtcIsoForDate(sessionDateYmd: string): string {
  return `${sessionDateYmd}T02:30:00.000Z`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalSessionDate(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!ISO_DATE.test(s)) return null;
  return s;
}
