import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMessages, streamChat, extractCode } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project || project.userId !== user.userId) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const { message } = await request.json();

  await prisma.message.create({
    data: { projectId: id, role: "user", content: message },
  });

  const history = await prisma.message.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  const latestSnapshot = await prisma.snapshot.findFirst({
    where: { projectId: id },
    orderBy: { version: "desc" },
  });

  const chatHistory = history
    .filter((m) => m.role !== "user" || m.content !== message)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages = buildMessages(chatHistory, message, latestSnapshot?.code);

  try {
    const aiResponse = await streamChat(messages);

    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (!trimmed.startsWith("data: ")) continue;

              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(new TextEncoder().encode(delta));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }

          await prisma.message.create({
            data: { projectId: id, role: "assistant", content: fullContent },
          });

          const code = extractCode(fullContent);
          if (code) {
            const version = (latestSnapshot?.version || 0) + 1;
            await prisma.snapshot.create({
              data: { projectId: id, code, version },
            });
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}
