// data/models.js
// ═══════════════════════════════════════════════════════════════
//  TokenLens 内置模型费率配置
//  ⭐ 此文件独立于主逻辑，方便频繁更新费率
//
//  维护说明：
//    - currency: "USD" | "CNY" | 其他（需在 BUILTIN_CURRENCIES 中定义）
//    - type: "standard" | "tiered_output"
//    - 所有价格单位：该币种 / 百万 tokens (per 1M tokens)
//    - cacheHit 为 null 表示该模型不支持缓存
//    - tiered_output 的 outputTiers 按 maxOutputTokens 升序排列
//      最后一档 maxOutputTokens 设为 Infinity
// ═══════════════════════════════════════════════════════════════

window.BUILTIN_CURRENCIES = [
  { code: "USD", name: "美元",   symbol: "$", toCny: null },  // null = 从 API 获取
  { code: "CNY", name: "人民币", symbol: "¥", toCny: 1    },  // 基准货币
];

window.BUILTIN_MODELS = [

  // ╔══════════════════════════════╗
  // ║         OpenAI               ║
  // ╚══════════════════════════════╝
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 2.50,
      output: 10.00,
      cacheHit: 1.25,
    }
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.15,
      output: 0.60,
      cacheHit: 0.075,
    }
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 2.00,
      output: 8.00,
      cacheHit: 0.50,
    }
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.40,
      output: 1.60,
      cacheHit: 0.10,
    }
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.10,
      output: 0.40,
      cacheHit: 0.025,
    }
  },
  {
    id: "o3",
    name: "o3",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 10.00,
      output: 40.00,
      cacheHit: 2.50,
    }
  },
  {
    id: "o3-mini",
    name: "o3 mini",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.10,
      output: 4.40,
      cacheHit: 0.55,
    }
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.10,
      output: 4.40,
      cacheHit: 0.275,
    }
  },

  // ╔══════════════════════════════╗
  // ║        Anthropic             ║
  // ╚══════════════════════════════╝
  {
    id: "claude-4-sonnet",
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 3.00,
      output: 15.00,
      cacheHit: 0.30,
      cacheWrite: 3.75,
    }
  },
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 3.00,
      output: 15.00,
      cacheHit: 0.30,
      cacheWrite: 3.75,
    }
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 3.00,
      output: 15.00,
      cacheHit: 0.30,
      cacheWrite: 3.75,
    }
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.80,
      output: 4.00,
      cacheHit: 0.08,
      cacheWrite: 1.00,
    }
  },

  // ╔══════════════════════════════╗
  // ║          Google              ║
  // ╚══════════════════════════════╝
  {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "tiered_output",
      input: 1.25,
      cacheHit: 0.31,
      outputTiers: [
        { maxOutputTokens: 200,      price: 5.00  },
        { maxOutputTokens: Infinity, price: 10.00 },
      ]
    }
  },
  {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "tiered_output",
      input: 0.15,
      cacheHit: 0.0375,
      outputTiers: [
        { maxOutputTokens: 200,      price: 0.60 },
        { maxOutputTokens: Infinity, price: 3.50 },
      ]
    }
  },
  {
    id: "gemini-2-0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.10,
      output: 0.40,
      cacheHit: 0.025,
    }
  },

  // ╔══════════════════════════════╗
  // ║         DeepSeek             ║
  // ╚══════════════════════════════╝
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 2.00,
      output: 8.00,
      cacheHit: 0.50,
    }
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 4.00,
      output: 16.00,
      cacheHit: 1.00,
    }
  },

  // ╔══════════════════════════════╗
  // ║        阿里云 Qwen            ║
  // ╚══════════════════════════════╝
  {
    id: "qwen-max",
    name: "Qwen Max",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 2.40,
      output: 9.60,
      cacheHit: 0.60,
    }
  },
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.80,
      output: 2.00,
      cacheHit: 0.20,
    }
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.30,
      output: 0.60,
      cacheHit: 0.036,
    }
  },

  // ╔══════════════════════════════╗
  // ║        字节跳动 豆包          ║
  // ╚══════════════════════════════╝
  {
    id: "doubao-pro-32k",
    name: "豆包 Pro 32K",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.80,
      output: 2.00,
      cacheHit: null,
    }
  },
  {
    id: "doubao-pro-128k",
    name: "豆包 Pro 128K",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 5.00,
      output: 9.00,
      cacheHit: null,
    }
  },
  {
    id: "doubao-1-5-pro",
    name: "豆包 1.5 Pro",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "tiered_output",
      input: 0.80,
      cacheHit: null,
      outputTiers: [
        { maxOutputTokens: 200,      price: 2.00 },
        { maxOutputTokens: Infinity, price: 8.00 },
      ]
    }
  },

  // ╔══════════════════════════════╗
  // ║          百度文心             ║
  // ╚══════════════════════════════╝
  {
    id: "ernie-4-5",
    name: "ERNIE 4.5",
    provider: "百度",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 4.00,
      output: 16.00,
      cacheHit: null,
    }
  },
  {
    id: "ernie-4-0",
    name: "ERNIE 4.0",
    provider: "百度",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 30.00,
      output: 60.00,
      cacheHit: null,
    }
  },

  // ╔══════════════════════════════╗
  // ║       月之暗面 Moonshot       ║
  // ╚══════════════════════════════╝
  {
    id: "moonshot-v1-32k",
    name: "Moonshot v1 32K",
    provider: "月之暗面",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 24.00,
      output: 24.00,
      cacheHit: null,
    }
  },

  // ╔══════════════════════════════╗
  // ║         智谱 GLM             ║
  // ╚══════════════════════════════╝
  {
    id: "glm-4-plus",
    name: "GLM-4-Plus",
    provider: "智谱AI",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 50.00,
      output: 50.00,
      cacheHit: null,
    }
  },
  {
    id: "glm-4-flash",
    name: "GLM-4-Flash",
    provider: "智谱AI",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.00,
      output: 0.00,
      cacheHit: null,
    }
  },
];
