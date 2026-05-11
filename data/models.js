// data/models.js
// ═══════════════════════════════════════════════════════════════
//  TokenLens 内置模型费率配置
//  最后核对：2026-05-11
//
//  维护说明：
//    - currency: "USD" | "CNY" | 其他（需在 BUILTIN_CURRENCIES 中定义）
//    - 所有价格单位：该币种 / 百万 tokens (per 1M tokens)
//    - cacheHit 为 null 表示该模型未公开、暂不建模或该折扣不适合叠加
//    - 推理 / thinking / reasoning tokens：按各厂商规则并入 output 计费
//    - Anthropic cacheWrite：当前没有独立字段，未单独建模；如需精算，
//      可在首次调用中手动上调 input 价或增加一次性成本。
//    - Batch / Flex / 夜间等折扣：当前无专门字段，使用独立模型条目表达，
//      id/name 后缀使用 "-batch"、"-night"。
//
//    - pricing.type 枚举：
//        ┌───────────────────┬──────────────────────────────────────────────────┐
//        │ type              │ 含义                                              │
//        ├───────────────────┼──────────────────────────────────────────────────┤
//        │ standard          │ 固定 input / output / cacheHit                   │
//        │ tiered_by_input   │ 由【单次输入 Token 总量】决定档位；               │
//        │                   │ 每档同时给出 input / output / cacheHit            │
//        │ tiered_by_output  │ 由【单次输出 Token 总量】决定档位                 │
//        └───────────────────┴──────────────────────────────────────────────────┘
//
//    - tiered_by_input  的 tiers 按 maxInputTokens  升序，最后一档设为 Infinity
//    - tiered_by_output 的 tiers 按 maxOutputTokens 升序，最后一档设为 Infinity
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
    id: "gpt-5-5",
    name: "GPT-5.5",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 5.00,
      output: 30.00,
      cacheHit: 0.50,
    }
  },
  {
    id: "gpt-5-5-batch",
    name: "GPT-5.5 Batch",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 2.50,
      output: 15.00,
      cacheHit: 0.25,
    }
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 2.50,
      output: 15.00,
      cacheHit: 0.25,
    }
  },
  {
    id: "gpt-5-4-batch",
    name: "GPT-5.4 Batch",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.25,
      output: 7.50,
      cacheHit: 0.125,
    }
  },
  {
    id: "gpt-5-4-mini",
    name: "GPT-5.4 mini",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.75,
      output: 4.50,
      cacheHit: 0.075,
    }
  },
  {
    id: "gpt-5-4-mini-batch",
    name: "GPT-5.4 mini Batch",
    provider: "OpenAI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.375,
      output: 2.25,
      cacheHit: 0.0375,
    }
  },

  // ╔══════════════════════════════╗
  // ║        Anthropic             ║
  // ╚══════════════════════════════╝
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 5.00,
      output: 25.00,
      cacheHit: 0.50,
    }
  },
  {
    id: "claude-opus-4-7-batch",
    name: "Claude Opus 4.7 Batch",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 2.50,
      output: 12.50,
      cacheHit: 0.25,
    }
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 3.00,
      output: 15.00,
      cacheHit: 0.30,
    }
  },
  {
    id: "claude-sonnet-4-6-batch",
    name: "Claude Sonnet 4.6 Batch",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.50,
      output: 7.50,
      cacheHit: 0.15,
    }
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.00,
      output: 5.00,
      cacheHit: 0.10,
    }
  },
  {
    id: "claude-haiku-4-5-batch",
    name: "Claude Haiku 4.5 Batch",
    provider: "Anthropic",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.50,
      output: 2.50,
      cacheHit: 0.05,
    }
  },

  // ╔══════════════════════════════╗
  // ║          Google Gemini       ║
  // ╚══════════════════════════════╝
  {
    id: "gemini-3-1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 200000,   input: 2.00, output: 12.00, cacheHit: 0.20 },
        { maxInputTokens: Infinity, input: 4.00, output: 18.00, cacheHit: 0.40 },
      ]
    }
  },
  {
    id: "gemini-3-1-pro-preview-batch",
    name: "Gemini 3.1 Pro Preview Batch",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 200000,   input: 1.00, output: 6.00, cacheHit: 0.20 },
        { maxInputTokens: Infinity, input: 2.00, output: 9.00, cacheHit: 0.40 },
      ]
    }
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.50,
      output: 3.00,
      cacheHit: 0.05,
    }
  },
  {
    id: "gemini-3-flash-preview-batch",
    name: "Gemini 3 Flash Preview Batch",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.25,
      output: 1.50,
      cacheHit: 0.05,
    }
  },
  {
    id: "gemini-3-1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.25,
      output: 1.50,
      cacheHit: 0.025,
    }
  },
  {
    id: "gemini-3-1-flash-lite-batch",
    name: "Gemini 3.1 Flash-Lite Batch",
    provider: "Google",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.125,
      output: 0.75,
      cacheHit: 0.0125,
    }
  },

  // ╔══════════════════════════════╗
  // ║         DeepSeek             ║
  // ╚══════════════════════════════╝
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.435,
      output: 0.87,
      cacheHit: 0.003625,
    }
  },
  {
    id: "deepseek-v4-pro-night",
    name: "DeepSeek V4 Pro Night",
    provider: "DeepSeek",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.2175,
      output: 0.435,
      cacheHit: 0.0018125,
    }
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.14,
      output: 0.28,
      cacheHit: 0.0028,
    }
  },
  {
    id: "deepseek-v4-flash-night",
    name: "DeepSeek V4 Flash Night",
    provider: "DeepSeek",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.07,
      output: 0.14,
      cacheHit: 0.0014,
    }
  },

  // ╔══════════════════════════════╗
  // ║        阿里云 Qwen            ║
  // ╚══════════════════════════════╝
  {
    id: "qwen3-6-max-preview",
    name: "Qwen3.6 Max Preview",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 128000,   input: 9.742,  output: 58.455, cacheHit: null },
        { maxInputTokens: Infinity, input: 14.988, output: 89.930, cacheHit: null },
      ]
    }
  },
  {
    id: "qwen3-6-plus",
    name: "Qwen3.6 Plus",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 256000,   input: 2.00, output: 12.00, cacheHit: null },
        { maxInputTokens: Infinity, input: 8.00, output: 48.00, cacheHit: null },
      ]
    }
  },
  {
    id: "qwen3-6-plus-batch",
    name: "Qwen3.6 Plus Batch",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 256000,   input: 1.00, output: 6.00,  cacheHit: null },
        { maxInputTokens: Infinity, input: 4.00, output: 24.00, cacheHit: null },
      ]
    }
  },
  {
    id: "qwen3-6-flash",
    name: "Qwen3.6 Flash",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 256000,   input: 1.20, output: 7.20,  cacheHit: null },
        { maxInputTokens: Infinity, input: 4.80, output: 28.80, cacheHit: null },
      ]
    }
  },
  {
    id: "qwen3-6-flash-batch",
    name: "Qwen3.6 Flash Batch",
    provider: "阿里云",
    currency: "CNY",
    pricing: {
      type: "tiered_by_input",
      tiers: [
        { maxInputTokens: 256000,   input: 0.60, output: 3.60,  cacheHit: null },
        { maxInputTokens: Infinity, input: 2.40, output: 14.40, cacheHit: null },
      ]
    }
  },

  // ╔══════════════════════════════╗
  // ║        字节跳动 豆包          ║
  // ╚══════════════════════════════╝
  {
    id: "doubao-seed-2-0-pro",
    name: "Doubao-Seed-2.0 Pro",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 3.20,
      output: 16.00,
      cacheHit: null,
    }
  },
  {
    id: "doubao-seed-2-0-lite",
    name: "Doubao-Seed-2.0 Lite",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.60,
      output: 3.60,
      cacheHit: 0.12,
    }
  },
  {
    id: "doubao-seed-2-0-mini",
    name: "Doubao-Seed-2.0 Mini",
    provider: "字节跳动",
    currency: "CNY",
    pricing: {
      type: "standard",
      input: 0.20,
      output: 2.00,
      cacheHit: null,
    }
  },

  // ╔══════════════════════════════╗
  // ║       月之暗面 Kimi           ║
  // ╚══════════════════════════════╝
  {
    id: "kimi-k2-6",
    name: "Kimi K2.6",
    provider: "月之暗面",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.95,
      output: 4.00,
      cacheHit: 0.16,
    }
  },
  {
    id: "kimi-k2-6-batch",
    name: "Kimi K2.6 Batch",
    provider: "月之暗面",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.57,
      output: 2.40,
      cacheHit: 0.10,
    }
  },

  // ╔══════════════════════════════╗
  // ║         智谱 GLM             ║
  // ╚══════════════════════════════╝
  {
    id: "glm-5-1",
    name: "GLM-5.1",
    provider: "智谱AI",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.05,
      output: 3.50,
      cacheHit: 0.208,
    }
  },

  // ╔══════════════════════════════╗
  // ║         小米 MiMo            ║
  // ╚══════════════════════════════╝
  {
    id: "mimo-v2-5-pro",
    name: "MiMo V2.5 Pro",
    provider: "小米",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 1.00,
      output: 3.00,
      cacheHit: 0.20,
    }
  },
  {
    id: "mimo-v2-5",
    name: "MiMo V2.5",
    provider: "小米",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.40,
      output: 2.00,
      cacheHit: 0.08,
    }
  },
  {
    id: "mimo-v2-flash",
    name: "MiMo V2 Flash",
    provider: "小米",
    currency: "USD",
    pricing: {
      type: "standard",
      input: 0.10,
      output: 0.30,
      cacheHit: 0.01,
    }
  },
];
