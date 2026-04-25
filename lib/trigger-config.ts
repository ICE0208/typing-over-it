export type RuleCategory =
  | "welcome"
  | "panic"
  | "backspace"
  | "silence"
  | "noise"
  | "keyrepeat";

export const TRIGGER = {
  panic: { windowMs: 1000, threshold: 22 },
  backspace: { windowMs: 1000, burstThreshold: 5, holdMs: 2000 },
  silence: {
    silenceMs: 30000,
    priorActivityWindowMs: 5000,
    historyWindowMs: 35000,
  },
  keyRepeat: {
    keys: ["Escape", "Enter", " "] as const,
    windowMs: 1000,
    burstThreshold: 5,
    holdMs: 2000,
  },
} as const;

export const CAPTION_TIMING = {
  fadeInMs: 200,
  holdMs: 4000,
  fadeOutMs: 1500,
  clearFadeMs: 100,
} as const;

export const PRIORITY: readonly RuleCategory[] = [
  "welcome",
  "silence",
  "panic",
  "backspace",
  "noise",
  "keyrepeat",
] as const;

export const MANUAL_KEYS: Record<string, RuleCategory | "clear"> = {
  "1": "panic",
  "2": "backspace",
  "3": "silence",
  "4": "noise",
  "5": "keyrepeat",
  "0": "clear",
};

// 수동 트리거 단축키 조합. macOS 시스템 단축키(Cmd+Shift+3/4/5 = 스크린샷)와
// 충돌하지 않도록 Ctrl+Alt 조합을 사용한다. Windows/Linux에서도 동일하게 동작.
// macOS 표기: Control+Option+숫자
export const MANUAL_MODIFIER = {
  ctrlKey: true,
  altKey: true,
  shiftKey: false,
  metaKey: false,
} as const;

export const MANUAL_MODIFIER_LABEL = "Ctrl+Alt";


export function priorityIndex(rule: RuleCategory): number {
  return PRIORITY.indexOf(rule);
}
