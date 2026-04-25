"use client";

import { Tree, NodeRendererProps } from "react-arborist";
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import type { FsNode } from "@/lib/fake-fs";
import { useEffect, useRef, useState } from "react";
import { FileIcon } from "./file-icon";

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
        <FileIcon
          name={node.data.name}
          isFolder={isFolder}
          isOpen={node.isOpen}
          size={16}
        />
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
  onDeselect,
  selectedId,
  onCreate,
  pendingCreateTarget,
}: {
  data: FsNode[];
  onSelect: (id: string) => void;
  onFolderSelect: (id: string) => void;
  onDeselect: () => void;
  selectedId: string | null;
  onCreate: (kind: "file" | "folder", name: string) => "ok" | "duplicate";
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
      const w = el.clientWidth;
      const h = el.clientHeight;
      // 동일 값이면 setState 안 함 — react-arborist 내부 layout이 부모 크기를
      // 바꿀 가능성에 대비한 무한 루프 가드
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // react-arborist의 가상 스크롤 컨테이너는 overflow:auto + 10px scrollbar가
  // 만나 콘텐츠가 height에 borderline일 때 scrollbar 출현/사라짐이 무한 토글
  // (width 315↔305px 진동) → DOM mutation이 초당 500+회 발생하며 SVG 재렌더로
  // 깜빡임. scrollbar-gutter:stable로 자리를 미리 잡아 토글을 차단.
  // (CSS 파일에도 같은 rule이 있으나 dev HMR 누락 시 안전망용으로 JS에서도 주입)
  useEffect(() => {
    const id = "ide-arborist-scrollbar-gutter";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      div[style*="overflow: auto"][style*="will-change: transform"] {
        scrollbar-gutter: stable;
      }
    `;
    document.head.appendChild(style);
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
    const result = onCreate(pending.kind, name);
    if (result === "duplicate") {
      // 같은 위치에 같은 이름이 이미 있음 — input 유지하고 에러 표시
      setError("같은 이름이 이미 있습니다");
      return;
    }
    cancelCreate();
  };

  return (
    <div className="h-full flex flex-col bg-[#252526]">
      <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-[#cccccc]/70 flex items-center justify-between">
        <span>Explorer</span>
      </div>
      {/* 아이콘은 항상 노출. (이전에 group-hover + opacity 트랜지션을 썼는데
          CSS zoom 1.2와 트랜지션이 만나 Chrome에서 이중 페인트로 깜빡거림 발생 — 제거) */}
      <div className="px-4 pb-1 text-[11px] font-bold text-[#cccccc] flex items-center justify-between">
        <span>IDE-DEMO</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => beginCreate("file")}
            title={`새 파일${pendingCreateTarget ? ` (${pendingCreateTarget})` : " (루트)"}`}
            className="p-1 rounded-sm hover:bg-white/10 text-[#cccccc]/70 hover:text-[#cccccc]"
          >
            <FilePlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => beginCreate("folder")}
            title={`새 폴더${pendingCreateTarget ? ` (${pendingCreateTarget})` : " (루트)"}`}
            className="p-1 rounded-sm hover:bg-white/10 text-[#cccccc]/70 hover:text-[#cccccc]"
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
              // 에러 표시 중이면 blur로 닫지 않음 (사용자가 수정할 수 있게).
              // Enter 또는 Esc로만 명시적 종료.
              if (error) return;
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

      <div
        ref={wrapRef}
        className="flex-1 min-h-0"
        onClick={(e) => {
          // 트리 빈 영역(treeitem 바깥) 클릭 시 선택 해제 → 새 파일/폴더 위치 = 루트
          const onItem = (e.target as Element)?.closest?.('[role="treeitem"]');
          if (!onItem) onDeselect();
        }}
      >
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
