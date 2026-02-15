  // chat-client.js (Node.js 18+)

  const BASE_URL = "http://45.192.97.104:5432";

  // 内存会话存储：生产建议换 Redis/DB
  const sessions = new Map();

  /** 创建会话，返回固定 conversation_uuid */
  export function createConversation(systemPrompt = "你是一个有帮助的助手") {
    const conversation_uuid = crypto.randomUUID();
      { role: "system", content: systemPrompt }
    return conversation_uuid;
  }

  /** 单轮对话：保留 conversation_uuid，并自动续写历史 */
    const history = sessions.get(conversation_uuid);
    if (!history) throw new Error("conversation_uuid 不存在");
    history.push({ role: "user", content: userText });

    const headers = { "Content-Type": "application/json" };
    if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

    const resp = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      body: JSON.stringify({
        model: "grok-4",
        messages: history,   // 关键：每轮携带历史，实现续聊
        stream: false
      })
    });

      const txt = await resp.text();
      throw new Error(`上游失败: status=${resp.status}, body=${txt}`);
    }
    const data = await resp.json();
    const assistant = data?.choices?.[0]?.message?.content ?? "";
    history.push({ role: "assistant", content: assistant });

      conversation_uuid,      // 固定不变（你要保留的 UUID）
      answer: assistant
  }

  // ---- 示例 ----
  async function demo() {
    console.log("conversation_uuid=", cid);
    const r1 = await chat(cid, "我叫张三，请记住");
    console.log("第1轮:", r1.answer);

    const r2 = await chat(cid, "我叫什么名字？");
  }
  if (process.argv[1]?.endsWith("chat-client.js")) {
    demo().catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
  }