"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { TitleBar } from "./title-bar";
import { ActivityBar } from "./activity-bar";
import { FileTree } from "./file-tree";
import { EditorTabs } from "./editor-tabs";
import { EditorPane } from "./editor-pane";
import { StatusBar } from "./status-bar";
import {
  applyOverrides,
  findNode,
  initialTree,
  languageFromName,
  loadOverrides,
  saveOverride,
  type FsNode,
} from "@/lib/fake-fs";

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
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Apply persisted overrides on mount (client-only — avoids hydration mismatch)
  useEffect(() => {
    const overrides = loadOverrides();
    if (Object.keys(overrides).length === 0) return;
    setTree((t) => applyOverrides(t, overrides));
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
    },
    [tree]
  );

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
      const lines = v.split("\n");
      setCursor({ line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 });
    },
    [activeId]
  );

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
    setSavedFlash(file.name);
    window.setTimeout(() => {
      setSavedFlash((s) => (s === file.name ? null : s));
    }, 1400);
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
      <TitleBar />
      <div className="flex-1 min-h-0 flex">
        <ActivityBar />
        <div className="flex-1 min-w-0">
          <Group orientation="horizontal" className="h-full">
            <Panel defaultSize="18%" minSize="12%" maxSize="40%">
              <FileTree
                data={tree}
                onSelect={openFile}
                selectedId={activeId}
              />
            </Panel>
            <Separator className="w-[1px]" />
            <Panel defaultSize="82%" minSize="40%">
              <div className="h-full flex flex-col">
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
                    />
                  ) : (
                    <Welcome />
                  )}
                  {savedFlash && (
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-[#252526] border border-white/10 text-[12px] text-[#cccccc] shadow-lg">
                      💾 {savedFlash} 저장됨
                    </div>
                  )}
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
            </Panel>
          </Group>
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
