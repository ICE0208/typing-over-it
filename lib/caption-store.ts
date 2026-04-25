import type { RuleCategory } from "./trigger-config";

export type Phase = "idle" | "easing-in" | "holding" | "fading-out";

export type CaptionSnapshot =
  | {
      phase: Exclude<Phase, "idle">;
      ko: string;
      en: string;
      rule: RuleCategory;
      // 매 발화마다 고유 — CSS 트랜지션 리트리거용(같은 rule 연속 시 텍스트만 바뀌는 케이스)
      id: number;
    }
  | { phase: "idle" };

const idleSnapshot: CaptionSnapshot = { phase: "idle" };

let snapshot: CaptionSnapshot = idleSnapshot;
const listeners = new Set<() => void>();

export const captionStore = {
  get: (): CaptionSnapshot => snapshot,
  set: (next: CaptionSnapshot) => {
    snapshot = next;
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset: () => {
    snapshot = idleSnapshot;
    listeners.forEach((l) => l());
  },
};
