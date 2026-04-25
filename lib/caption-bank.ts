import type { RuleCategory } from "./trigger-config";

export type CaptionPair = { ko: string; en: string };

// 02_CAPTION_BANK.md의 카테고리별 한/영 문장을 페어링한 것.
// §9 "데모용 강한 5개"의 명시 페어를 기본으로, §2~§6의 개별 문장을 조합해
// 각 카테고리마다 3~5개의 쌍을 만든다. §10 "Flip Examples"도 일부 흡수.
export const captionBank: Record<RuleCategory, CaptionPair[]> = {
  panic: [
    {
      ko: "손은 급해졌습니다. 머리는 아직 합류하지 못했습니다.",
      en: "Your hands are moving. Your plan isn't.",
    },
    {
      ko: "지금은 생산성이 아니라 속도만 존재합니다.",
      en: "Fast typing is one of the oldest disguises for confusion.",
    },
    {
      ko: "당신은 전진 중이 아닙니다. 단지 빠르게 흔들리고 있을 뿐입니다.",
      en: "You typed with conviction for three seconds.",
    },
    {
      ko: "근데 손만 먼저 갔죠.",
      en: "Your hands are moving. Your plan isn't.",
    },
  ],
  backspace: [
    {
      ko: "백스페이스가 오늘 가장 성실한 팀원입니다.",
      en: "You are not editing. You are retreating with rhythm.",
    },
    {
      ko: "문장을 고치는 중이 아니라, 방금의 자신을 부정하는 중입니다.",
      en: "Regret has found a dedicated key.",
    },
    {
      ko: "이 정도면 입력보다 철회가 더 많군요.",
      en: "The line is cleaner now. The idea is not.",
    },
    {
      ko: "근데 모든 걸 지운 건 아니죠.",
      en: "You are not editing. You are retreating with rhythm.",
    },
  ],
  silence: [
    {
      ko: "조용하군요. 처념의 침묵에 가깝습니다.",
      en: "Silence. The part where confidence leaves the room.",
    },
    {
      ko: "버그를 찾은 침묵일 수도 있습니다. 체념의 침묵일 가능성이 더 큽니다.",
      en: "No movement. A familiar shape of defeat.",
    },
    {
      ko: "지금 당신은 생각 중이라기보다 응시 중입니다.",
      en: "You paused where certainty usually ends.",
    },
    {
      ko: "거기서 다들 멈추죠.",
      en: "Silence. The part where confidence leaves the room.",
    },
  ],
  // Rule D는 스코프 밖. 풀이 비어있으면 scheduler가 발화를 스킵한다.
  noise: [],
  // Rule E(Esc/Enter/Space 연타/꾹 누름)는 §6 Retry Loop 풀을 재사용.
  keyrepeat: [
    {
      ko: "당신은 문제를 푼 것이 아니라, 더 작은 문제로 갈아탔습니다.",
      en: "You found a smaller problem to avoid the real one.",
    },
    {
      ko: "문제를 푸는 대신 이름을 바꾸고 있군요. 흔한 회피입니다.",
      en: "Naming is where momentum goes to hide.",
    },
    {
      ko: "변수명 하나가 오늘의 보스전이 되었습니다.",
      en: "You renamed the function. The doubt remained.",
    },
    {
      ko: "더 작은 문제로 갈아타는 속도가 인상적입니다.",
      en: "You almost believed that fix.",
    },
  ],
};

export function pickDifferent(
  pool: CaptionPair[],
  lastIdx: number
): { idx: number; value: CaptionPair } | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return { idx: 0, value: pool[0] };
  let idx = Math.floor(Math.random() * pool.length);
  if (idx === lastIdx) idx = (idx + 1) % pool.length;
  return { idx, value: pool[idx] };
}
