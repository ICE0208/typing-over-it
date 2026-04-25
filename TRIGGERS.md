# Typing Over It — 트리거 가이드

Monaco 에디터에서 타이핑 패턴이 감지되면 하단에 *Getting Over It* 스타일의 한/영 자막쌍이 뜬다. 이 문서는 **언제 뜨는지**와 **직접 띄우는 법**을 정리한다.

---

## 1. 자동 트리거 규칙

### Rule A — Panic Typing (마구잡이 입력)
- **조건**: 최근 1초 안에 **22자 이상** 입력
- **의미**: 손이 먼저 나가고 머리는 못 따라오는 상태
- **카운트 대상**:
  - 일반 문자 키만. Shift/Ctrl/Alt/Meta/CapsLock 단일 키, 화살표, Backspace, Delete, Escape, Enter, Tab, Home/End/PageUp/Down은 제외.
  - Cmd/Ctrl/Alt가 눌린 단축키 조합은 제외.
- **IME(한글 조합) 주의**: 현재는 한글 조합 입력도 동일하게 카운트. 한국어로 빠르게 치면 과민 발화될 수 있음. → `lib/typing-detector.ts`의 `TODO(IME)` 참고.

### Rule B — Backspace Spiral (수정 지옥)
두 조건 중 **하나라도** 맞으면 발화.
- **연타**: 최근 1초 안에 Backspace **5회 이상** (운영체제 리피트는 카운트 안 함)
- **꾹 누름**: Backspace를 **2초 이상** 누른 채로 유지
- **의미**: 입력보다 철회가 더 많은 루프. 꾹 누름은 "체념", 연타는 "참을 수 없음".

### Rule C — Frozen Silence (침묵)
- **조건**: 마지막 입력 이후 **30초 이상** 무입력 **+** 그 직전 5초 안에 입력이 있었을 것
- "이전 5초엔 입력이 있었어야 한다" 가드: 페이지 로드 직후 아무 입력 없이 30초 가만 있어도 발화되지 않는다. 갑자기 멈춘 경우만.
- **의미**: 버그 발견 또는 체념. 해결 중이 아니라 응시 중.

### Rule E — Key Repeat Patterns (Esc / Enter / Space 연타·꾹 누름)
Rule B와 같은 이중 트리거를 Esc·Enter·Space 각각에 적용.
- **연타**: 1초 안에 **5회 이상**
- **꾹 누름**: **2초 이상** 유지
- **의미**: 문제를 푸는 게 아니라 문제에 반응하는 중.

### (참고) Rule D — Noise Burst
마이크 dB 감지 룰. **현재 웹 버전은 스코프 밖** — 자막 풀도 비어있어 발화되지 않음.

---

## 2. 우선순위 / 리듬 규칙

여러 룰이 동시에 감지되거나 이미 자막이 떠 있는 상태에서 새 트리거가 오면 아래 규칙으로 정리된다.

- **우선순위** (숫자 작을수록 높음): `silence(0) > panic(1) > backspace(2) > noise(3) > keyrepeat(4)`
- **페이드아웃 중 무시**: 이전 자막이 사라지는 1.5초 동안은 새 트리거를 전부 무시 (수동 포함).
- **페이드인 중 무시**: 이전 자막이 막 뜨는 0.2초 동안도 무시 (깜빡임 방지).
- **Hold 중 interrupt 조건**: 현재 표시 중인 자막보다 **우선순위가 더 높을 때만** 즉시 교체. 같거나 낮으면 무시.
- **같은 룰 연속 3번째 차단**: 같은 룰이 직전 2회 연속 발화됐으면 3번째는 폐기 → 리듬 보호.
- **빈 풀 스킵**: 자막 풀이 비어있는 룰(현재 `noise`)은 조용히 무시.

---

## 3. 자막 생명주기

한 번 발화된 자막은 아래 순서로 뜨고 사라진다.

| 시각 | 단계 | 동작 |
|---|---|---|
| `t+0.0s` | trigger | 스케줄러가 픽한 한/영 페어를 DOM에 등록 |
| `t+0.0s ~ 0.2s` | easing-in | opacity 0→1 (200ms ease-in) |
| `t+0.2s ~ 4.2s` | holding | 완전 표시 유지 (4초). **이 구간에만** 더 높은 우선순위 interrupt 가능 |
| `t+4.2s ~ 5.7s` | fading-out | opacity 1→0 + `blur(0.5px)` + `drop-shadow` 잔상 (1.5초 ease-out). 새 트리거 차단 |
| `t+5.7s` | idle | 완전 제거. 다음 자막 받을 준비 |

총 노출 ≈ **5.5초**.

레이아웃: 에디터 영역 하단 중앙, 한국어(22px) 위 / 영어(26px, italic) 아래, 반투명 검정 배경바.

---

## 4. 수동 트리거 (Ctrl+Alt 단축키)

조력자가 데모 클라이맥스 타이밍을 직접 잡거나, 자동 감지가 빗나갔을 때 보정용으로 사용.

> **macOS 표기**: Ctrl = `⌃` (Control), Alt = `⌥` (Option).
> 즉 실제로 눌러야 하는 건 **`Control + Option + 숫자`** 입니다.

| 단축키 | 동작 |
|---|---|
| `⌃ + ⌥ + 1` (Ctrl+Alt+1) | **Rule A (panic)** 카테고리 자막 강제 발화 |
| `⌃ + ⌥ + 2` (Ctrl+Alt+2) | **Rule B (backspace)** 카테고리 자막 강제 발화 |
| `⌃ + ⌥ + 3` (Ctrl+Alt+3) | **Rule C (silence)** 카테고리 자막 강제 발화 |
| `⌃ + ⌥ + 4` (Ctrl+Alt+4) | Rule D (noise) — 풀 비어있어 조용히 스킵 |
| `⌃ + ⌥ + 5` (Ctrl+Alt+5) | **Rule E (keyrepeat)** 카테고리 자막 강제 발화 |
| `⌃ + ⌥ + 0` (Ctrl+Alt+0) | 현재 표시 중인 자막 **즉시 제거** (100ms 짧은 페이드) |

**왜 Cmd+Shift가 아니라 Ctrl+Alt인가**:
- `⌘+⇧+3/4/5`는 **macOS 스크린샷 시스템 단축키**라 WindowServer가 먼저 가로채서 브라우저까지 오지 않음 (`preventDefault`로도 못 막음).
- `⌘+⇧+1/2` 는 Safari 즐겨찾기, Chrome에선 안전하지만 브라우저별로 다름.
- `⌃+⌥+숫자`(Control+Option+digit)는 macOS·Windows·Chrome·Monaco 어디에도 기본 바인딩이 없음.
- 키보드 레이아웃 독립적으로 동작하도록 `KeyboardEvent.code`의 `Digit0..Digit5`를 사용 (Option+숫자가 특수문자로 변하는 문제 회피).

운영 주의:
- **수동 트리거는 모든 규칙을 무시한다**. 페이드아웃 중이든, 우선순위가 낮든, 같은 룰 연속 3번째든, 페이드인 중이든 **무조건 현재 자막을 interrupt하고 즉시 새 자막을 띄운다** (자막 풀이 비어있는 경우만 예외). 데모 타이밍을 조력자가 100% 통제할 수 있다.
- `Ctrl+Alt+0`도 phase 무관 언제든 즉시 제거.
- 실제 조합을 바꾸고 싶으면 `lib/trigger-config.ts`의 `MANUAL_MODIFIER` 상수만 수정하면 됨.

---

## 5. 터미널에서 로그 보는 법

`next.config.ts`에 `logging.browserToTerminal: true` 를 켜둬서 브라우저 console 출력이 **`npm run dev` 터미널에 그대로** 찍힌다 (Next.js 16.2+).

로그 예시:

```
[browser] [TypingOverIt] [A/패닉] 손이 머리보다 빨라졌습니다 — 최근 1초 안에 22타 (임계 22)
[browser] [TypingOverIt] [발화] rule=panic idx=1  한글="지금은 생산성이 아니라 속도만 존재합니다." ...

[browser] [TypingOverIt] [B/백스페이스-연타] 수정 지옥 — 최근 1초 안에 Backspace 5회 (임계 5)
[browser] [TypingOverIt] [B/꾹-누름] 체념의 꾹 누름 — Backspace 키를 2000ms 이상 누르고 있음

[browser] [TypingOverIt] [C/침묵] 갑자기 멈췄습니다 — 마지막 입력 이후 30012ms 경과 (임계 30000ms)

[browser] [TypingOverIt] [E/키-연타] 문제에 반응만 하는 중 — Escape 1초에 5회 (임계 5)
[browser] [TypingOverIt] [E/꾹-누름] 멍한 길게 누름 — Space 키를 2000ms 이상 누르고 있음

[browser] [TypingOverIt] [수동] Ctrl+Alt+1 → panic 룰 강제 발화 요청
[browser] [TypingOverIt] [수동] Ctrl+Alt+0 → 자막 즉시 제거 요청
[browser] [TypingOverIt] [수동 제거] 진행 중이던 phase=holding에서 짧은 페이드로 종료

[browser] [TypingOverIt] [교체] 기존=backspace → 새=silence (우선순위 더 높아서 즉시 interrupt)

[browser] [TypingOverIt] [거절] rule=panic 이유=이전 자막이 페이드아웃 중 (fade-out은 interrupt 불가)
[browser] [TypingOverIt] [거절] rule=panic 이유=같은 룰이 연속 3번째 (리듬 보호, 스펙 §5.3)
[browser] [TypingOverIt] [거절] rule=keyrepeat 이유=현재 표시 중인 silence보다 우선순위 같거나 낮음 ...
[browser] [TypingOverIt] [거절] rule=noise 이유=자막 풀이 비어있음 (Rule D는 현재 스코프 밖)
```

> `next.config.ts`를 방금 바꿨다면 dev 서버를 한 번 껐다 켜야 반영된다.

---

## 6. 임계치 한 번에 튜닝하기

모든 숫자는 `lib/trigger-config.ts` 한 파일에 모여있다.

```ts
export const TRIGGER = {
  panic:     { windowMs: 1000, threshold: 22 },
  backspace: { windowMs: 1000, burstThreshold: 5, holdMs: 2000 },
  silence:   { silenceMs: 30000, priorActivityWindowMs: 5000, historyWindowMs: 35000 },
  keyRepeat: { keys: ["Escape", "Enter", " "], windowMs: 1000, burstThreshold: 5, holdMs: 2000 },
} as const;

export const CAPTION_TIMING = {
  fadeInMs: 200,
  holdMs: 4000,
  fadeOutMs: 1500,
  clearFadeMs: 100,
} as const;

export const PRIORITY = ["silence", "panic", "backspace", "noise", "keyrepeat"] as const;
```

자막 문장은 `lib/caption-bank.ts`에 카테고리별로 한/영 페어로 있다.

---

## 7. 한 번 뜬 자막이 "다시" 뜨려면

한 번 발화되면 내부 카운터가 리셋되기 때문에, 그냥 손을 떼지 않고 계속 치거나 누르고 있어도 재발화되지 않는다. 각 룰은 아래 조건이 전부 다시 맞아야 재발화된다.

### 7.1 디텍터 레벨 (카운터 재충전)

| 룰 | 1차 발화 직후 상태 | 재발화 조건 |
|---|---|---|
| **A 패닉** | `keystrokes1s` 배열이 **비워짐** | 다시 1초 안에 22자 쌓여야 함 |
| **B 연타** | `backspaces1s` 배열이 **비워짐** | 다시 1초 안에 Backspace 5회 쌓여야 함 |
| **B 꾹 누름** | hold 타이머 삭제. 키를 계속 누르고 있어도 **재발화 없음** | Backspace `keyup` 후 새로 `keydown`부터 다시 2초 |
| **C 침묵** | silence 타이머 사라짐 | 의미 있는 `keydown` 1회 이상 → 그로부터 30초 침묵 + "직전 5초 안에 다른 입력" 가드 재충족 |
| **E 연타** | 해당 키의 1초 카운트 배열이 **비워짐** | 다시 1초 안에 같은 키 5회 |
| **E 꾹 누름** | hold 타이머 삭제. 계속 눌러도 **재발화 없음** | 해당 키 `keyup` 후 새 `keydown`부터 2초 |

> **꾹 누름 룰의 중요한 특성**: 한 번 2초 홀드로 발화되면, 키에서 손을 떼기 전까지는 절대 다시 안 터진다. "꾹 누르면 연속으로 터지는 일" 없음.

### 7.2 스케줄러 레벨 (phase 게이트)

디텍터에서 `onTrigger`가 호출돼도 스케줄러의 phase에 따라 실제 자막이 뜰지 아닐지 결정된다.

```
A 자막 발화 ──┬─(0~0.2s)── easing-in   : 이 구간 모든 새 트리거 무시
             │
             ├─(0.2~4.2s)─ holding     : 더 높은 우선순위만 interrupt (같거나 낮으면 무시)
             │
             ├─(4.2~5.7s)─ fading-out  : 이 구간 모든 새 트리거 무시 (수동 포함)
             │
             └─(5.7s~)──── idle        : 어떤 트리거도 자유롭게 받음

총 5.5초 게이트가 끝나야 "임의의 다른 룰이 편하게" 다시 뜰 수 있다.
```

### 7.3 같은 룰을 연속으로 또 띄우려면

"연속 2회 제한"이 스케줄러에 있다. 같은 룰이 직전 2번 연속 발화됐으면 **3번째는 폐기**. 같은 룰을 세 번째로 띄우려면 사이에 **다른 룰이 한 번이라도 발화**되거나, 폐기된 뒤 다시 한 번 새 트리거가 들어와야 한다 (`lastRule`과 `secondLastRule`이 한 칸씩 밀려나므로 그다음 같은 룰 시도는 허용됨).

### 7.4 정리: "이론적으로 가장 빠른 재발화 간격"

- **다른 룰**: A가 뜨고 hold 중(0.2~4.2s)에 더 높은 우선순위(silence)로 interrupt → 거의 바로. 같은/낮은 우선순위로는 최소 5.5초 후.
- **같은 룰**: 5.5초 후 + 디텍터 카운터 재충전 + 연속 2회 제한 통과. 실전에서 같은 룰만 반복 발화하려 하면 세 번째부터 막힌다.
- **수동 트리거**: phase 규칙 그대로 적용. `Ctrl+Alt+0`로 강제 종료하면 100ms 뒤 idle → 바로 새 발화 가능 (단 연속 2회 제한은 여전히 적용).

## 8. 검증 순서 (Smoke Test)

`npm run dev` 후 http://localhost:3000 (사용 중이면 3001 등)에 들어가 Monaco에 포커스를 준 상태에서:

1. `Ctrl+Alt+1` → panic 자막 표시 (force 모드라 바로 뜸)
2. `Ctrl+Alt+1` × 3회 연타 → **매번 교체**되며 새 panic 문장이 뜸 (`[강제 교체]` 로그, 자동이었다면 거절됨)
3. `Ctrl+Alt+2` → 이어서 `Ctrl+Alt+5` → 매번 강제 교체 (우선순위 역순이어도 무시)
4. `Ctrl+Alt+0` → 표시 중 자막 즉시 제거
5. 에디터 한 번 치고 30초 손 떼기 → `[C/침묵]` 자동 발화
6. Backspace 5회/초 → `[B/백스페이스-연타]` 자동 발화
7. Backspace 2초 꾹 → `[B/꾹-누름] 체념의 꾹 누름`
8. `asdfasdfasdfasdfasdfasdf` (1초에 22자+) → `[A/패닉]`
9. Esc 5회/초 → `[E/키-연타]` / Space 2초 꾹 → `[E/꾹-누름]`
10. **자동 발화 우선순위 테스트** (자동은 여전히 규칙 적용됨): Backspace 5회/초로 `[B]` 발화 → hold 중 30초 침묵 대기 → `[교체] backspace → silence` (C가 우선순위 더 높아서 interrupt)
