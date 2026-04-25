# Typing Over It

VS Code 모양의 웹 IDE. Monaco 에디터에서 입력 패턴이 무너지는 순간을 감지해, *Getting Over It* 톤의 한/영 자막을 화면 하단에 띄운다. 자막 문장은 LLM이 그 시점의 코드 컨텍스트를 받아 매번 새로 생성하고, 영문 라인은 Web Speech로 발화한다.

> "지워도 우리는 거기 있었다 / Erased, but we were there."

## 파이프라인

```
keystroke
   │
   ▼
TypingDetector             규칙별 카운터/타이머
   │  onTrigger(rule, meta)
   ▼
SubtitleScheduler          phase machine + 우선순위 게이트
   │  buildKoanContext(rule, recentCode, meta)
   ▼
/api/koan-single → Gemini  responseSchema + validateKoan
   │  { ko, en }
   ▼
SubtitleOverlay + TTS      ease-in 200ms / hold 4s / ease-out 1.5s
```

총 노출 5.5초. 우선순위가 더 높은 트리거는 hold 구간에 한해 즉시 교체. 페이드 구간에서는 새 트리거를 거절한다.

## 감지 규칙

| 룰 | 조건 |
|---|---|
| `silence` | 마지막 입력 후 30초 + 직전 5초 안에 입력 이력 |
| `panic` | 1초 이내 일반 키 22타 이상 |
| `backspace` | 1초 이내 Backspace 5회 또는 2초 이상 hold |
| `keyrepeat` | Esc/Enter/Space에 동일한 burst/hold 적용 |

우선순위 (높음 → 낮음): `welcome` › `silence` › `panic` › `backspace` › `noise` › `keyrepeat`. `noise`는 마이크 dB 룰로 자막 풀이 비어있어 발화되지 않는다.

- 일반 글자 키만 카운트. modifier 단일 키, 화살표, Tab, Home/End, 단축키 조합은 제외.
- OS 키 리피트는 hold 타이머로 분리. burst는 사람이 친 keydown만 셈.
- 발화 직후 카운터 리셋 + 같은 룰 연속 2회 제한.

임계값은 `lib/trigger-config.ts`의 `TRIGGER` 상수에 모여 있다.

## 스케줄러

`SubtitleScheduler`는 `idle → easing-in → holding → fading-out → idle` 4단계 phase machine 위에서 동작한다.

- `easing-in` / `fading-out` 구간: 모든 새 트리거 거절
- `holding` 구간: 우선순위가 더 높은 트리거만 interrupt
- `force=true` (수동 트리거): 모든 게이트 우회
- LLM 응답이 stale인 경우 (`fireSeq` mismatch): emit하지 않음 — 마지막 트리거가 이김

## LLM 호출

서버: `POST /api/koan-single` → `gemini-2.5-flash`. `responseSchema`로 `{ ko, en }` JSON을 강제하고, 응답은 `validateKoan`에서 길이/금칙어/번역체 게이트를 한 번 더 통과한다.

키 fallback은 조건부다.

| primary 결과 | backup 시도 |
|---|---|
| 인증 실패 / 레이트리밋 / 네트워크 transient | O |
| 스키마 파싱 실패 / 검증 실패 | X |

같은 모델·동일 프롬프트라 검증 실패는 backup에서도 reject 가능성이 높아 호출하지 않는다. 응답 코드 정책은 `app/api/koan-single/route.ts` 상단 주석 참고.

클라이언트(`lib/koan-client.ts`):

- 호출 타임아웃 3초, in-flight 1개만 유지 (새 트리거가 이전 호출 abort)
- `401` / `403` 수신 시 세션 동안 circuit open
- `429` / `5xx` / 타임아웃 후 30초 쿨다운, `503`은 5초 짧은 쿨다운
- 위 비활성 구간에는 `lib/caption-bank.ts`의 시드 풀에서 픽

## 프롬프트

`lib/koan-prompt.ts`에 시스템 프롬프트가 있다. 핵심 규약:

- 6개 register 중 정확히 하나에 commit: `STING / TENDER / DEADPAN / ABSURD / COSMIC / PRAISE-IRONY`
- `en`은 `ko`의 직역이 아니라 보완
- per-call 컨텍스트로 룰, 트리거 메타, 최근 입력된 코드 조각을 함께 전달

## 렌더 / TTS

자막 페이드는 opacity + `blur(0.5px)` + `drop-shadow` 조합으로 잔상 효과 처리.

Web Speech 쪽에서 회피한 known issue:

- Chrome `getVoices()` 콜드 빈 배열 → `voiceschanged` 이벤트 + 즉시 호출 dual-pattern
- 클라우드 보이스 14초 cutoff (Chromium #41294170) → localService 우선 + `pause/resume` 가드
- `cancel()` 직후 `speak()` race (Bugzilla 1522074) → `setTimeout(speak, 50)`

보이스 픽은 OS 무관 남성 화이트리스트 안에서만 한다 (`lib/caption-tts.ts`의 `MALE_VOICE_NAMES`).

## 수동 트리거

데모 타이밍 수동 제어용 단축키. `KeyboardEvent.code`의 `Digit0..Digit5`로 바인딩해 키보드 레이아웃과 무관하게 동작한다.

| 단축키 | 동작 |
|---|---|
| `⌃⌥1` | panic 강제 |
| `⌃⌥2` | backspace 강제 |
| `⌃⌥3` | silence 강제 |
| `⌃⌥4` | noise 강제 (자막 풀 비어있어 실제 발화는 없음) |
| `⌃⌥5` | keyrepeat 강제 |
| `⌃⌥0` | 표시 중인 자막 즉시 제거 |

수동 트리거는 모든 phase 게이트와 우선순위 규칙을 무시한다.

## 실행

요구사항: Node 20+, Chrome/Edge 권장. Web Speech API가 필요하므로 Firefox/Safari에서는 자막은 뜨지만 영문 TTS는 동작하지 않는다.

개발 서버:

```bash
npm install
npm run dev
```

http://localhost:3000

프로덕션 빌드:

```bash
npm run build
npm start
```

LLM 자막을 켜려면 `.env.local`에 키를 넣는다. 둘 다 선택값이며, 없으면 시드 풀로 동작.

```
GEMINI_API_KEY=...           # primary
GEMINI_API_KEY_BACKUP=...    # 인증/레이트리밋/transient 실패 시 fallback (선택)
```

첫 호출은 Gemini 콜드 스타트로 1~2초 지연.

## 디렉토리

```
app/
  api/koan-single/         LLM 호출 라우트
  page.tsx, layout.tsx     IDE shell entry
components/ide/            Monaco, 파일트리, 자막 오버레이, 타이핑 호스트
lib/
  typing-detector.ts       감지 룰 구현
  subtitle-scheduler.ts    phase machine + 발화 결정
  trigger-config.ts        임계값/타이밍/우선순위 단일 출처
  koan-prompt.ts           시스템 프롬프트 + 컨텍스트 빌더
  koan-validate.ts         응답 검증 게이트
  koan-client.ts           클라이언트 호출 + circuit breaker
  caption-bank.ts          시드 자막 풀 (LLM 폴백)
  caption-tts.ts           Web Speech 래퍼
  caption-store.ts         자막 상태 store
  fake-fs.ts               메모리 파일시스템
```

## 스택

Next.js 16 (App Router), React 19, Monaco, `react-resizable-panels`, `react-arborist`, `@google/genai` (Gemini 2.5), Web Speech API, Tailwind 4.

## 추가 문서

- [`TRIGGERS.md`](./TRIGGERS.md) — 트리거 규칙 상세, 임계치 튜닝, 디버그 로그 포맷, smoke test 절차

## 라이선스

비공개 데모 프로젝트 (`package.json: "private": true`). 외부 배포·재사용 권한 없음.
