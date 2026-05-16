const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const API_BASE = "https://api.siliconflow.cn/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `你是一个专业的全栈工程师 AI Agent，类似于 Atoms 平台的核心引擎。

用户会用自然语言描述他们想要的网页应用。你需要：

1. 分析用户需求
2. 生成一个完整的、自包含的 HTML 文件（包含内联 CSS 和 JavaScript）
3. 代码要求：
   - 使用现代 CSS（flexbox/grid）实现美观的响应式布局
   - 使用 vanilla JavaScript 实现所有交互逻辑
   - 所有功能必须在单个 HTML 文件中完成
   - UI 要现代美观，配色专业
   - 不使用 alert/prompt/confirm，用内联提示代替

返回格式：将完整代码放在 \`\`\`html \`\`\` 代码块中。
在代码块之前，用 1-2 句话简要说明你的实现思路。`;

export function buildMessages(
  history: ChatMessage[],
  userMessage: string,
  previousCode?: string
): ChatMessage[] {
  let systemPrompt = SYSTEM_PROMPT;

  if (previousCode) {
    systemPrompt += `

当前已有上一版代码，用户正在对已有应用提出修改需求。请基于上一版代码进行增量修改，不要从头重写。`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
  ];

  if (previousCode) {
    messages.push({
      role: "user",
      content: `[上一版代码]\n${previousCode}\n\n[修改要求]\n${userMessage}`,
    });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

export async function streamChat(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "THUDM/GLM-4-32B-0414",
      messages,
      stream: true,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  return response;
}

export function extractCode(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/);
  if (match) return match[1].trim();

  const htmlMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (htmlMatch) return htmlMatch[1].trim();

  return null;
}
