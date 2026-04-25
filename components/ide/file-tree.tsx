"use client";

import { Tree, NodeRendererProps } from "react-arborist";
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  FileJson,
  File as FileIcon,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import type { FsNode } from "@/lib/fake-fs";
import { useEffect, useRef, useState } from "react";

function iconFor(name: string, isFolder: boolean, isOpen: boolean) {
  if (isFolder)
    return isOpen ? (
      <ChevronDown size={14} className="text-[#cccccc]" />
    ) : (
      <ChevronRight size={14} className="text-[#cccccc]" />
    );
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return <FileJson size={14} className="text-yellow-400" />;
  if (ext === "md") return <FileText size={14} className="text-sky-400" />;
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx")
    return <FileCode size={14} className="text-blue-400" />;
  return <FileIcon size={14} className="text-[#cccccc]" />;
}

function Node({ node, style, dragHandle }: NodeRendererProps<FsNode>) {
  const isFolder = !!node.data.children;
  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={() => {
        // 폴더: 토글 + 선택 (선택 상태를 IdeShell이 받아서 "여기에 새 파일/폴더" 대상으로 사용)
        // 파일: 기존대로 선택
        if (isFolder) {
          node.toggle();
          node.select();
        } else {
          node.select();
        }
      }}
      className={`flex items-center gap-1 h-[22px] pr-2 cursor-pointer text-[13px] ${
        node.isSelected ? "bg-[#094771] text-white" : "hover:bg-[#2a2d2e]"
      }`}
    >
      <div className="w-4 grid place-items-center">
        {isFolder ? (
          node.isOpen ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )
        ) : null}
      </div>
      <div className="grid place-items-center">
        {iconFor(node.data.name, isFolder, node.isOpen)}
      </div>
      <span className="truncate">{node.data.name}</span>
    </div>
  );
}

type PendingCreate = { kind: "file" | "folder" } | null;

export function FileTree({
  data,
  onSelect,
  onFolderSelect,
  selectedId,
  onCreate,
  pendingCreateTarget,
}: {
  data: FsNode[];
  onSelect: (id: string) => void;
  onFolderSelect: (id: string) => void;
  selectedId: string | null;
  onCreate: (kind: "file" | "folder", name: string) => void;
  pendingCreateTarget: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 240, h: 600 });

  const [pending, setPending] = useState<PendingCreate>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (pending) inputRef.current?.focus();
  }, [pending]);

  const beginCreate = (kind: "file" | "folder") => {
    setPending({ kind });
    setDraft("");
    setError(null);
  };
  const cancelCreate = () => {
    setPending(null);
    setDraft("");
    setError(null);
  };
  const submitCreate = () => {
    if (!pending) return;
    const name = draft.trim();
    if (!name) {
      cancelCreate();
      return;
    }
    if (name.includes("/")) {
      setError("이름에 / 를 포함할 수 없습니다");
      return;
    }
    onCreate(pending.kind, name);
    cancelCreate();
  };

  return (
    <div className="h-full flex flex-col bg-[#252526]">
      <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-[#cccccc]/70 flex items-center justify-between">
        <span>Explorer</span>
      </div>
      {/* group: 호버 시 아이콘 노출. 항상 보이게 하고 싶으면 group-hover:opacity 를 빼면 됨 */}
      <div className="px-4 pb-1 text-[11px] font-bold text-[#cccccc] flex items-center justify-between group">
        <span>IDE-DEMO</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => beginCreate("file")}
            title={`새 파일${pendingCreateTarget ? ` (${pendingCreateTarget})` : " (루트)"}`}
            className="p-1 rounded-sm hover:bg-white/10 text-[#cccccc]"
          >
            <FilePlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => beginCreate("folder")}
            title={`새 폴더${pendingCreateTarget ? ` (${pendingCreateTarget})` : " (루트)"}`}
            className="p-1 rounded-sm hover:bg-white/10 text-[#cccccc]"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {pending && (
        <div className="px-4 py-1 text-[12px] bg-[#1e1e1e] border-y border-[#094771]">
          <div className="text-[10px] text-[#858585] mb-0.5">
            {pending.kind === "file" ? "새 파일" : "새 폴더"}
            {pendingCreateTarget ? ` @ ${pendingCreateTarget}` : " @ 루트"}
          </div>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCreate();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelCreate();
              }
              e.stopPropagation();
            }}
            onBlur={() => {
              // blur 시 submit이 아닌 cancel. Enter로만 확정.
              cancelCreate();
            }}
            placeholder={
              pending.kind === "file" ? "파일명.tsx" : "폴더명"
            }
            className="w-full bg-[#3c3c3c] border border-[#094771] text-[#cccccc] px-1.5 py-0.5 outline-none text-[12px]"
          />
          {error && (
            <div className="text-[10px] text-red-400 mt-0.5">{error}</div>
          )}
        </div>
      )}

      <div ref={wrapRef} className="flex-1 min-h-0">
        <Tree
          data={data}
          openByDefault
          width={size.w}
          height={size.h}
          indent={14}
          rowHeight={22}
          paddingTop={4}
          paddingBottom={8}
          selection={selectedId ?? undefined}
          onSelect={(nodes) => {
            const n = nodes[0];
            if (!n) return;
            if (n.data.children) {
              onFolderSelect(n.id);
            } else {
              onSelect(n.id);
            }
          }}
        >
          {Node}
        </Tree>
      </div>
    </div>
  );
}
