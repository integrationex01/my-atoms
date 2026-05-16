"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { CodeViewer } from "@/components/code-viewer";
import { Button } from "@/components/ui/button";

type Tab = "preview" | "code" | "history";

interface Snapshot {
  id: string;
  code: string;
  version: number;
  createdAt: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [messages, setMessages] = useState<
    {
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    }[]
  >([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [msgRes, snapRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/messages`),
          fetch(`/api/projects/${projectId}/snapshots`),
        ]);

        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.messages);
        }

        if (snapRes.ok) {
          const data = await snapRes.json();
          setSnapshots(data.snapshots);
          if (data.snapshots.length > 0) {
            setCurrentCode(data.snapshots[0].code);
            setSelectedSnapshotId(data.snapshots[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  function handleCodeGenerated(code: string) {
    setCurrentCode(code);
    setActiveTab("preview");
    fetch(`/api/projects/${projectId}/snapshots`)
      .then((res) => res.json())
      .then((data) => {
        if (data.snapshots) {
          setSnapshots(data.snapshots);
          if (data.snapshots.length > 0) {
            setSelectedSnapshotId(data.snapshots[0].id);
          }
        }
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex">
        {/* Left: Chat Panel */}
        <div className="w-[400px] min-w-[320px] border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">工作区</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              projectId={projectId}
              initialMessages={messages}
              onCodeGenerated={handleCodeGenerated}
            />
          </div>
        </div>

        {/* Right: Preview/Code/History */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center border-b px-4 gap-1">
            <Button
              variant={activeTab === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
            >
              预览
            </Button>
            <Button
              variant={activeTab === "code" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("code")}
            >
              代码
            </Button>
            <Button
              variant={activeTab === "history" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("history")}
            >
              历史版本 ({snapshots.length})
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "preview" && (
              <PreviewPanel code={currentCode} />
            )}
            {activeTab === "code" && currentCode && (
              <CodeViewer code={currentCode} />
            )}
            {activeTab === "code" && !currentCode && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                暂无代码
              </div>
            )}
            {activeTab === "history" && (
              <div className="p-4 space-y-2 overflow-y-auto h-full">
                {snapshots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    暂无历史版本
                  </p>
                ) : (
                  snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => {
                        setSelectedSnapshotId(snap.id);
                        setCurrentCode(snap.code);
                        setActiveTab("preview");
                      }}
                      className={`w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                        selectedSnapshotId === snap.id
                          ? "border-primary bg-muted"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          版本 {snap.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(snap.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
