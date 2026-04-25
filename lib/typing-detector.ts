import { TRIGGER, type RuleCategory } from "./trigger-config";

// TODO(IME): 현재는 한국어 조합 입력(e.isComposing / key === "Process")도 영문과
// 동일하게 Panic Typing 카운트에 포함한다. 한국어로 빠르게 치면 과민 발화되는
// 과민 케이스가 알려져 있으며, 추후 compositionstart/compositionend를 구독해
// 조합 중에는 panic 카운트에서 제외하도록 수정할 수 있다.

type RuleHit = Extract<RuleCategory, "panic" | "backspace" | "silence" | "keyrepeat">;

const MODIFIER_ONLY_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "Dead",
]);

const SILENCE_RESET_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Tab",
]);

const KEYREPEAT_KEYS = new Set<string>(TRIGGER.keyRepeat.keys);

export type TriggerMeta = {
  reason: string;
  metrics: Record<string, number | string>;
};

export type TypingDetectorOptions = {
  onTrigger: (rule: RuleHit, meta: TriggerMeta) => void;
};

function prune(buf: number[], cutoff: number) {
  while (buf.length > 0 && buf[0] < cutoff) buf.shift();
}

export class TypingDetector {
  private readonly opts: TypingDetectorOptions;

  // Rule A 1s window
  private keystrokes1s: number[] = [];
  // Rule B 1s window
  private backspaces1s: number[] = [];
  // Rule E 1s window per key
  private keyRepeatCounts: Map<string, number[]> = new Map();
  // Rule C: 12s history for "prior activity within 5s" check
  private keystrokes12s: number[] = [];

  // Hold 타이머 — 각 키별 독립
  private holdTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Silence 단일 타이머
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  private disposed = false;

  constructor(opts: TypingDetectorOptions) {
    this.opts = opts;
    this.attach();
    this.armSilence();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.detach();
    this.clearAllHoldTimers();
    this.clearSilence();
  }

  private attach() {
    window.addEventListener("keydown", this.onKeyDown, { capture: true });
    window.addEventListener("keyup", this.onKeyUp, { capture: true });
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private detach() {
    window.removeEventListener("keydown", this.onKeyDown, { capture: true });
    window.removeEventListener("keyup", this.onKeyUp, { capture: true });
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private onBlur = () => {
    this.clearAllHoldTimers();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") {
      this.clearAllHoldTimers();
      this.clearSilence();
    } else {
      this.armSilence();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // 수동 단축키(Cmd+Shift+…)는 typing-engine-host가 별도로 처리.
    // 여기서는 카운트만 하므로 preventDefault/stopPropagation을 절대 호출하지 않는다.

    const key = e.key;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());

    // silence: 어떤 의미 있는 키라도 들어오면 리셋
    if (!MODIFIER_ONLY_KEYS.has(key)) {
      this.armSilence();
      this.keystrokes12s.push(now);
      prune(this.keystrokes12s, now - TRIGGER.silence.historyWindowMs);
    }

    // Rule A — Panic Typing
    const isCommandCombo = e.metaKey || e.ctrlKey || e.altKey;
    const countsTowardPanic =
      !isCommandCombo &&
      !MODIFIER_ONLY_KEYS.has(key) &&
      !SILENCE_RESET_KEYS.has(key) &&
      key !== "Escape" &&
      key !== "Enter";
    if (countsTowardPanic) {
      this.keystrokes1s.push(now);
      prune(this.keystrokes1s, now - TRIGGER.panic.windowMs);
      if (this.keystrokes1s.length >= TRIGGER.panic.threshold) {
        const count = this.keystrokes1s.length;
        console.log(
          `[TypingOverIt] [A/패닉] 손이 머리보다 빨라졌습니다 — 최근 1초 안에 ${count}타 (임계 ${TRIGGER.panic.threshold})`
        );
        this.opts.onTrigger("panic", {
          reason: `User typed ${count} characters within 1 second (threshold ${TRIGGER.panic.threshold})`,
          metrics: { keystrokesPerSec: count, threshold: TRIGGER.panic.threshold },
        });
        // 연속 발화 방지: 윈도우 비우기
        this.keystrokes1s.length = 0;
      }
    }

    // Rule B — Backspace
    if (key === "Backspace") {
      if (!e.repeat) {
        this.backspaces1s.push(now);
        prune(this.backspaces1s, now - TRIGGER.backspace.windowMs);
        if (this.backspaces1s.length >= TRIGGER.backspace.burstThreshold) {
          const count = this.backspaces1s.length;
          console.log(
            `[TypingOverIt] [B/백스페이스-연타] 수정 지옥 — 최근 1초 안에 Backspace ${count}회 (임계 ${TRIGGER.backspace.burstThreshold})`
          );
          this.opts.onTrigger("backspace", {
            reason: `Backspace was pressed ${count} times within 1 second`,
            metrics: { backspaceCount: count, windowMs: TRIGGER.backspace.windowMs },
          });
          this.backspaces1s.length = 0;
        }
        this.startHoldTimer("Backspace", TRIGGER.backspace.holdMs, "backspace");
      }
    }

    // Rule E — Esc/Enter/Space 연타 + 꾹 누름
    if (KEYREPEAT_KEYS.has(key)) {
      if (!e.repeat) {
        let buf = this.keyRepeatCounts.get(key);
        if (!buf) {
          buf = [];
          this.keyRepeatCounts.set(key, buf);
        }
        buf.push(now);
        prune(buf, now - TRIGGER.keyRepeat.windowMs);
        if (buf.length >= TRIGGER.keyRepeat.burstThreshold) {
          const label = key === " " ? "Space" : key;
          const count = buf.length;
          console.log(
            `[TypingOverIt] [E/키-연타] 문제에 반응만 하는 중 — ${label} 1초에 ${count}회 (임계 ${TRIGGER.keyRepeat.burstThreshold})`
          );
          this.opts.onTrigger("keyrepeat", {
            reason: `${label} was pressed ${count} times within 1 second`,
            metrics: { key: label, count, windowMs: TRIGGER.keyRepeat.windowMs },
          });
          buf.length = 0;
        }
        this.startHoldTimer(key, TRIGGER.keyRepeat.holdMs, "keyrepeat");
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.clearHoldTimer(e.key);
  };

  private startHoldTimer(key: string, ms: number, rule: RuleHit) {
    // 이미 타이머가 있으면 무시 (중복 방지)
    if (this.holdTimers.has(key)) return;
    const t = setTimeout(() => {
      this.holdTimers.delete(key);
      const label = key === " " ? "Space" : key;
      const meaning =
        rule === "backspace"
          ? "체념의 꾹 누름"
          : "멍한 길게 누름";
      console.log(
        `[TypingOverIt] [${rule === "backspace" ? "B" : "E"}/꾹-누름] ${meaning} — ${label} 키를 ${ms}ms 이상 누르고 있음`
      );
      this.opts.onTrigger(rule, {
        reason: `${label} key was held down for at least ${ms}ms`,
        metrics: { key: label, holdMs: ms },
      });
    }, ms);
    this.holdTimers.set(key, t);
  }

  private clearHoldTimer(key: string) {
    const t = this.holdTimers.get(key);
    if (t) {
      clearTimeout(t);
      this.holdTimers.delete(key);
    }
  }

  private clearAllHoldTimers() {
    this.holdTimers.forEach((t) => clearTimeout(t));
    this.holdTimers.clear();
  }

  private armSilence() {
    this.clearSilence();
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      this.maybeFireSilence();
    }, TRIGGER.silence.silenceMs);
  }

  private clearSilence() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private maybeFireSilence() {
    // 스펙: "이전 5초엔 입력이 있었음" — 즉 '갑자기 멈춘' 케이스에서만 발화.
    // silence 타이머 발화 시점에서 "역으로 5초 + 7초 = 12초 창" 안에 stroke가 있었는지 본다.
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    prune(this.keystrokes12s, now - TRIGGER.silence.historyWindowMs);

    // 가장 최근 stroke가 "지금 - silenceMs ± " 근처이고,
    // 그 stroke 이전 priorActivityWindowMs 안에 또 다른 stroke가 있었는지.
    const last = this.keystrokes12s[this.keystrokes12s.length - 1];
    if (last === undefined) return; // 애초에 입력이 없었으면 발화 안 함
    const priorCutoff = last - TRIGGER.silence.priorActivityWindowMs;
    const hasPrior = this.keystrokes12s.some(
      (t) => t >= priorCutoff && t < last
    );
    if (!hasPrior) return;

    const sinceLast = Math.round(now - last);
    console.log(
      `[TypingOverIt] [C/침묵] 갑자기 멈췄습니다 — 마지막 입력 이후 ${sinceLast}ms 경과 (임계 ${TRIGGER.silence.silenceMs}ms)`
    );
    this.opts.onTrigger("silence", {
      reason: `User stopped typing ${sinceLast}ms ago after a burst of activity`,
      metrics: {
        silenceMs: sinceLast,
        thresholdMs: TRIGGER.silence.silenceMs,
      },
    });
  }
}
