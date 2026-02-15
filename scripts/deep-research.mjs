#!/usr/bin/env node

/**
 * Deep Research Script
 * 
 * 调用外部 OpenAI 兼容 API 进行深度技术调研
 * 
 * 环境变量:
 *   DEEP_RESEARCH_API_URL - API baseURL (必需)
 *   DEEP_RESEARCH_API_KEY - API 密钥 (必需)
 *   DEEP_RESEARCH_MODEL   - 模型名称 (可选, 默认 gpt-4o)
 * 
 * 用法:
 *   node deep-research.mjs "你的问题"
 */

const API_URL = process.env.DEEP_RESEARCH_API_URL;
const API_KEY = process.env.DEEP_RESEARCH_API_KEY;
const MODEL = process.env.DEEP_RESEARCH_MODEL || "gpt-4o";

function output(result) {
  console.log(JSON.stringify(result, null, 2));
}

function error(message) {
  output({ success: false, error: message });
  process.exit(1);
}

async function main() {
  // 获取问题参数
  const question = process.argv.slice(2).join(" ").trim();
  
  if (!question) {
    error("请提供调研问题作为参数");
  }

  // 检查环境变量
  if (!API_URL) {
    error("缺少环境变量 DEEP_RESEARCH_API_URL");
  }
  
  if (!API_KEY) {
    error("缺少环境变量 DEEP_RESEARCH_API_KEY");
  }

  // 构造请求
  const endpoint = API_URL.replace(/\/$/, "") + "/chat/completions";
  
  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是一个专业的技术调研助手。请针对用户的问题进行深入调研，提供：
1. 准确的技术信息和文档引用
2. 代码示例（如适用）
3. 最佳实践建议
4. 常见陷阱和注意事项
5. 相关资源链接

请确保信息准确、最新，并以清晰的结构组织回答。`
      },
      {
        role: "user",
        content: question
      }
    ],
    temperature: 0.3,
    max_tokens: 4096
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      error("API 返回格式异常: " + JSON.stringify(data));
    }

    const answer = data.choices[0].message?.content || "";
    
    output({
      success: true,
      question: question,
      answer: answer,
      model: data.model || MODEL,
      usage: data.usage || null
    });

  } catch (err) {
    error(`请求异常: ${err.message}`);
  }
}

main();
