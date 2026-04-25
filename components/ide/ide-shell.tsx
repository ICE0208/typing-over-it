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

  const closeTab = useCallback((id: string) => {
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
                  onClose={closeTab}
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
