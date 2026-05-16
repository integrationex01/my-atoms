"use client";

interface PreviewPanelProps {
  code: string | null;
}

export function PreviewPanel({ code }: PreviewPanelProps) {
  if (!code) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">应用预览区</p>
          <p className="text-sm">发送消息生成应用后，将在此处显示</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={code}
      sandbox="allow-scripts allow-forms allow-modals"
      className="w-full h-full border-0 bg-white"
      title="应用预览"
    />
  );
}
