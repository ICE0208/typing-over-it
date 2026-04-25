"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TitleBar } from "./title-bar";
import { ActivityBar } from "./activity-bar";
import { FileTree } from "./file-tree";
import { EditorTabs } from "./editor-tabs";
import { EditorPane } from "./editor-pane";
import { StatusBar } from "./status-bar";
import { SubtitleOverlay } from "./subtitle-overlay";
import { TypingEngineHost } from "./typing-engine-host";
import {
  applyAdditions,
  applyOverrides,
  findNode,
  getSiblings,
  initialTree,
  languageFromName,
  loadAdditions,
  loadOverrides,
  saveAddition,
  saveOverride,
  type AddedNode,
  type FsNode,
} from "@/lib/fake-fs";
import { editorContextRef } from "@/lib/editor-context-ref";

type OpenFile = {
  id: string;
  name: string;
  language: string;
  value: string;
  original: string;
};

export function IdeShell() {
  const [tree, setTree] = useState<FsNode[]>(initialTree);
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // treeFocus: 트리에서 사용자가 명시적으로 클릭한 노드(파일이든 폴더든) id.
  // - 파일 클릭 → 그 파일이 포커싱 (활성 탭으로도 열림)
  // - 폴더 클릭 → 그 폴더만 포커싱 (탭 안 열림)
  // - 트리 빈 영역 클릭 → null (포커싱 해제)
  // - 자동 오픈된 페이지(mount 시)는 treeFocus를 건드리지 않음 → 초기에는 null
  const [treeFocus, setTreeFocus] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  // file tree panel 너비 (드래그 가능). VS Code 처럼 col-resize 핸들로 조정.
  const [treeWidth, setTreeWidth] = useState(280);
  const [confirmClose, setConfirmClose] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Mount: addition 적용 + override 적용 + 기본 파일 자동 오픈.
  // 한 effect 안에서 tree 계산해야 race 없이 defaultId lookup 가능.
  useEffect(() => {
    const additions = loadAdditions();
    const overrides = loadOverrides();
    const withAdds = applyAdditions(initialTree, additions);
    const nextTree = applyOverrides(withAdds, overrides);
    if (nextTree !== initialTree) setTree(nextTree);

    // 자동 오픈 순서: README.md(active) + page.tsx
    // README가 트리거 튜토리얼 역할, page.tsx는 옆 탭에서 바로 진입 가능.
    const defaultIds = ["README.md", "src/app/page.tsx"];
    const opened: Record<string, OpenFile> = {};
    const order: string[] = [];
    for (const id of defaultIds) {
      const node = findNode(nextTree, id);
      if (!node || node.children) continue;
      const content = node.content ?? "";
      opened[id] = {
        id,
        name: node.name,
        language: node.language ?? languageFromName(node.name),
        value: content,
        original: content,
      };
      order.push(id);
    }
    if (order.length === 0) return;
    setOpenFiles(opened);
    setTabOrder(order);
    setActiveId(order[0]);
  }, []);

  const activeFile = activeId ? openFiles[activeId] : null;

  const tabs = useMemo(
    () =>
      tabOrder
        .map((id) => openFiles[id])
        .filter(Boolean)
        .map((f) => ({
          id: f.id,
          name: f.name,
          dirty: f.value !== f.original,
        })),
    [tabOrder, openFiles]
  );

  // 새 파일/폴더를 생성할 부모 폴더 id.
  // 단일 treeFocus에서 도출:
  //   - treeFocus === null  → null (루트)
  //   - treeFocus가 폴더    → 그 폴더 자체
  //   - treeFocus가 파일    → 그 파일의 부모 폴더 (id에서 마지막 / 자르기)
  const parentIdForCreate = useMemo<string | null>(() => {
    if (!treeFocus) return null;
    const node = findNode(tree, treeFocus);
    if (!node) return null;
    if (node.children) return treeFocus;
    const idx = treeFocus.lastIndexOf("/");
    return idx === -1 ? null : treeFocus.slice(0, idx);
  }, [treeFocus, tree]);

  const handleCreate = useCallback(
    (kind: "file" | "folder", name: string): "ok" | "duplicate" => {
      const parentId = parentIdForCreate;
      const id = parentId ? `${parentId}/${name}` : name;
      if (findNode(tree, id)) {
        // 같은 부모 안에 같은 이름이 이미 있음 → file-tree에서 input 유지 + 에러 표시
        return "duplicate";
      }
      const node: AddedNode = {
        id,
        parentId,
        name,
        isFolder: kind === "folder",
        ...(kind === "file"
          ? { language: languageFromName(name) }
          : {}),
      };
      saveAddition(node);
      // tree 재계산
      const additions = loadAdditions();
      const overrides = loadOverrides();
      const next = applyOverrides(
        applyAdditions(initialTree, additions),
        overrides
      );
      setTree(next);
      // 파일이면 바로 오픈하고 그 파일을 트리 포커스로.
      // 폴더면 그 폴더를 트리 포커스로 만들어 "그 안에 이어서 생성" 흐름 보장.
      if (kind === "file") {
        setOpenFiles((prev) => ({
          ...prev,
          [id]: {
            id,
            name,
            language: languageFromName(name),
            value: "",
            original: "",
          },
        }));
        setTabOrder((prev) =>
          prev.includes(id) ? prev : [...prev, id]
        );
        setActiveId(id);
        setTreeFocus(id);
      } else {
        setTreeFocus(id);
      }
      return "ok";
    },
    [parentIdForCreate, tree]
  );

  const openFile = useCallback(
    (id: string) => {
      setOpenFiles((prev) => {
        if (prev[id]) return prev;
        const node = findNode(tree, id);
        if (!node || node.children) return prev;
        const content = node.content ?? "";
        return {
          ...prev,
          [id]: {
            id,
            name: node.name,
            language: node.language ?? languageFromName(node.name),
            value: content,
            original: content,
          },
        };
      });
      setTabOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setActiveId(id);
      // 트리에서 파일 클릭 → 그 파일 자체가 트리 포커스 (visual highlight + 부모로 새 파일 위치 도출)
      setTreeFocus(id);
    },
    [tree]
  );

  // file tree panel 드래그 리사이즈
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = treeWidth;
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const next = Math.max(160, Math.min(600, startW + dx));
        setTreeWidth(next);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [treeWidth]
  );

  const handleFolderSelect = useCallback((id: string) => {
    setTreeFocus(id);
  }, []);

  const handleTreeDeselect = useCallback(() => {
    setTreeFocus(null);
  }, []);

  const doClose = useCallback((id: string) => {
    setTabOrder((prev) => {
      const next = prev.filter((x) => x !== id);
      setActiveId((curr) => {
        if (curr !== id) return curr;
        const idx = prev.indexOf(id);
        return next[idx] ?? next[idx - 1] ?? null;
      });
      return next;
    });
    setOpenFiles((prev) => {
      const { [id]: _gone, ...rest } = prev;
      void _gone;
      return rest;
    });
  }, []);

  const requestClose = useCallback((id: string) => {
    const file = stateRef.current.openFiles[id];
    if (file && file.value !== file.original) {
      setConfirmClose({ id, name: file.name });
      return;
    }
    doClose(id);
  }, [doClose]);

  const updateContent = useCallback(
    (v: string) => {
      if (!activeId) return;
      setOpenFiles((prev) => {
        const cur = prev[activeId];
        if (!cur) return prev;
        return { ...prev, [activeId]: { ...cur, value: v } };
      });
      // 가짜 끝줄 cursor 계산은 제거 — Monaco의 onCursorChange가 진짜 위치를 publish.
    },
    [activeId]
  );

  // EditorPane이 publish하는 진짜 cursor 위치를 받아 ide-shell 상태에 반영.
  const onEditorCursorChange = useCallback(
    (line: number, column: number) => {
      setCursor({ line, column });
    },
    []
  );

  // 활성 파일 / cursor / tree 변경 시 LLM 컨텍스트 ref 갱신.
  // editorContextRef는 trigger 시점에 koan-prompt가 즉석 추출.
  useEffect(() => {
    if (!activeFile) {
      editorContextRef.set(null);
      return;
    }
    const lines = activeFile.value.split("\n");
    // 실효 cursor 라인 — 현재 커서가 빈 줄이면 위로 거슬러 올라가 가장 가까운
    // 비어있지 않은 줄을 찾는다. 파일 맨 위까지 올라가도 모두 비어 있으면
    // 거꾸로 내려가며 가장 가까운 비어있지 않은 줄을 선택. 그래도 없으면
    // (= 파일 전체가 빈 줄) 원본 cursor 인덱스를 그대로 사용.
    const rawIdx = Math.max(0, Math.min(lines.length - 1, cursor.line - 1));
    let effIdx = rawIdx;
    if (lines[effIdx].trim().length === 0) {
      let up = effIdx;
      while (up > 0 && lines[up].trim().length === 0) up--;
      if (lines[up].trim().length > 0) {
        effIdx = up;
      } else {
        let down = rawIdx;
        while (down < lines.length - 1 && lines[down].trim().length === 0) down++;
        if (lines[down].trim().length > 0) effIdx = down;
      }
    }
    // cursor 주변 ±5줄, 빈 줄 제외하면서 effIdx 줄은 무조건 포함.
    // 입력 토큰 줄여 LLM latency 단축. 너무 줄이면 컨텍스트 약해지므로 5가 균형.
    const start = Math.max(0, effIdx - 5);
    const end = Math.min(lines.length, effIdx + 6);
    const slice = lines.slice(start, end);
    const nonBlank = slice.filter(
      (l, i) => l.trim().length > 0 || i === effIdx - start
    );
    const excerpt = nonBlank.join("\n");
    editorContextRef.set({
      filePath: activeFile.id,
      fileName: activeFile.name,
      language: activeFile.language,
      excerpt,
      recentContent: "", // koan-prompt가 트리거 시점에 getRecentContent()로 직접 채움
      cursorLine: effIdx + 1,
      lineCount: lines.length,
      siblings: getSiblings(tree, activeFile.id),
    });
  }, [activeFile, cursor, tree]);

  // Stable ref so the global keydown handler always sees fresh state
  const stateRef = useRef({ activeId, openFiles });
  useEffect(() => {
    stateRef.current = { activeId, openFiles };
  }, [activeId, openFiles]);

  const save = useCallback((id: string) => {
    const file = stateRef.current.openFiles[id];
    if (!file) return;
    if (file.value === file.original) return;
    saveOverride(id, file.value);
    setOpenFiles((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, original: cur.value } };
    });
    setTree((t) => applyOverrides(t, { [id]: file.value }));
  }, []);

  const saveActive = useCallback(() => {
    const id = stateRef.current.activeId;
    if (id) save(id);
  }, [save]);

  // Global Cmd/Ctrl+S — blocks browser "Save Page As..." dialog in every focus state.
  // Capture phase + stopPropagation so it always wins, even before Monaco's own bindings.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      // Block Cmd/Ctrl+S and Cmd/Ctrl+Shift+S (Save As)
      if (k === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (!e.shiftKey) saveActive();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [saveActive]);

  // Warn before navigating away if anything is dirty
  useEffect(() => {
    const dirty = Object.values(openFiles).some((f) => f.value !== f.original);
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [openFiles]);

  const isActiveDirty = activeFile
    ? activeFile.value !== activeFile.original
    : false;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#cccccc]">
      <TypingEngineHost />
      <TitleBar />
      <div className="flex-1 min-h-0 flex">
        <ActivityBar />
        <div className="flex-1 min-w-0">
          {/*
            react-resizable-panels는 sub-pixel rounding 피드백 루프로 10px 진동
            깜빡임을 일으켜 제거. 대신 직접 드래그 핸들로 구현.
            mousemove 동안 RAF 없이 setState만 호출 → 진동 없음.
          */}
          <div className="h-full flex">
            <div style={{ width: treeWidth }} className="shrink-0 h-full">
              <FileTree
                data={tree}
                onSelect={openFile}
                onFolderSelect={handleFolderSelect}
                onDeselect={handleTreeDeselect}
                selectedId={treeFocus ?? activeId}
                onCreate={handleCreate}
                pendingCreateTarget={parentIdForCreate}
              />
            </div>
            <div
              onMouseDown={onResizeMouseDown}
              title="드래그해서 너비 조정"
              className="w-1 shrink-0 cursor-col-resize bg-[#1e1e1e] hover:bg-[#007acc] transition-colors"
            />
            <div className="flex-1 min-w-0 h-full flex flex-col">
              <EditorTabs
                tabs={tabs}
                activeId={activeId}
                onSelect={setActiveId}
                onClose={requestClose}
              />
              <div className="flex-1 min-h-0 bg-[#1e1e1e] relative">
                {activeFile ? (
                  <EditorPane
                    path={activeFile.id}
                    value={activeFile.value}
                    language={activeFile.language}
                    onChange={updateContent}
                    onSave={saveActive}
                    onCursorChange={onEditorCursorChange}
                  />
                ) : (
                  <Welcome />
                )}
                <SubtitleOverlay />
              </div>
              {confirmClose && (
                <UnsavedDialog
                  name={confirmClose.name}
                  onSave={() => {
                    save(confirmClose.id);
                    doClose(confirmClose.id);
                    setConfirmClose(null);
                  }}
                  onDiscard={() => {
                    doClose(confirmClose.id);
                    setConfirmClose(null);
                  }}
                  onCancel={() => setConfirmClose(null)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <StatusBar
        language={activeFile?.language ?? "plaintext"}
        line={cursor.line}
        column={cursor.column}
        dirty={isActiveDirty}
      />
    </div>
  );
}

function UnsavedDialog({
  name,
  onSave,
  onDiscard,
  onCancel,
}: {
  name: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    saveBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        className="w-[420px] rounded-md bg-[#252526] border border-white/10 shadow-2xl text-[13px] text-[#cccccc]"
      >
        <div className="px-5 pt-5 pb-3 space-y-2">
          <div id="unsaved-title" className="font-semibold text-white">
            {name}의 변경 사항을 저장하시겠습니까?
          </div>
          <div className="text-[12px] text-[#969696]">
            저장하지 않으면 변경 사항이 손실됩니다.
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 bg-[#2d2d2d] rounded-b-md">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-sm bg-transparent hover:bg-white/10 border border-white/10"
          >
            취소
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-sm bg-[#3c3c3c] hover:bg-[#4a4a4a]"
          >
            저장 안 함
          </button>
          <button
            ref={saveBtnRef}
            onClick={onSave}
            className="px-3 py-1.5 rounded-sm bg-[#0e639c] hover:bg-[#1177bb] text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div className="h-full grid place-items-center text-center px-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-light text-white">Visual Studio Code</h1>
        <p className="text-[#858585]">
          좌측에서 파일을 선택해 시작하세요.
        </p>
        <div className="text-[12px] text-[#858585] space-y-1">
          <div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#3c3c3c] text-white">⌘P</kbd>{" "}
            파일 열기
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 rounded bg-[#3c3c3c] text-white">⌘S</kbd>{" "}
            저장
          </div>
        </div>
      </div>
    </div>
  );
}
