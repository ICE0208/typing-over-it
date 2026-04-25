// Monaco의 onDidChangeModelContent 이벤트를 5초 sliding window로 모아서
// 사람이 읽을 수 있는 변경 흔적 string으로 압축. trigger 시점에 LLM 컨텍스트로 사용.
//
// 형식 예시 (5초 안에 사용자가 친 변화):
//   +const user = await getUser();
//   +console.log(user)
//   ~console.log(us  (← 일부 지움)
//   +console.log(user)
//
// 단순화: rangeLength > 0 이면 삭제 흔적("~"), text가 있으면 추가("+")로 표시.
// 라인 단위 5개 cap, 라인당 80자 cap, 80자 초과 시 "…" 처리.

const WINDOW_MS = 5000;
const MAX_LINES = 5;
const MAX_LINE_LEN = 80;

type Change = {
  ts: number;
  marker: "+" | "~";
  text: string;
};

let buffer: Change[] = [];
let editorDisposable: { dispose(): void } | null = null;

type MonacoChangeEvent = {
  changes: Array<{
    range: { startLineNumber: number; endLineNumber: number };
    rangeLength: number;
    text: string;
  }>;
};

// editor 레벨에 붙인다. path/모델이 바뀌어도 같은 editor 인스턴스가 새 모델의
// 이벤트를 자동으로 forward한다.
type MonacoEditorLike = {
  onDidChangeModelContent: (cb: (e: MonacoChangeEvent) => void) => { dispose(): void };
};

function trimLine(s: string): string {
  const oneLine = s.replace(/\r?\n/g, "↵");
  if (oneLine.length <= MAX_LINE_LEN) return oneLine;
  return oneLine.slice(0, MAX_LINE_LEN - 1) + "…";
}

function pruneOld(now: number) {
  const cutoff = now - WINDOW_MS;
  while (buffer.length > 0 && buffer[0].ts < cutoff) buffer.shift();
}

export function attachToEditor(editor: MonacoEditorLike): void {
  detachFromEditor();
  editorDisposable = editor.onDidChangeModelContent((e) => {
    const now = Date.now();
    pruneOld(now);
    for (const ch of e.changes) {
      // 추가도 삭제도 아닌 변화 (length 0 + text "")는 무시
      if (ch.rangeLength === 0 && ch.text.length === 0) continue;
      const marker: "+" | "~" = ch.rangeLength > 0 ? "~" : "+";
      const text = trimLine(ch.text || "");
      buffer.push({ ts: now, marker, text });
      if (buffer.length > MAX_LINES * 4) {
        // 너무 많이 쌓이면 오래된 것부터 잘라냄 (최대 20개 유지)
        buffer = buffer.slice(-MAX_LINES * 4);
      }
    }
  });
}

export function detachFromEditor(): void {
  editorDisposable?.dispose();
  editorDisposable = null;
  buffer = [];
}

export function getRecentContent(): string {
  pruneOld(Date.now());
  if (buffer.length === 0) return "";
  // 가장 최근 MAX_LINES 만 추출
  const tail = buffer.slice(-MAX_LINES);
  return tail.map((c) => `${c.marker}${c.text}`).join("\n");
}
