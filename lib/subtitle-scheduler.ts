import { captionBank, pickDifferent, type CaptionPair } from "./caption-bank";
import { captionStore, type Phase } from "./caption-store";
import {
  CAPTION_TIMING,
  priorityIndex,
  type RuleCategory,
} from "./trigger-config";

export class SubtitleScheduler {
  private phase: Phase = "idle";
  private currentRule: RuleCategory | null = null;
  private lastIdxByCategory: Map<RuleCategory, number> = new Map();

  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private nextId = 1;

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearPhaseTimer();
    this.phase = "idle";
    captionStore.reset();
  }

  /**
   * 자동 감지 또는 수동 트리거가 새 룰을 쏠 때.
   * - opts.force=true 면 모든 게이트(페이드아웃·페이드인·우선순위)를 무시하고
   *   phase가 뭐든 즉시 현재 자막을 interrupt하고 새 자막을 띄운다.
   *   단 자막 풀이 비어있으면 보여줄 내용이 없으므로 스킵.
   */
  fire(rule: RuleCategory, opts?: { force?: boolean }) {
    if (this.disposed) return;

    const force = opts?.force === true;

    // 풀 없으면 조용히 무시 (noise 등). force여도 보여줄 게 없음.
    const pool = captionBank[rule];
    if (!pool || pool.length === 0) {
      console.log(
        `[TypingOverIt] [거절] rule=${rule} 이유=자막 풀이 비어있음 (Rule D는 현재 스코프 밖)`
      );
      return;
    }

    if (!force) {
      // fade-out / easing-in 중에는 새 트리거 무시 (스펙)
      if (this.phase === "fading-out") {
        console.log(
          `[TypingOverIt] [거절] rule=${rule} 이유=이전 자막이 페이드아웃 중 (fade-out은 interrupt 불가)`
        );
        return;
      }
      if (this.phase === "easing-in") {
        console.log(
          `[TypingOverIt] [거절] rule=${rule} 이유=이전 자막이 페이드인 중 (깜빡임 방지)`
        );
        return;
      }

      if (this.phase === "holding" && this.currentRule) {
        const curPriority = priorityIndex(this.currentRule);
        const newPriority = priorityIndex(rule);
        // 더 높은 우선순위(index 작음)만 interrupt
        if (newPriority >= curPriority) {
          console.log(
            `[TypingOverIt] [거절] rule=${rule} 이유=현재 표시 중인 ${this.currentRule}보다 우선순위 같거나 낮음 (우선순위: silence>panic>backspace>noise>keyrepeat)`
          );
          return;
        }
        console.log(
          `[TypingOverIt] [교체] 기존=${this.currentRule} → 새=${rule} (우선순위 더 높아서 즉시 interrupt)`
        );
      }
    } else if (this.phase !== "idle") {
      console.log(
        `[TypingOverIt] [강제 교체] rule=${rule} — 기존 phase=${this.phase} (${this.currentRule ?? "?"}) 전부 무시하고 즉시 발화`
      );
    }

    const picked = pickDifferent(
      pool,
      this.lastIdxByCategory.get(rule) ?? -1
    );
    if (!picked) return;
    this.lastIdxByCategory.set(rule, picked.idx);

    console.log(
      `[TypingOverIt] [${force ? "강제 발화" : "발화"}] rule=${rule} idx=${picked.idx}  한글="${picked.value.ko}"  영문="${picked.value.en}"`
    );

    this.emit(rule, picked.value);
  }

  /** Cmd+Shift+0: phase 무관 즉시 제거 (짧은 페이드) */
  clear() {
    if (this.disposed) return;
    if (this.phase === "idle") return;
    console.log(
      `[TypingOverIt] [수동 제거] 진행 중이던 phase=${this.phase}에서 짧은 페이드로 종료`
    );
    this.clearPhaseTimer();
    const snap = captionStore.get();
    if (snap.phase === "idle") {
      this.phase = "idle";
      return;
    }
    // 짧은 페이드로 마무리
    captionStore.set({ ...snap, phase: "fading-out" });
    this.phase = "fading-out";
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      this.phase = "idle";
      this.currentRule = null;
      captionStore.reset();
    }, CAPTION_TIMING.clearFadeMs);
  }

  private emit(rule: RuleCategory, pair: CaptionPair) {
    this.clearPhaseTimer();

    this.currentRule = rule;
    this.phase = "easing-in";

    const id = this.nextId++;
    captionStore.set({
      phase: "easing-in",
      ko: pair.ko,
      en: pair.en,
      rule,
      id,
    });

    // ease-in 완료 → holding
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      if (this.disposed) return;
      const snap = captionStore.get();
      if (snap.phase === "idle") return;
      captionStore.set({ ...snap, phase: "holding" });
      this.phase = "holding";

      // holding 완료 → fading-out
      this.phaseTimer = setTimeout(() => {
        this.phaseTimer = null;
        if (this.disposed) return;
        const holdSnap = captionStore.get();
        if (holdSnap.phase === "idle") return;
        captionStore.set({ ...holdSnap, phase: "fading-out" });
        this.phase = "fading-out";

        // fade-out 완료 → idle
        this.phaseTimer = setTimeout(() => {
          this.phaseTimer = null;
          if (this.disposed) return;
          this.phase = "idle";
          this.currentRule = null;
          captionStore.reset();
        }, CAPTION_TIMING.fadeOutMs);
      }, CAPTION_TIMING.holdMs);
    }, CAPTION_TIMING.fadeInMs);
  }

  private clearPhaseTimer() {
    if (this.phaseTimer !== null) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }
}
