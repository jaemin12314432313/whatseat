/**
 * 메뉴 라벨 정규화 — api-spec §3.3 (trim) + spec §5 중복 제안 비교용.
 */

const MAX_LABEL_LEN = 80;

export function trimMenuLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** 같은 후보로 합치기 위한 비교 키 (공백 정규화 + ASCII만 소문자) */
export function menuLabelDedupKey(raw: string): string {
  return trimMenuLabel(raw).toLowerCase();
}

export function validateMenuLabelTrimmed(trimmed: string): string | null {
  if (trimmed.length === 0) return "메뉴 이름을 입력해 주세요.";
  if (trimmed.length > MAX_LABEL_LEN) {
    return `메뉴 이름은 ${MAX_LABEL_LEN}자 이하로 입력해 주세요.`;
  }
  return null;
}
