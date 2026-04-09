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
};

// ═══════════ Helpers ═══════════
function getParams() {
  return {
    inputTokens:  Math.max(0, parseInt(document.getElementById("inputTokens").value)  || 0),
    outputTokens: Math.max(0, parseInt(document.getElementById("outputTokens").value) || 0),
    cacheHitRate: Math.min(1, Math.max(0, (parseFloat(document.getElementById("cacheHitRate").value) || 0) / 100)),
    dailyCalls:   Math.max(0, parseInt(document.getElementById("dailyCalls").value)   || 0),
    usdToCny:     parseFloat(document.getElementById("usdToCny").value)   || 7.25,
  };
}

function refreshAllModels() {
  const custom = Storage.getCustomModels();
  // Restore Infinity in tiered models from localStorage (JSON serializes Infinity as null)
  custom.forEach(m => {
    if (m.pricing?.outputTiers) {
      m.pricing.outputTiers.forEach(t => {
        if (t.maxOutputTokens === null || t.maxOutputTokens === undefined) {
          t.maxOutputTokens = Infinity;
        }
      });
    }
  });
  AppState.allModels = [...window.BUILTIN_MODELS, ...custom];
}

function refreshAllCurrencies() {
  const custom = Storage.getCustomCurrencies();
  AppState.allCurrencies = [...window.BUILTIN_CURRENCIES, ...custom];
}

// ═══════════ Calculate ═══════════
function triggerCalculate() {
  const params = getParams();
  const model  = AppState.allModels.find(m => m.id === AppState.selectedModelId);

  if (model) {
    Renderer.renderTierCard(model.pricing, params.outputTokens);
    const result = Calculator.calculate(params, model.pricing, model.currency, AppState.allCurrencies);
    Renderer.renderResults(result);

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
  document.getElementById("fm-tier-rows").innerHTML = "";

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

    if (existingModel.pricing.type === "standard") {
      document.getElementById("fm-input").value    = existingModel.pricing.input || "";
      document.getElementById("fm-cacheHit").value = existingModel.pricing.cacheHit ?? "";
      document.getElementById("fm-output").value   = existingModel.pricing.output || "";
    } else {
      document.getElementById("fm-tier-input").value    = existingModel.pricing.input || "";
      document.getElementById("fm-tier-cacheHit").value = existingModel.pricing.cacheHit ?? "";
      // Restore tier rows
      const tiers = existingModel.pricing.outputTiers || [];
      tiers.forEach((tier, idx) => {
        if (tier.maxOutputTokens !== Infinity) {
          addTierRow(tier.maxOutputTokens, tier.price);
        } else {
          // Last tier: add with empty max (means Infinity)
          addTierRow("∞", tier.price);
        }
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
  document.getElementById("fm-standard-section").style.display = type === "standard" ? "block" : "none";
  document.getElementById("fm-tier-section").style.display = type === "tiered_output" ? "block" : "none";
}

let tierRowCounter = 0;
function addTierRow(maxVal = "", price = "") {
  const container = document.getElementById("fm-tier-rows");
  const idx = tierRowCounter++;
  const row = document.createElement("div");
  row.className = "tier-input-row";
  row.innerHTML = `
    <span>输出 ≤</span>
    <input type="text" name="tier-max-${idx}" placeholder="200 或 ∞" value="${maxVal}" style="width:70px;" />
    <span>tokens →</span>
    <input type="number" name="tier-price-${idx}" placeholder="5.00" min="0" step="0.001" value="${price}" style="width:80px;" />
    <span>/ M</span>
    <button type="button" class="icon-btn icon-btn--danger tier-remove-btn">
      <i data-lucide="x"></i>
    </button>`;
  container.appendChild(row);
  lucide.createIcons();

  row.querySelector(".tier-remove-btn").addEventListener("click", () => row.remove());
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
  } else {
    const tierRows = document.querySelectorAll("#fm-tier-rows .tier-input-row");
    const outputTiers = [];
    tierRows.forEach(row => {
      const inputs = row.querySelectorAll("input");
      const maxStr = inputs[0]?.value?.trim();
      const price  = parseFloat(inputs[1]?.value);
      if (maxStr && !isNaN(price)) {
        const maxVal = (maxStr === "∞" || maxStr.toLowerCase() === "infinity" || maxStr === "")
          ? Infinity
          : parseFloat(maxStr);
        if (!isNaN(maxVal)) {
          outputTiers.push({ maxOutputTokens: maxVal, price });
        }
      }
    });

    // Sort tiers by maxOutputTokens
    outputTiers.sort((a, b) => a.maxOutputTokens - b.maxOutputTokens);

    // Ensure last tier is Infinity
    if (outputTiers.length > 0 && outputTiers.at(-1).maxOutputTokens !== Infinity) {
      // last tier already—do nothing if user intended finite
    }

    pricing = {
      type: "tiered_output",
      input:    parseFloat(document.getElementById("fm-tier-input").value)    || 0,
      cacheHit: document.getElementById("fm-tier-cacheHit").value ? parseFloat(document.getElementById("fm-tier-cacheHit").value) : null,
      outputTiers,
    };
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
  const paramInputIds = ["inputTokens", "outputTokens", "cacheHitRate", "dailyCalls", "usdToCny"];
  let debounceTimer = null;
  paramInputIds.forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerCalculate, 250);
    });
  });

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
  document.getElementById("modelModalOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModelModal();
  });

  // Pricing type toggle
  document.getElementById("fm-type").addEventListener("change", (e) => {
    togglePricingSection(e.target.value);
  });

  // Add tier row
  document.getElementById("addTierRowBtn").addEventListener("click", () => addTierRow());

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
