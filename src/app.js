// src/app.js
"use strict";

// ═══════════ Global State ═══════════
const AppState = {
  selectedModelId: null,
  compareModelIds: [],
  searchQuery: "",
  compareExpanded: true,
  exchangeRate: 7.25,
  allModels: [],
  allCurrencies: [],
  inputMode: "single", // "single" | "total"
};

// ═══════════ Helpers ═══════════
function getParams() {
  const usdToCny = parseFloat(document.getElementById("usdToCny").value) || 7.25;
  const dailyCalls = Math.max(0, parseInt(document.getElementById("dailyCalls").value) || 0);

  let inputTokens, outputTokens, cacheHitRate;

  if (AppState.inputMode === "total") {
    const totalCached   = Math.max(0, parseInt(document.getElementById("totalCachedTokens").value) || 0);
    const totalUncached = Math.max(0, parseInt(document.getElementById("totalUncachedTokens").value) || 0);
    const totalOutput   = Math.max(0, parseInt(document.getElementById("totalOutputTokens").value) || 0);
    const totalCalls    = Math.max(1, parseInt(document.getElementById("totalCalls").value) || 1);

    const totalInput = totalCached + totalUncached;
    inputTokens  = Math.round(totalInput / totalCalls);
    outputTokens = Math.round(totalOutput / totalCalls);
    cacheHitRate = totalInput > 0 ? totalCached / totalInput : 0;

    // Update computed summary display
    document.getElementById("computedInputPerCall").textContent = inputTokens.toLocaleString() + " tokens";
    document.getElementById("computedOutputPerCall").textContent = outputTokens.toLocaleString() + " tokens";
    document.getElementById("computedCacheRate").textContent = (cacheHitRate * 100).toFixed(1) + "%";
  } else {
    inputTokens  = Math.max(0, parseInt(document.getElementById("inputTokens").value) || 0);
    outputTokens = Math.max(0, parseInt(document.getElementById("outputTokens").value) || 0);
    cacheHitRate = Math.min(1, Math.max(0, (parseFloat(document.getElementById("cacheHitRate").value) || 0) / 100));
  }

  return { inputTokens, outputTokens, cacheHitRate, dailyCalls, usdToCny };
}

function refreshAllModels() {
  const custom = Storage.getCustomModels();
  // JSON.stringify serializes Infinity as null — restore for tier thresholds.
  const restoreInf = (arr, key) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(t => {
      if (t[key] === null || t[key] === undefined) t[key] = Infinity;
    });
  };
  custom.forEach(m => {
    const p = m.pricing;
    if (!p) return;
    if (p.type === "tiered_by_input")  restoreInf(p.tiers, "maxInputTokens");
    if (p.type === "tiered_by_output") restoreInf(p.tiers, "maxOutputTokens");
  });
  AppState.allModels = [...window.BUILTIN_MODELS, ...custom];
}

function refreshAllCurrencies() {
  const custom = Storage.getCustomCurrencies();
  AppState.allCurrencies = [...window.BUILTIN_CURRENCIES, ...custom];
}

// ═══════════ Input Mode Switch ═══════════
function switchInputMode(mode) {
  AppState.inputMode = mode;
  document.querySelectorAll("#modeSwitch .mode-switch__btn").forEach(btn => {
    btn.classList.toggle("mode-switch__btn--active", btn.dataset.mode === mode);
  });
  document.getElementById("singleModeFields").style.display = mode === "single" ? "grid" : "none";
  document.getElementById("totalModeFields").style.display = mode === "total" ? "grid" : "none";

  // In total mode, hide the separate cache hit rate field (it's computed from totals)
  document.getElementById("cacheHitRateItem").style.display = mode === "total" ? "none" : "";

  triggerCalculate();
}

// ═══════════ Cache Calculator ═══════════
function toggleCacheCalc() {
  const panel = document.getElementById("cacheCalcPanel");
  const toggle = document.getElementById("cacheCalcToggle");
  const isVisible = panel.style.display !== "none";
  panel.style.display = isVisible ? "none" : "block";
  toggle.classList.toggle("cache-calc-toggle--active", !isVisible);
}

function updateCacheCalcResult() {
  const hit  = Math.max(0, parseInt(document.getElementById("calcCacheHit").value) || 0);
  const miss = Math.max(0, parseInt(document.getElementById("calcCacheMiss").value) || 0);
  const total = hit + miss;
  if (total > 0) {
    const rate = (hit / total * 100).toFixed(1);
    document.getElementById("calcCacheResult").textContent = rate + "%";
  } else {
    document.getElementById("calcCacheResult").textContent = "—";
  }
}

function applyCacheRate() {
  const hit  = Math.max(0, parseInt(document.getElementById("calcCacheHit").value) || 0);
  const miss = Math.max(0, parseInt(document.getElementById("calcCacheMiss").value) || 0);
  const total = hit + miss;
  if (total > 0) {
    const rate = (hit / total * 100).toFixed(1);
    document.getElementById("cacheHitRate").value = rate;
    toggleCacheCalc();
    triggerCalculate();
    Renderer.toast(`缓存命中率已设为 ${rate}%`, "success", 2000);
  } else {
    Renderer.toast("请输入命中和未命中 Token 数", "warning");
  }
}

// ═══════════ Calculate ═══════════
function triggerCalculate() {
  const params = getParams();
  const model  = AppState.allModels.find(m => m.id === AppState.selectedModelId);

  if (model) {
    Renderer.renderTierCard(model.pricing, params.inputTokens, params.outputTokens);
    const result = Calculator.calculate(params, model.pricing, model.currency, AppState.allCurrencies);
    Renderer.renderResults(result, model);

    Storage.savePreferences({ lastParams: {
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      cacheHitRate: params.cacheHitRate * 100,
      dailyCalls:   params.dailyCalls,
    }});
  }

  if (AppState.compareModelIds.length > 0) {
    const compareModels = AppState.compareModelIds
      .map(id => AppState.allModels.find(m => m.id === id))
      .filter(Boolean);
    const batchResults = Calculator.calculateBatch(compareModels, params, AppState.allCurrencies);
    Renderer.renderCompareTable(batchResults, AppState.compareModelIds);
  }
}

// ═══════════ Select Model ═══════════
function selectModel(modelId) {
  AppState.selectedModelId = modelId;
  Storage.saveSelectedModel(modelId);

  const model = AppState.allModels.find(m => m.id === modelId);
  if (!model) return;

  Renderer.renderModelBanner(model);
  Renderer.renderModelList(AppState.allModels, modelId, AppState.searchQuery);
  triggerCalculate();
}

// ═══════════ Theme ═══════════
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  Storage.savePreferences({ theme });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// ═══════════ Exchange Rate ═══════════
async function initExchangeRate() {
  try {
    const { rate, source, displayDate } = await Exchange.getUSDtoCNY();
    AppState.exchangeRate = rate;
    document.getElementById("usdToCny").value = rate.toFixed(4);
    Renderer.renderExchangeBadge(rate, source, displayDate);

    if (source === "api") {
      Renderer.toast("已写入今日汇率缓存", "success", 2000);
    } else if (source === "stale") {
      Renderer.toast("实时汇率获取失败，已使用旧缓存", "warning");
    } else if (source === "default") {
      Renderer.toast("无法获取实时汇率，使用默认值", "warning");
    }
  } catch {
    Renderer.renderExchangeBadge(7.25, "default", Exchange.formatDisplayDate(Date.now()));
  }
  triggerCalculate();
}

// ═══════════ Model Modal ═══════════
function openModelModal(existingModel = null) {
  const overlay = document.getElementById("modelModalOverlay");
  const title   = document.getElementById("modalTitle");
  const form    = document.getElementById("modelForm");

  title.textContent = existingModel ? "编辑模型" : "添加自定义模型";
  form.reset();
  // Clear all tier row containers
  ["fm-tier-by-input-rows", "fm-tier-by-output-rows"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // Populate currency select
  const currencySelect = document.getElementById("fm-currency");
  currencySelect.innerHTML = AppState.allCurrencies.map(c =>
    `<option value="${c.code}">${c.code} — ${c.name}</option>`
  ).join('') + `<option value="__add__">＋ 添加新币种...</option>`;

  if (existingModel) {
    document.getElementById("fm-name").value     = existingModel.name;
    document.getElementById("fm-provider").value = existingModel.provider;
    currencySelect.value = existingModel.currency;
    document.getElementById("fm-type").value     = existingModel.pricing.type;

    const p = existingModel.pricing;

    if (p.type === "standard") {
      document.getElementById("fm-input").value    = p.input || "";
      document.getElementById("fm-cacheHit").value = p.cacheHit ?? "";
      document.getElementById("fm-output").value   = p.output || "";

    } else if (p.type === "tiered_by_input") {
      (p.tiers || []).forEach(tier => {
        const maxLabel = tier.maxInputTokens === Infinity ? "" : tier.maxInputTokens;
        addTierRow("fm-tier-by-input-rows", "by-input", maxLabel, tier.input, tier.cacheHit, tier.output);
      });

    } else if (p.type === "tiered_by_output") {
      (p.tiers || []).forEach(tier => {
        const maxLabel = tier.maxOutputTokens === Infinity ? "" : tier.maxOutputTokens;
        addTierRow("fm-tier-by-output-rows", "by-output", maxLabel, tier.input, tier.cacheHit, tier.output);
      });
    }

    form.dataset.editId = existingModel.id;
  } else {
    delete form.dataset.editId;
  }

  togglePricingSection(document.getElementById("fm-type").value);
  overlay.style.display = "flex";
}

function closeModelModal() {
  document.getElementById("modelModalOverlay").style.display = "none";
}

function togglePricingSection(type) {
  const mapping = {
    "standard":         "fm-standard-section",
    "tiered_by_input":  "fm-tier-by-input-section",
    "tiered_by_output": "fm-tier-by-output-section",
  };
  Object.entries(mapping).forEach(([t, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = type === t ? "block" : "none";
  });
}

let tierRowCounter = 0;
/**
 * Add a tier row containing threshold + input/output/cacheHit prices.
 * @param {string} containerId
 * @param {"by-input"|"by-output"} tierType  what determines this tier
 * @param {string|number} maxVal             max token threshold (empty = ∞)
 * @param {string|number} inputPrice
 * @param {string|number|null} cacheHitVal
 * @param {string|number} outputPrice
 */
function addTierRow(containerId, tierType, maxVal = "", inputPrice = "", cacheHitVal = null, outputPrice = "") {
  const container = document.getElementById(containerId);
  const idx = tierRowCounter++;
  const row = document.createElement("div");
  row.className = "tier-input-row";
  row.dataset.tierType = tierType;

  const thresholdLabel = tierType === "by-input" ? "输入" : "输出";
  row.innerHTML = `
    <span>${thresholdLabel} ≤</span>
    <input type="text"   name="tier-max-${idx}"    placeholder="留空=∞" value="${maxVal}" style="width:84px;" />
    <span>tokens →</span>
    <span>输入</span>
    <input type="number" name="tier-input-${idx}"  placeholder="1.25"   min="0" step="0.001" value="${inputPrice}"  style="width:70px;" />
    <span>输出</span>
    <input type="number" name="tier-output-${idx}" placeholder="10.00"  min="0" step="0.001" value="${outputPrice}" style="width:70px;" />
    <span>缓存</span>
    <input type="number" name="tier-cache-${idx}"  placeholder="0.31"   min="0" step="0.001" value="${cacheHitVal ?? ""}" style="width:70px;" />
    <span>/ M</span>
    <button type="button" class="icon-btn icon-btn--danger tier-remove-btn">
      <i data-lucide="x"></i>
    </button>`;

  container.appendChild(row);
  lucide.createIcons();
  row.querySelector(".tier-remove-btn").addEventListener("click", () => row.remove());
}

/**
 * Parse tier rows from a container into an array of tier objects.
 * @param {string} containerId
 * @param {"by-input"|"by-output"} tierType
 */
function parseTierRows(containerId, tierType) {
  const rows = document.querySelectorAll(`#${containerId} .tier-input-row`);
  const tiers = [];

  const parseMax = (str) =>
    (!str || str === "∞" || str.toLowerCase() === "infinity")
      ? Infinity
      : parseFloat(str);

  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    const maxVal = parseMax(inputs[0]?.value?.trim());
    if (isNaN(maxVal)) return;

    const inputPrice  = parseFloat(inputs[1]?.value);
    const outputPrice = parseFloat(inputs[2]?.value);
    const cacheStr    = inputs[3]?.value?.trim();
    const cacheHit    = cacheStr ? parseFloat(cacheStr) : null;
    if (isNaN(inputPrice) || isNaN(outputPrice)) return;

    const tier = { input: inputPrice, output: outputPrice, cacheHit };
    if (tierType === "by-input") tier.maxInputTokens  = maxVal;
    else                         tier.maxOutputTokens = maxVal;
    tiers.push(tier);
  });

  const sortKey = tierType === "by-input" ? "maxInputTokens" : "maxOutputTokens";
  tiers.sort((a, b) => a[sortKey] - b[sortKey]);
  return tiers;
}

function handleModelFormSubmit(e) {
  e.preventDefault();

  const type     = document.getElementById("fm-type").value;
  const name     = document.getElementById("fm-name").value.trim();
  const provider = document.getElementById("fm-provider").value.trim();
  const currency = document.getElementById("fm-currency").value;

  if (!name || !provider || currency === "__add__") {
    Renderer.toast("请填写所有必填项", "error");
    return;
  }

  let pricing = {};

  if (type === "standard") {
    pricing = {
      type: "standard",
      input:    parseFloat(document.getElementById("fm-input").value)    || 0,
      output:   parseFloat(document.getElementById("fm-output").value)   || 0,
      cacheHit: document.getElementById("fm-cacheHit").value ? parseFloat(document.getElementById("fm-cacheHit").value) : null,
    };
  } else if (type === "tiered_by_input") {
    pricing = {
      type: "tiered_by_input",
      tiers: parseTierRows("fm-tier-by-input-rows", "by-input"),
    };
  } else if (type === "tiered_by_output") {
    pricing = {
      type: "tiered_by_output",
      tiers: parseTierRows("fm-tier-by-output-rows", "by-output"),
    };
  }

  if (pricing.tiers && pricing.tiers.length === 0) {
    Renderer.toast("请至少添加一个阶梯档位", "error");
    return;
  }

  const form   = document.getElementById("modelForm");
  const editId = form.dataset.editId;

  const model = {
    id:       editId || "custom_" + Date.now(),
    name, provider, currency,
    pricing,
    isCustom: true,
  };

  Storage.saveCustomModel(model);
  refreshAllModels();
  Renderer.renderModelList(AppState.allModels, AppState.selectedModelId, AppState.searchQuery);
  closeModelModal();
  Renderer.toast(`模型「${name}」已保存`, "success");
  triggerCalculate();
}

// ═══════════ Currency Modal ═══════════
function openCurrencyModal() {
  refreshAllCurrencies();
  Renderer.renderCurrencyList(AppState.allCurrencies);
  document.getElementById("currencyModalOverlay").style.display = "flex";
}

function closeCurrencyModal() {
  document.getElementById("currencyModalOverlay").style.display = "none";
}

function handleAddCurrency() {
  const code = document.getElementById("newCurrencyCode").value.trim().toUpperCase();
  const name = document.getElementById("newCurrencyName").value.trim();
  const rate = parseFloat(document.getElementById("newCurrencyRate").value);

  if (!code || !name || isNaN(rate) || rate <= 0) {
    Renderer.toast("请填写完整的币种信息", "error");
    return;
  }

  if (code.length > 5) {
    Renderer.toast("币种代码最多5个字符", "error");
    return;
  }

  Storage.saveCustomCurrency({ code, name, symbol: code, toCny: rate });
  refreshAllCurrencies();
  Renderer.renderCurrencyList(AppState.allCurrencies);
  Renderer.toast(`币种「${code}」已添加`, "success");

  // Reset inputs
  document.getElementById("newCurrencyCode").value = "";
  document.getElementById("newCurrencyName").value = "";
  document.getElementById("newCurrencyRate").value = "";
}

// ═══════════ Compare Model Picker ═══════════
let tempCompareIds = [];

function openComparePicker() {
  tempCompareIds = [...AppState.compareModelIds];
  Renderer.renderComparePickerList(AppState.allModels, tempCompareIds);
  document.getElementById("comparePickerOverlay").style.display = "flex";
}

function closeComparePicker() {
  document.getElementById("comparePickerOverlay").style.display = "none";
}

function toggleCompareModel(modelId) {
  const idx = tempCompareIds.indexOf(modelId);
  if (idx >= 0) {
    tempCompareIds.splice(idx, 1);
  } else {
    if (tempCompareIds.length >= 5) {
      Renderer.toast("对比列表最多 5 个模型", "warning");
      return;
    }
    tempCompareIds.push(modelId);
  }
  const searchVal = document.getElementById("compareSearchInput").value;
  Renderer.renderComparePickerList(AppState.allModels, tempCompareIds, searchVal);
}

function confirmCompare() {
  AppState.compareModelIds = [...tempCompareIds];
  Storage.saveCompareList(AppState.compareModelIds);
  closeComparePicker();
  triggerCalculate();

  if (AppState.compareModelIds.length === 0) {
    document.getElementById("compareTableWrap").innerHTML = `
      <div class="compare-empty">
        <i data-lucide="git-compare"></i>
        <span>右键模型 → "加入对比"，或点击上方按钮</span>
      </div>`;
    lucide.createIcons();
  }
}

// ═══════════ Manage Custom Models ═══════════
function openManageModals() {
  const custom = Storage.getCustomModels();
  Renderer.renderManageModelsList(custom);
  document.getElementById("manageModalOverlay").style.display = "flex";
}

function closeManageModal() {
  document.getElementById("manageModalOverlay").style.display = "none";
}

// ═══════════ Context Menu ═══════════
function showModelContextMenu(event, model) {
  document.querySelector(".context-menu")?.remove();

  const menu = document.createElement("div");
  menu.className = "context-menu";

  // Position: keep in viewport
  let x = event.clientX;
  let y = event.clientY;
  menu.style.cssText = `left:${x}px; top:${y}px;`;

  menu.innerHTML = `
    <div class="context-menu__item" data-action="select">
      <i data-lucide="check-circle"></i> 选中此模型
    </div>
    <div class="context-menu__item" data-action="compare">
      <i data-lucide="git-compare"></i> 加入对比
    </div>
    ${model.isCustom ? `
    <div class="context-menu__divider"></div>
    <div class="context-menu__item" data-action="edit">
      <i data-lucide="edit-2"></i> 编辑
    </div>
    <div class="context-menu__item context-menu__item--danger" data-action="delete">
      <i data-lucide="trash-2"></i> 删除
    </div>` : ''}
  `;

  document.body.appendChild(menu);
  lucide.createIcons();

  // Adjust position if off-screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + "px";

  menu.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "select") {
      selectModel(model.id);
    } else if (action === "compare") {
      if (AppState.compareModelIds.length >= 5) {
        Renderer.toast("对比列表最多 5 个模型", "warning");
      } else if (!AppState.compareModelIds.includes(model.id)) {
        AppState.compareModelIds.push(model.id);
        Storage.saveCompareList(AppState.compareModelIds);
        triggerCalculate();
        Renderer.toast(`「${model.name}」已加入对比`, "success");
      } else {
        Renderer.toast("该模型已在对比列表中", "info");
      }
    } else if (action === "edit") {
      openModelModal(model);
    } else if (action === "delete") {
      if (confirm(`确定删除自定义模型「${model.name}」吗？`)) {
        Storage.deleteCustomModel(model.id);
        AppState.compareModelIds = AppState.compareModelIds.filter(id => id !== model.id);
        Storage.saveCompareList(AppState.compareModelIds);
        refreshAllModels();
        Renderer.renderModelList(AppState.allModels, AppState.selectedModelId, AppState.searchQuery);
        if (AppState.selectedModelId === model.id) {
          AppState.selectedModelId = null;
          Renderer.renderResults(null);
        }
        Renderer.toast(`「${model.name}」已删除`, "success");
        triggerCalculate();
      }
    }
    menu.remove();
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", function handler() {
      menu.remove();
      document.removeEventListener("click", handler);
    }, { once: true });
  }, 10);
}

// ═══════════ Mobile Sidebar ═══════════
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  sidebar.classList.toggle("sidebar--open");
  backdrop.classList.toggle("sidebar-backdrop--show");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("sidebar--open");
  document.getElementById("sidebarBackdrop").classList.remove("sidebar-backdrop--show");
}

// ═══════════ PWA Install ═══════════
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById("installPwaBtn").style.display = "inline-flex";
});

// ═══════════ Event Binding ═══════════
function bindEvents() {
  // Theme
  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);

  // Param inputs: debounced calculation
  const paramInputIds = ["inputTokens", "outputTokens", "cacheHitRate", "dailyCalls", "usdToCny",
                         "totalCachedTokens", "totalUncachedTokens", "totalOutputTokens", "totalCalls"];
  let debounceTimer = null;
  paramInputIds.forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerCalculate, 250);
    });
  });

  // Mode switch
  document.getElementById("modeSwitch").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn) switchInputMode(btn.dataset.mode);
  });

  // Cache calculator
  document.getElementById("cacheCalcToggle").addEventListener("click", toggleCacheCalc);
  document.getElementById("calcCacheHit").addEventListener("input", updateCacheCalcResult);
  document.getElementById("calcCacheMiss").addEventListener("input", updateCacheCalcResult);
  document.getElementById("applyCacheRateBtn").addEventListener("click", applyCacheRate);

  // Model search
  document.getElementById("modelSearchInput").addEventListener("input", (e) => {
    AppState.searchQuery = e.target.value;
    Renderer.renderModelList(AppState.allModels, AppState.selectedModelId, AppState.searchQuery);
  });

  // Click model (event delegation)
  document.getElementById("modelList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-model-id]");
    if (item) {
      selectModel(item.dataset.modelId);
      closeSidebar(); // Auto close on mobile
      return;
    }
    const groupHeader = e.target.closest("[data-group]");
    if (groupHeader) {
      groupHeader.parentElement.classList.toggle("model-group--collapsed");
    }
  });

  // Right-click model
  document.getElementById("modelList").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const item = e.target.closest("[data-model-id]");
    if (!item) return;
    const model = AppState.allModels.find(m => m.id === item.dataset.modelId);
    if (model) showModelContextMenu(e, model);
  });

  // Add model button
  document.getElementById("addModelBtn").addEventListener("click", () => openModelModal());
  document.getElementById("modalCloseBtn").addEventListener("click", closeModelModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModelModal);

  // Pricing type toggle
  document.getElementById("fm-type").addEventListener("change", (e) => {
    togglePricingSection(e.target.value);
  });

  // Add tier row buttons (generic, using data attributes)
  document.querySelectorAll(".fm-add-tier-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tierTarget;
      const type = btn.dataset.tierType || "output";
      addTierRow(target, type);
    });
  });

  // Form submit
  document.getElementById("modelForm").addEventListener("submit", handleModelFormSubmit);

  // Currency select: add new
  document.getElementById("fm-currency").addEventListener("change", (e) => {
    if (e.target.value === "__add__") {
      closeModelModal();
      openCurrencyModal();
    }
  });

  // Currency modal
  document.getElementById("manageCurrencyBtn").addEventListener("click", openCurrencyModal);
  document.getElementById("addCurrencyBtn").addEventListener("click", handleAddCurrency);
  document.getElementById("currencyModalCloseBtn").addEventListener("click", closeCurrencyModal);
  document.getElementById("currencyModalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCurrencyModal();
  });

  // Currency list: delete
  document.getElementById("currencyList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-currency]");
    if (btn) {
      const code = btn.dataset.deleteCurrency;
      Storage.deleteCustomCurrency(code);
      refreshAllCurrencies();
      Renderer.renderCurrencyList(AppState.allCurrencies);
      Renderer.toast(`币种「${code}」已删除`, "success");
    }
  });

  // Manage custom models
  document.getElementById("manageModelsBtn").addEventListener("click", openManageModals);
  document.getElementById("manageModalCloseBtn").addEventListener("click", closeManageModal);
  document.getElementById("manageModalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeManageModal();
  });

  // Manage modal: edit/delete delegation
  document.getElementById("manageModalBody").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-model]");
    if (editBtn) {
      const model = AppState.allModels.find(m => m.id === editBtn.dataset.editModel);
      if (model) {
        closeManageModal();
        openModelModal(model);
      }
      return;
    }
    const deleteBtn = e.target.closest("[data-delete-model]");
    if (deleteBtn) {
      const modelId = deleteBtn.dataset.deleteModel;
      const model = AppState.allModels.find(m => m.id === modelId);
      if (model && confirm(`确定删除「${model.name}」吗？`)) {
        Storage.deleteCustomModel(modelId);
        AppState.compareModelIds = AppState.compareModelIds.filter(id => id !== modelId);
        Storage.saveCompareList(AppState.compareModelIds);
        refreshAllModels();
        Renderer.renderManageModelsList(Storage.getCustomModels());
        Renderer.renderModelList(AppState.allModels, AppState.selectedModelId, AppState.searchQuery);
        if (AppState.selectedModelId === modelId) {
          AppState.selectedModelId = null;
          Renderer.renderResults(null);
        }
        Renderer.toast(`已删除`, "success");
        triggerCalculate();
      }
    }
  });

  // Compare section toggle
  document.getElementById("compareToggle").addEventListener("click", () => {
    AppState.compareExpanded = !AppState.compareExpanded;
    document.getElementById("compareContent").style.display = AppState.compareExpanded ? "block" : "none";
    const collapseIcon = document.querySelector("#compareCollapseBtn [data-lucide]");
    if (collapseIcon) {
      collapseIcon.dataset.lucide = AppState.compareExpanded ? "chevron-up" : "chevron-down";
      lucide.createIcons();
    }
  });

  // Compare: add via picker
  document.getElementById("addCompareBtn").addEventListener("click", openComparePicker);
  document.getElementById("comparePickerCloseBtn").addEventListener("click", closeComparePicker);
  document.getElementById("comparePickerOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeComparePicker();
  });
  document.getElementById("comparePickerList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-picker-id]");
    if (item) toggleCompareModel(item.dataset.pickerId);
  });
  document.getElementById("compareSearchInput").addEventListener("input", (e) => {
    Renderer.renderComparePickerList(AppState.allModels, tempCompareIds, e.target.value);
  });
  document.getElementById("confirmCompareBtn").addEventListener("click", confirmCompare);
  document.getElementById("clearCompareBtn").addEventListener("click", () => {
    tempCompareIds = [];
    const searchVal = document.getElementById("compareSearchInput").value;
    Renderer.renderComparePickerList(AppState.allModels, tempCompareIds, searchVal);
  });

  // Compare table: remove single model
  document.getElementById("compareTableWrap").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-compare]");
    if (btn) {
      const modelId = btn.dataset.removeCompare;
      AppState.compareModelIds = AppState.compareModelIds.filter(id => id !== modelId);
      Storage.saveCompareList(AppState.compareModelIds);
      triggerCalculate();
      if (AppState.compareModelIds.length === 0) {
        document.getElementById("compareTableWrap").innerHTML = `
          <div class="compare-empty">
            <i data-lucide="git-compare"></i>
            <span>右键模型 → "加入对比"，或点击上方按钮</span>
          </div>`;
        lucide.createIcons();
      }
    }
  });

  // Banner: add to compare
  document.getElementById("bannerCompareBtn").addEventListener("click", () => {
    const modelId = AppState.selectedModelId;
    if (!modelId) return;
    const model = AppState.allModels.find(m => m.id === modelId);
    if (!model) return;
    if (AppState.compareModelIds.length >= 5) {
      Renderer.toast("对比列表最多 5 个模型", "warning");
    } else if (!AppState.compareModelIds.includes(modelId)) {
      AppState.compareModelIds.push(modelId);
      Storage.saveCompareList(AppState.compareModelIds);
      triggerCalculate();
      Renderer.toast(`「${model.name}」已加入对比`, "success");
    } else {
      Renderer.toast("该模型已在对比列表中", "info");
    }
  });

  // Mobile sidebar toggle
  document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar);
  document.getElementById("sidebarBackdrop").addEventListener("click", closeSidebar);

  // PWA install
  document.getElementById("installPwaBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      document.getElementById("installPwaBtn").style.display = "none";
      Renderer.toast("应用已安装", "success");
    }
    deferredInstallPrompt = null;
  });

  // Import / Export
  document.getElementById("exportBtn")?.addEventListener("click", exportCustomModels);
  document.getElementById("importBtn")?.addEventListener("click", () => document.getElementById("importFileInput")?.click());
  document.getElementById("importFileInput")?.addEventListener("change", handleImportFile);

  // Keyboard: Escape closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModelModal();
      closeCurrencyModal();
      closeComparePicker();
      closeManageModal();
      closeSidebar();
      document.querySelector(".context-menu")?.remove();
    }
  });
}

// ═══════════ Import / Export ═══════════
function exportCustomModels() {
  const customModels = Storage.getCustomModels();
  const customCurrencies = Storage.getCustomCurrencies();
  const data = {
    version: 1,
    models: customModels,
    currencies: customCurrencies,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tokenlens_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Renderer.toast("导出成功", "success");
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let importedModels = 0;
      let importedCurrencies = 0;

      // Handle raw models array (old format) or the new unified format
      const modelsToImport = Array.isArray(data) ? data : (data.models || []);
      const currenciesToImport = data.currencies || [];

      modelsToImport.forEach(model => {
        if (model.name && model.provider && model.pricing) {
          Storage.saveCustomModel(model);
          importedModels++;
        }
      });

      currenciesToImport.forEach(currency => {
        if (currency.code && currency.name && currency.toCny !== undefined) {
          Storage.saveCustomCurrency(currency);
          importedCurrencies++;
        }
      });

      refreshAllModels();
      refreshAllCurrencies();
      Renderer.renderModelList(AppState.allModels, AppState.selectedModelId, AppState.searchQuery);
      triggerCalculate();
      
      Renderer.toast(`成功导入 ${importedModels} 个模型，${importedCurrencies} 个币种`, "success");
    } catch (err) {
      Renderer.toast("导入失败：文件格式错误", "error");
    }
    // reset input
    event.target.value = "";
  };
  reader.readAsText(file);
}

// ═══════════ Init ═══════════
async function init() {
  // 1. Restore theme
  const prefs = Storage.getPreferences();
  applyTheme(prefs.theme ?? "light");

  // 2. Restore last params
  const lp = prefs.lastParams ?? {};
  if (lp.inputTokens !== undefined)  document.getElementById("inputTokens").value  = lp.inputTokens;
  if (lp.outputTokens !== undefined) document.getElementById("outputTokens").value = lp.outputTokens;
  if (lp.cacheHitRate !== undefined) document.getElementById("cacheHitRate").value = lp.cacheHitRate;
  if (lp.dailyCalls !== undefined)   document.getElementById("dailyCalls").value   = lp.dailyCalls;

  // 3. Merge data
  refreshAllModels();
  refreshAllCurrencies();

  // 4. Render sidebar
  const lastModelId = Storage.getSelectedModel();
  Renderer.renderModelList(AppState.allModels, lastModelId);

  // 5. Bind events first (so UI is responsive while fetching rate)
  bindEvents();

  // 6. Exchange rate (async)
  await initExchangeRate();

  // 7. Restore selected model
  if (lastModelId && AppState.allModels.find(m => m.id === lastModelId)) {
    selectModel(lastModelId);
  }

  // 8. Restore compare list
  AppState.compareModelIds = Storage.getCompareList();
  if (AppState.compareModelIds.length > 0) {
    triggerCalculate();
  }

  // 9. Register Service Worker
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (err) {
      console.warn("[PWA] SW registration failed:", err);
    }
  }

  // 10. Init icons
  lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", init);
