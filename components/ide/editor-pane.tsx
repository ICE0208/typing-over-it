"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { loader, type OnMount } from "@monaco-editor/react";

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
}: {
  path: string;
  value: string;
  language: string;
  onChange: (v: string) => void;
  onSave?: () => void;
}) {
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    loader.init();
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    configureMonaco(monaco);
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSaveRef.current?.()
    );
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
