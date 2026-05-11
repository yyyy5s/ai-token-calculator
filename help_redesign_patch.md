# ModelCost 帮助界面重写建议

## 设计判断

当前帮助内容的问题不是信息少，而是过早暴露实现细节。普通用户不关心 `standard`、`tiered_by_input`、`cacheHit`、`Infinity` 这些内部命名，他们只想知道三件事：填什么、怎么看结果、什么时候需要自定义模型。

建议把帮助界面改成「任务型说明」：先告诉用户最快怎么得到结果，再解释 Token、缓存、两种输入模式，最后才放自定义模型和限制说明。

下面内容可以直接替换 `data/i18n.js` 里的 Help 相关 key。它不要求改 JS，只利用当前 `data-i18n-html` 的渲染方式。

## 中文 Help 文案替换块

```js
// 使用帮助弹窗
"modal.help.title": "使用帮助",
"modal.help.section.basic": "3 步算出 AI 调用成本",
"modal.help.basic.body": `
  <div class="help-hero">
    <p><strong>ModelCost 的用途：</strong>帮你快速估算某个 AI 模型在一次调用、一天、一个月大概会花多少钱。</p>
    <ol>
      <li><strong>选模型：</strong>在左侧模型库选择一个模型，或点击「添加」录入自己的模型价格。</li>
      <li><strong>填用量：</strong>填写输入 Token、输出 Token、缓存命中率和每日调用次数。</li>
      <li><strong>看结果：</strong>右侧会自动显示单次、每日、每月成本，并用图表展示输入和输出的费用占比。</li>
    </ol>
  </div>
  <p class="help-note">不确定 Token 数时，先用粗略估计即可；后续拿到账单或日志后，可以切到「总量算单次」再修正。</p>
`,
"modal.help.section.modes": "应该选哪种输入方式？",
"modal.help.modes.body": `
  <div class="help-choice-grid">
    <div class="help-choice-card">
      <h5>单次算总量</h5>
      <p><strong>适合：</strong>你正在做方案预估，还没有完整日志。</p>
      <p><strong>怎么填：</strong>估算一次请求里大概有多少输入、多少输出，再填每天调用多少次。</p>
      <p><strong>例子：</strong>一次客服问答约 3,000 输入 Token、800 输出 Token、每天 2,000 次。</p>
    </div>
    <div class="help-choice-card">
      <h5>总量算单次</h5>
      <p><strong>适合：</strong>你已经有一段时间的调用日志或账单。</p>
      <p><strong>怎么填：</strong>填总输入命中、总输入未命中、总输出和调用次数，系统会自动折算平均单次用量。</p>
      <p><strong>例子：</strong>昨天共调用 10,000 次，日志里有总输入和总输出 Token。</p>
    </div>
  </div>
`,
"modal.help.section.tiers": "几个容易混淆的词",
"modal.help.tiers.body": `
  <dl class="help-glossary">
    <dt>Token</dt>
    <dd>AI 服务的计费单位。可以粗略理解为一小段文字。不同语言、标点和格式都会影响 Token 数。</dd>
    <dt>输入 Token</dt>
    <dd>你发给模型的全部内容，包括用户问题、系统提示词、历史对话、检索到的资料等。长上下文会显著增加输入成本。</dd>
    <dt>输出 Token</dt>
    <dd>模型生成的回答。推理模型中的 reasoning / thinking 内容，通常也应计入输出成本。</dd>
    <dt>缓存命中率</dt>
    <dd>有多少输入内容被供应商识别为可复用缓存。支持缓存计费的模型里，命中率越高，输入成本通常越低。不使用缓存或不确定时填 0%。</dd>
    <dt>分档定价</dt>
    <dd>有些模型会按单次输入或输出长度切换价格档位。你只需要按官方价格页录入阈值；最后一档没有上限时，把上限留空。</dd>
  </dl>
`,
"modal.help.section.addCustom": "添加自己的模型价格",
"modal.help.addCustom.body": `
  <p>左侧点击「添加」即可创建自定义模型。所有价格都按<strong>当前币种 / 100 万 tokens</strong>填写。</p>
  <ul>
    <li><strong>固定单价：</strong>输入价和输出价不会随长度变化。大多数模型可以先选这个。</li>
    <li><strong>按输入量分档：</strong>官方价格页写明「输入超过某个长度后价格变化」时使用。先填输入上限，再填这一档的输入价、输出价和缓存价。</li>
    <li><strong>按输出量分档：</strong>官方价格页写明「输出超过某个长度后价格变化」时使用。用法同上，只是分档依据换成输出长度。</li>
  </ul>
  <p class="help-note">价格换算：如果官方写 $0.15 / 1M tokens，就填 0.15；如果写 $0.00015 / 1K tokens，换算成每百万也是 0.15。没有缓存价格时可以留空。</p>
`,
"modal.help.section.extra": "对比、导入导出和复杂计费",
"modal.help.extra.body": `
  <ul>
    <li><strong>模型对比：</strong>选中模型后点击「加入对比」，或右键模型加入对比。对比区会用同一组参数计算最多 5 个模型。</li>
    <li><strong>导入 / 导出：</strong>左侧顶部按钮可以导出自定义模型和币种配置，换设备时再导入。</li>
    <li><strong>Batch、夜间折扣、促销价：</strong>复制一个模型，把价格改成折扣后的价格，并在名称里标注 Batch / Night 即可。</li>
    <li><strong>多模态、缓存写入、工具调用：</strong>目前没有单独字段。需要精算时，建议拆成多个模型条目，或手动把额外成本折算进输入 / 输出价格。</li>
  </ul>
`,
"modal.help.section.lang": "结果只是估算",
"modal.help.lang.body": `
  <p>ModelCost 的结果适合做方案比较、预算预估和账单复盘，不等同于最终账单。不同厂商对缓存、推理 Token、多模态输入、批处理、地区价格和促销折扣的处理可能不同。</p>
  <p>正式报价前，请用厂商官方价格页和你的实际账单再核对一次。</p>
`
```

## English Help 文案替换块

```js
// Help modal
"modal.help.title": "Help",
"modal.help.section.basic": "Estimate AI cost in 3 steps",
"modal.help.basic.body": `
  <div class="help-hero">
    <p><strong>What ModelCost does:</strong> it helps estimate how much an AI model may cost per call, per day, and per month.</p>
    <ol>
      <li><strong>Pick a model:</strong> choose a model from the sidebar, or click Add to enter your own pricing.</li>
      <li><strong>Enter usage:</strong> fill input tokens, output tokens, cache hit rate, and calls per day.</li>
      <li><strong>Read the result:</strong> ModelCost shows single-call, daily, and monthly estimates, plus the input/output cost split.</li>
    </ol>
  </div>
  <p class="help-note">If you do not know the token counts yet, start with a rough estimate. Once you have logs or billing data, switch to “From totals” to refine the estimate.</p>
`,
"modal.help.section.modes": "Which input mode should I use?",
"modal.help.modes.body": `
  <div class="help-choice-grid">
    <div class="help-choice-card">
      <h5>Single call</h5>
      <p><strong>Use when:</strong> you are estimating a plan and do not have logs yet.</p>
      <p><strong>How:</strong> estimate input and output tokens for one request, then enter expected calls per day.</p>
      <p><strong>Example:</strong> one support reply uses about 3,000 input tokens and 800 output tokens, 2,000 times per day.</p>
    </div>
    <div class="help-choice-card">
      <h5>From totals</h5>
      <p><strong>Use when:</strong> you already have logs or billing data for a period.</p>
      <p><strong>How:</strong> enter total cached input, total uncached input, total output, and call count. ModelCost derives per-call averages.</p>
      <p><strong>Example:</strong> yesterday you made 10,000 calls and have total input/output token counts from logs.</p>
    </div>
  </div>
`,
"modal.help.section.tiers": "Terms that matter",
"modal.help.tiers.body": `
  <dl class="help-glossary">
    <dt>Token</dt>
    <dd>The billing unit used by AI services. Roughly, it is a small piece of text. Language, punctuation, and formatting can all change the count.</dd>
    <dt>Input tokens</dt>
    <dd>Everything sent to the model: user message, system prompt, chat history, retrieved context, and attached text.</dd>
    <dt>Output tokens</dt>
    <dd>Everything generated by the model. For reasoning models, reasoning / thinking content should usually be counted as output cost.</dd>
    <dt>Cache hit rate</dt>
    <dd>The share of input tokens reused from provider-side cache. For models with cache pricing, a higher hit rate usually lowers input cost. Use 0% if you do not use cache or are unsure.</dd>
    <dt>Tiered pricing</dt>
    <dd>Some models switch price tiers based on single-call input or output length. Enter the thresholds from the official pricing page; leave the final threshold blank if there is no upper limit.</dd>
  </dl>
`,
"modal.help.section.addCustom": "Add your own model pricing",
"modal.help.addCustom.body": `
  <p>Click Add in the sidebar to create a custom model. All prices are entered as <strong>selected currency / 1M tokens</strong>.</p>
  <ul>
    <li><strong>Flat price:</strong> input and output prices do not change with request length. Most models can start here.</li>
    <li><strong>Tier by input length:</strong> use this when the official price changes after the input passes a threshold. Enter the input threshold and the prices for that tier.</li>
    <li><strong>Tier by output length:</strong> same idea, but the tier is selected by output length.</li>
  </ul>
  <p class="help-note">Conversion tip: if the official price is $0.15 / 1M tokens, enter 0.15. If it is $0.00015 / 1K tokens, it is also 0.15 per 1M. Leave cache price blank if unavailable.</p>
`,
"modal.help.section.extra": "Compare, import/export, and complex pricing",
"modal.help.extra.body": `
  <ul>
    <li><strong>Compare models:</strong> click Add to compare, or right-click a model. The comparison uses the same parameters for up to 5 models.</li>
    <li><strong>Import / export:</strong> use the sidebar buttons to export custom models and currencies as JSON, then import them on another device.</li>
    <li><strong>Batch, off-peak, promo pricing:</strong> duplicate a model, change the prices, and mark the name with Batch / Night / Promo.</li>
    <li><strong>Multimodal, cache write, tool calls:</strong> these are not modeled as separate fields yet. For precise estimates, split them into separate model entries or fold the extra cost into input/output prices.</li>
  </ul>
`,
"modal.help.section.lang": "The result is an estimate",
"modal.help.lang.body": `
  <p>ModelCost is designed for model comparison, budgeting, and billing review. It is not guaranteed to match the final provider bill exactly.</p>
  <p>Before using the result for formal pricing, verify it against the provider’s official pricing page and your actual invoice.</p>
`
```

## 可选 CSS 增强

可以加到 `src/styles.css` 末尾，让帮助弹窗更像面向用户的说明页，而不是纯文本列表。

```css
.help-body {
  display: grid;
  gap: 18px;
  line-height: 1.65;
}

.help-section {
  padding: 16px;
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.22));
  border-radius: 16px;
  background: var(--card-bg, rgba(255, 255, 255, 0.04));
}

.help-section h4 {
  margin: 0 0 10px;
  font-size: 15px;
}

.help-section p,
.help-section ol,
.help-section ul,
.help-section dl {
  margin-top: 0;
  margin-bottom: 0;
}

.help-hero {
  padding: 14px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.08);
}

.help-hero ol {
  padding-left: 20px;
  margin-top: 8px;
}

.help-note {
  margin-top: 10px !important;
  color: var(--text-muted, #64748b);
  font-size: 13px;
}

.help-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.help-choice-card {
  padding: 14px;
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.22));
  border-radius: 14px;
}

.help-choice-card h5 {
  margin: 0 0 8px;
  font-size: 14px;
}

.help-choice-card p + p {
  margin-top: 8px;
}

.help-glossary {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px 14px;
}

.help-glossary dt {
  font-weight: 700;
}

.help-glossary dd {
  margin: 0;
  color: var(--text-muted, #64748b);
}

@media (max-width: 720px) {
  .help-choice-grid,
  .help-glossary {
    grid-template-columns: 1fr;
  }
}
```
