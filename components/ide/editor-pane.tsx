"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { loader, type OnMount } from "@monaco-editor/react";
import { attachToEditor, detachFromEditor } from "@/lib/recent-content-tracker";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full grid place-items-center text-[#858585] text-[12px]">
      Loading editor...
    </div>
  ),
});

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
  },
});

// Configure TS/JS services once — must run after monaco loads, before any model is created.
let monacoConfigured = false;
function configureMonaco(monaco: typeof import("monaco-editor")) {
  if (monacoConfigured) return;
  monacoConfigured = true;
  // The `monaco.languages.typescript` namespace is marked deprecated in the type
  // declarations but is fully functional at runtime — cast to access it.
  const ts = (monaco.languages as unknown as { typescript: TsNamespace }).typescript;
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.Preserve,
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
    strict: true,
    lib: ["esnext", "dom", "dom.iterable"],
  };
  ts.typescriptDefaults.setCompilerOptions(compilerOptions);
  ts.javascriptDefaults.setCompilerOptions(compilerOptions);

  // Suppress noisy "Cannot find module/name" errors — no real node_modules in this fake IDE.
  // 2307/2792 cannot find module, 2304/2503 cannot find name/namespace,
  // 7016 no type declarations, 2580 'require', 2686 UMD global,
  // 7026 JSX.IntrinsicElements missing, 2786 module has no default export
  const diagnosticCodesToIgnore = [
    2307, 2792, 2304, 2503, 7016, 2580, 2686, 7026, 2786,
  ];
  ts.typescriptDefaults.setDiagnosticsOptions({ diagnosticCodesToIgnore });
  ts.javascriptDefaults.setDiagnosticsOptions({ diagnosticCodesToIgnore });
}

type TsNamespace = {
  ScriptTarget: { ES2022: number };
  ModuleKind: { ESNext: number };
  ModuleResolutionKind: { NodeJs: number };
  JsxEmit: { Preserve: number };
  typescriptDefaults: TsDefaults;
  javascriptDefaults: TsDefaults;
};
type TsDefaults = {
  setCompilerOptions: (o: Record<string, unknown>) => void;
  setDiagnosticsOptions: (o: { diagnosticCodesToIgnore: number[] }) => void;
};

export function EditorPane({
  path,
  value,
  language,
  onChange,
  onSave,
  onCursorChange,
}: {
  path: string;
  value: string;
  language: string;
  onChange: (v: string) => void;
  onSave?: () => void;
  onCursorChange?: (line: number, column: number) => void;
}) {
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const onCursorChangeRef = useRef(onCursorChange);
  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
  }, [onCursorChange]);

  useEffect(() => {
    loader.init();
  }, []);

  // EditorPane 언마운트 시 recent-content-tracker 정리.
  // Editor 인스턴스 자체는 monaco-editor/react가 관리.
  useEffect(() => {
    return () => {
      detachFromEditor();
    };
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    configureMonaco(monaco);
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSaveRef.current?.()
    );

    // recent-content-tracker는 editor 레벨에 붙여서 모델 swap에도 자동 forward.
    attachToEditor(editor);

    // cursor 변화는 250ms debounce — 매 키입력마다 setState 폭주 방지.
    let debounce: ReturnType<typeof setTimeout> | null = null;
    editor.onDidChangeCursorPosition((e) => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        onCursorChangeRef.current?.(
          e.position.lineNumber,
          e.position.column
        );
      }, 250);
    });
  };

  return (
    <Editor
      height="100%"
      path={path}
      defaultLanguage={language}
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        fontFamily: "var(--font-geist-mono), Menlo, Consolas, monospace",
        fontSize: 15,
        fontLigatures: true,
        minimap: { enabled: true },
        tabSize: 2,
        insertSpaces: true,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderWhitespace: "selection",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
      }}
    />
  );
}
