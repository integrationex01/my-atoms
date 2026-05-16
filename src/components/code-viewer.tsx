"use client";

interface CodeViewerProps {
  code: string;
}

export function CodeViewer({ code }: CodeViewerProps) {
  return (
    <div className="h-full overflow-auto">
      <pre className="p-4 text-sm font-mono bg-slate-950 text-slate-50 min-h-full">
        <code>{code}</code>
      </pre>
    </div>
  );
}
