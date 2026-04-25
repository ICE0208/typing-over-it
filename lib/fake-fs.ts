export type FsNode = {
  id: string;
  name: string;
  children?: FsNode[];
  content?: string;
  language?: string;
};

export const initialTree: FsNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      {
        id: "src/app",
        name: "app",
        children: [
          {
            id: "src/app/page.tsx",
            name: "page.tsx",
            language: "typescript",
            content: `export default function Page() {
  return (
    <main className="grid place-items-center h-screen">
      <h1 className="text-4xl font-bold">Hello, world.</h1>
    </main>
  );
}
`,
          },
          {
            id: "src/app/layout.tsx",
            name: "layout.tsx",
            language: "typescript",
            content: `import "./globals.css";

export const metadata = {
  title: "definitely a real app",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
`,
          },
        ],
      },
      {
        id: "src/components",
        name: "components",
        children: [
          {
            id: "src/components/Button.tsx",
            name: "Button.tsx",
            language: "typescript",
            content: `type Props = {
  onClick?: () => void;
  children: React.ReactNode;
};

export function Button({ onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
    >
      {children}
    </button>
  );
}
`,
          },
        ],
      },
      {
        id: "src/utils.ts",
        name: "utils.ts",
        language: "typescript",
        content: `export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
`,
      },
    ],
  },
  {
    id: "public",
    name: "public",
    children: [
      {
        id: "public/robots.txt",
        name: "robots.txt",
        language: "plaintext",
        content: `User-agent: *
Disallow:
`,
      },
    ],
  },
  {
    id: "package.json",
    name: "package.json",
    language: "json",
    content: `{
  "name": "ide-demo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  }
}
`,
  },
  {
    id: "tsconfig.json",
    name: "tsconfig.json",
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "bundler"
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
`,
  },
  {
    id: "README.md",
    name: "README.md",
    language: "markdown",
    content: `# ide-demo

> 보고 있는 그대로입니다.

## 시작하기

\`\`\`bash
npm run dev
\`\`\`

이게 전부예요.
`,
  },
  {
    id: ".gitignore",
    name: ".gitignore",
    language: "plaintext",
    content: `node_modules
.next
.env*
`,
  },
];

const STORAGE_KEY = "ide-demo:overrides:v1";

export type Overrides = Record<string, string>;

export function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveOverride(id: string, content: string) {
  if (typeof window === "undefined") return;
  const current = loadOverrides();
  current[id] = content;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function applyOverrides(tree: FsNode[], overrides: Overrides): FsNode[] {
  return tree.map((node) => {
    if (node.children) {
      return { ...node, children: applyOverrides(node.children, overrides) };
    }
    if (overrides[node.id] !== undefined) {
      return { ...node, content: overrides[node.id] };
    }
    return node;
  });
}

export function findNode(tree: FsNode[], id: string): FsNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export function languageFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}
