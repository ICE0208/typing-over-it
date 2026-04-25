// Monaco / IDE shell이 publish하는 활성 파일 + cursor + 주변 코드 + 최근 5초
// 변경 흔적을 단일 ref에 보관. trigger 시점에 koan-client가 즉석 추출.
//
// pub/sub 추상화 안 씀 — subscriber가 koan-client 1개라 ref 1개로 충분.
// SSR 안전: 모듈 top-level에서 window 접근 X.

export type EditorContext = {
  filePath: string;          // 예: "src/app/page.tsx"
  fileName: string;          // 예: "page.tsx"
  language: string;          // 예: "typescriptreact"
  excerpt: string;           // cursor ±N줄 (빈 줄 제외, 100라인 cap)
  recentContent: string;     // 최근 5초 변경 흔적 (recent-content-tracker가 채움)
  cursorLine: number;        // 1-based
  lineCount: number;
  siblings: string[];        // 같은 폴더의 다른 파일명 (5개 cap)
};

let snapshot: EditorContext | null = null;

export const editorContextRef = {
  get(): EditorContext | null {
    return snapshot;
  },
  set(next: EditorContext | null): void {
    snapshot = next;
  },
};
