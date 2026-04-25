// LLM이 반환한 ko/en 페어가 Foddy 톤 / 길이 / 보안 가드 / 메타 누설 금지를
// 만족하는지 검증. 통과 못 하면 null 반환 → API route는 503 응답 → 클라가 시드 fallback.

export type Koan = { ko: string; en: string };

export type ValidationFailure = {
  reason: string;
  ko: string;
  en: string;
};

export function validateKoan(
  raw: unknown
): { ok: true; value: Koan } | { ok: false; failure: ValidationFailure } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, failure: { reason: "not-object", ko: "", en: "" } };
  }
  const obj = raw as { ko?: unknown; en?: unknown };
  if (typeof obj.ko !== "string" || typeof obj.en !== "string") {
    return { ok: false, failure: { reason: "wrong-types", ko: "", en: "" } };
  }
  const ko = obj.ko.trim();
  const en = obj.en.trim();
  const fail = (reason: string) => ({
    ok: false as const,
    failure: { reason, ko, en },
  });

  // 길이 (시스템 프롬프트보다 살짝 여유)
  if (ko.length < 6 || ko.length > 40) return fail("ko-length");
  if (en.length < 10 || en.length > 70) return fail("en-length");
  const wordCount = en.split(/\s+/).filter(Boolean).length;
  if (wordCount < 3 || wordCount > 14) return fail("en-words");

  // 언어 비율 — ko에 한글 충분, en에 영문 충분
  const koHan = (ko.match(/[가-힣]/g) || []).length;
  if (koHan / ko.length < 0.4) return fail("ko-not-korean");
  const enLatin = (en.match(/[A-Za-z]/g) || []).length;
  if (enLatin / en.length < 0.55) return fail("en-not-english");

  // 톤 ban — 응원/위로
  if (/(잘했|화이팅|괜찮아|힘내|할 수 있어|믿어|응원|포기하지|행복|파이팅)/.test(ko)) {
    return fail("ko-encouragement");
  }
  if (/\b(awesome|amazing|good job|keep going|don't give up|you can do|believe in|inspire)\b/i.test(en)) {
    return fail("en-encouragement");
  }

  // 느낌표/물음표/이모지
  if (/[!?]/.test(ko + en)) return fail("punct-bang-question");
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ko + en)) {
    return fail("emoji");
  }

  // 한국어 명령형 — 어미 한정
  if (/(해라|해야 한다|하세요|하지 마|해 봐)\.?$/.test(ko)) {
    return fail("ko-imperative");
  }
  // 영어 명령형 — 2인칭 직접 명령
  if (/^(you should|you must|you need to|you ought)\b/i.test(en)) {
    return fail("en-imperative");
  }

  // 메타 누설 금지
  if (/\b(AI|LLM|prompt|trigger|recent 5 seconds|getting over it|bennett foddy)\b/i.test(en)) {
    return fail("en-meta-leak");
  }
  if (/(AI|LLM|프롬프트|트리거|최근 5초|항아리 게임|포디|베넷)/i.test(ko)) {
    return fail("ko-meta-leak");
  }

  return { ok: true, value: { ko, en } };
}
