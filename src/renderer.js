// src/renderer.js
"use strict";

const Renderer = (() => {

  // ── Formatters ──
  function fmtUSD(val) {
    if (isNaN(val) || val === null || val === undefined) return "—";
    if (val === 0) return "$0.00";
    if (val < 0.000001) return "< $0.000001";
    return "$" + val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: val < 0.01 ? 6 : 4,
    });
  }

  function fmtCNY(val) {
    if (isNaN(val) || val === null || val === undefined) return "—";
    if (val === 0) return "¥0.00";
    if (val < 0.000001) return "< ¥0.000001";
    return "¥" + val.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: val < 0.01 ? 6 : 4,
    });
  }

  // ── Model List (Sidebar) ──
  function renderModelList(allModels, selectedModelId, searchQuery = "") {
    const container = document.getElementById("modelList");
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? allModels.filter(m =>
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
        )
      : allModels;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="sidebar-empty">
          <i data-lucide="search-x"></i>
          <span>未找到匹配模型</span>
        </div>`;
      lucide.createIcons();
      return;
    }

    const groups = {};
    filtered.forEach(model => {
      if (!groups[model.provider]) groups[model.provider] = [];
      groups[model.provider].push(model);
    });

    const html = Object.entries(groups).map(([provider, models]) => `
      <div class="model-group">
        <div class="model-group__header" data-group="${provider}">
          <i data-lucide="chevron-down" class="group-arrow"></i>
          <span>${provider}</span>
          <span class="model-group__count">${models.length}</span>
        </div>
        <div class="model-group__items">
          ${models.map(model => `
            <div class="model-item ${model.id === selectedModelId ? 'model-item--active' : ''}"
                 data-model-id="${model.id}">
              <span class="model-item__name">${model.name}</span>
              <div class="model-item__badges">
                ${model.pricing.type !== 'standard' ? `
                  <span class="badge badge--tier" title="阶梯定价"><i data-lucide="layers"></i></span>` : ''}
                <span class="badge badge--currency">${model.currency}</span>
                ${model.isCustom ? `<span class="badge badge--custom">自定义</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    lucide.createIcons();
  }

  // ── Model Banner ──
  function renderModelBanner(model) {
    document.getElementById("bannerProvider").textContent = model.provider;
    document.getElementById("bannerName").textContent = model.name;

    const currBadge = document.getElementById("bannerCurrency");
    currBadge.textContent = model.currency;

    const tierBadge = document.getElementById("bannerTierBadge");
    tierBadge.style.display = model.pricing.type !== "standard" ? "inline-flex" : "none";

    document.getElementById("bannerCompareBtn").style.display = "inline-flex";
  }

  // ── Tier Card ──
  // Renders the "current tier" panel for any non-standard pricing model.
  // Each render branch is keyed to the pricing.type so the UI labels match
  // exactly what the calculator is using.
  function renderTierCard(pricing, inputTokens, outputTokens) {
    const card = document.getElementById("tierCard");
    const rows = document.getElementById("tierCardRows");

    if (!pricing || pricing.type === "standard") {
      card.style.display = "none";
      return;
    }

    card.style.display = "block";

    // Build "range label" for a tier given its index, threshold key, and label prefix
    const rangeLabel = (tier, idx, list, key, prefix) => {
      const cur  = tier[key];
      const prev = idx > 0 ? list[idx - 1][key] : 0;
      if (cur === Infinity) return `${prefix} > ${prev.toLocaleString()} tokens`;
      if (idx === 0)        return `${prefix} ≤ ${cur.toLocaleString()} tokens`;
      return `${prefix} ${(prev + 1).toLocaleString()} ~ ${cur.toLocaleString()} tokens`;
    };

    const isInRange = (tier, idx, list, key, tokens) => {
      const prev = idx > 0 ? list[idx - 1][key] : 0;
      return tokens <= tier[key] && (idx === 0 || tokens > prev);
    };

    let html = `
      <div class="tier-table-header" style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); padding: 0 12px 6px; border-bottom: 1px dashed rgba(245,158,11,0.2); margin-bottom: 8px;">
        <span>Token 用量范围（决定档位的那一侧）</span>
        <span>单价（/ 百万 tokens）</span>
      </div>
    `;

    // ── tiered_by_input / tiered_by_output ──
    //   每档同时给出 input / output / cacheHit 三个单价
    if (pricing.type === "tiered_by_input" || pricing.type === "tiered_by_output") {
      const byInput = pricing.type === "tiered_by_input";
      const key     = byInput ? "maxInputTokens"  : "maxOutputTokens";
      const prefix  = byInput ? "输入"            : "输出";
      const tokens  = byInput ? inputTokens       : outputTokens;
      const list    = pricing.tiers || [];

      html += `<div class="tier-section-label">${byInput ? "按输入长度分档" : "按输出长度分档"}（input / output / cache 一起跟随）：</div>`;
      html += list.map((tier, idx) => {
        const active = isInRange(tier, idx, list, key, tokens);
        const label  = rangeLabel(tier, idx, list, key, prefix);
        const cache  = tier.cacheHit != null ? ` · 缓存 ${tier.cacheHit.toFixed(3)}` : '';
        return `
          <div class="tier-row ${active ? 'tier-row--active' : ''}">
            <div class="tier-row__label">
              ${active ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>'}
              ${label}
            </div>
            <div class="tier-row__price">
              输入 ${Number(tier.input ?? 0).toFixed(2)} · 输出 ${Number(tier.output ?? 0).toFixed(2)}${cache} / M
              ${active ? '<span class="tier-row__current">当前档</span>' : ''}
            </div>
          </div>`;
      }).join('');
    }

    // ── Legacy: tiered_input / tiered_both (inputTiers) ──
    if (pricing.inputTiers) {
      html += `<div class="tier-section-label">输入阶梯（由输入 Token 数决定）：</div>`;
      html += pricing.inputTiers.map((tier, idx) => {
        const active = isInRange(tier, idx, pricing.inputTiers, "maxInputTokens", inputTokens);
        const label  = rangeLabel(tier, idx, pricing.inputTiers, "maxInputTokens", "输入");
        const cache  = tier.cacheHit != null ? ` · 缓存 ${tier.cacheHit.toFixed(3)}` : '';
        return `
          <div class="tier-row ${active ? 'tier-row--active' : ''}">
            <div class="tier-row__label">
              ${active ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>'}
              ${label}
            </div>
            <div class="tier-row__price">
              ${tier.price.toFixed(2)}${cache} / M
              ${active ? '<span class="tier-row__current">当前档</span>' : ''}
            </div>
          </div>`;
      }).join('');
    }

    // ── Legacy: tiered_output / tiered_both (outputTiers) ──
    if (pricing.outputTiers) {
      if (pricing.inputTiers) html += `<div style="margin-top:8px;"></div>`;
      html += `<div class="tier-section-label">输出阶梯（由输出 Token 数决定）：</div>`;
      html += pricing.outputTiers.map((tier, idx) => {
        const active = isInRange(tier, idx, pricing.outputTiers, "maxOutputTokens", outputTokens);
        const label  = rangeLabel(tier, idx, pricing.outputTiers, "maxOutputTokens", "输出");
        return `
          <div class="tier-row ${active ? 'tier-row--active' : ''}">
            <div class="tier-row__label">
              ${active ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>'}
              ${label}
            </div>
            <div class="tier-row__price">
              ${tier.price.toFixed(2)} / M tokens
              ${active ? '<span class="tier-row__current">当前档</span>' : ''}
            </div>
          </div>`;
      }).join('');
    }

    rows.innerHTML = html;
    lucide.createIcons();
  }

  // ── Results Table ──
  function renderResults(result, model) {
    const tbody = document.getElementById("resultsTableBody");

    if (!result || !model) {
      tbody.innerHTML = `
        <tr class="results-empty">
          <td colspan="3">← 请先从左侧选择一个模型</td>
        </tr>`;
      document.getElementById("resultsBreakdown").style.display = "none";
      return;
    }

    const { singleCostUSD, singleCostCNY,
            dailyCostUSD, dailyCostCNY,
            monthlyCostUSD, monthlyCostCNY } = result;

    tbody.innerHTML = `
      <tr>
        <td class="results-row__label">
          <i data-lucide="zap"></i> 单次成本
        </td>
        <td class="results-row__usd">${fmtUSD(singleCostUSD)}</td>
        <td class="results-row__cny">${fmtCNY(singleCostCNY)}</td>
      </tr>
      <tr>
        <td class="results-row__label">
          <i data-lucide="calendar"></i> 每日估算
        </td>
        <td class="results-row__usd">${fmtUSD(dailyCostUSD)}</td>
        <td class="results-row__cny">${fmtCNY(dailyCostCNY)}</td>
      </tr>
      <tr class="results-row--highlight">
        <td class="results-row__label">
          <i data-lucide="trending-up"></i> 每月估算
        </td>
        <td class="results-row__usd">${fmtUSD(monthlyCostUSD)}</td>
        <td class="results-row__cny highlight-cny">${fmtCNY(monthlyCostCNY)}</td>
      </tr>`;

    // Check if cache is supported
    const pricing = model.pricing;
    let cacheSupported = true;
    if (pricing.type === "standard" || pricing.type === "tiered_output") {
      cacheSupported = pricing.cacheHit !== null;
    } else if (pricing.type === "tiered_by_input" || pricing.type === "tiered_by_output") {
      cacheSupported = (pricing.tiers || []).some(t => t.cacheHit != null);
    } else if (pricing.inputTiers) {
      cacheSupported = pricing.inputTiers.some(t => t.cacheHit != null);
    }

    if (!cacheSupported) {
      tbody.innerHTML += `
        <tr>
          <td colspan="3" style="padding:8px 16px; font-size:12px; color:var(--text-muted); text-align:center; background:var(--bg-base);">
            <i data-lucide="info" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i>
            此模型不支持缓存定价，缓存命中率设置不会影响费用
          </td>
        </tr>`;
    }

    lucide.createIcons();
    renderBreakdown(result.detail);
  }

  // ── Breakdown Chart ──
  let breakdownChartInstance = null;

  function renderBreakdown(detail) {
    const el = document.getElementById("resultsBreakdown");
    el.style.display = "flex";

    const { inputCost, outputCost, inputPercent, outputPercent,
            inputPricePerM, outputPricePerM, cacheHitPricePerM } = detail;

    const fmt = (v) => Number(v ?? 0).toFixed(3);

    document.getElementById("breakdownLabels").innerHTML = `
      <div class="breakdown-label">
        <span class="breakdown-label__dot" style="background:var(--accent-sky)"></span>
        <span class="breakdown-label__name">输入成本</span>
        <span class="breakdown-label__pct">${inputPercent}%</span>
      </div>
      <div class="breakdown-label">
        <span class="breakdown-label__dot" style="background:var(--brand-500)"></span>
        <span class="breakdown-label__name">输出成本</span>
        <span class="breakdown-label__pct">${outputPercent}%</span>
      </div>
      <div class="breakdown-label breakdown-label--note">
        <span>本档实际单价：输入 ${fmt(inputPricePerM)} · 输出 ${fmt(outputPricePerM)} · 缓存 ${fmt(cacheHitPricePerM)} / M</span>
      </div>`;

    // Chart.js may not be loaded yet
    if (typeof Chart === "undefined") {
      setTimeout(() => renderBreakdown(detail), 300);
      return;
    }

    const ctx = document.getElementById("breakdownChart").getContext("2d");
    const skyColor = getComputedStyle(document.documentElement).getPropertyValue("--accent-sky").trim() || "#0ea5e9";
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue("--brand-500").trim() || "#8b5cf6";

    const data = {
      labels: ["输入成本", "输出成本"],
      datasets: [{
        data: [inputCost, outputCost],
        backgroundColor: [skyColor, brandColor],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    };

    if (breakdownChartInstance) {
      breakdownChartInstance.data = data;
      breakdownChartInstance.update();
    } else {
      breakdownChartInstance = new Chart(ctx, {
        type: "doughnut",
        data,
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipCtx) => {
                  const val = tooltipCtx.raw;
                  const total = inputCost + outputCost;
                  const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                  return ` ${pct}%`;
                }
              }
            }
          },
          cutout: "65%",
        }
      });
    }
  }

  // ── Compare Table ──
  function renderCompareTable(batchResults, compareModelIds) {
    const wrap = document.getElementById("compareTableWrap");

    if (!batchResults || batchResults.length === 0) {
      wrap.innerHTML = `
        <div class="compare-empty">
          <i data-lucide="git-compare"></i>
          <span>右键模型 → "加入对比"，或点击上方按钮</span>
        </div>`;
      lucide.createIcons();
      return;
    }

    const minCNY = Math.min(...batchResults.map(r => r.result.singleCostCNY));

    const headerCells = batchResults.map(({ model }) => `
      <th>
        <div class="compare-th">
          <span class="compare-th__provider">${model.provider}</span>
          <span class="compare-th__name">${model.name}</span>
          <button class="compare-remove-btn" data-remove-compare="${model.id}" title="移除">✕</button>
        </div>
      </th>
    `).join('');

    const rowDefs = [
      { label: "单次 (USD)", key: "singleCostUSD", fmt: fmtUSD },
      { label: "单次 (CNY)", key: "singleCostCNY", fmt: fmtCNY },
      { label: "每日 (CNY)", key: "dailyCostCNY",  fmt: fmtCNY },
      { label: "每月 (CNY)", key: "monthlyCostCNY", fmt: fmtCNY },
    ];

    const rows = rowDefs.map(row => {
      const cells = batchResults.map(({ result }) => {
        const isMin = row.key === "singleCostCNY" && result.singleCostCNY === minCNY;
        return `<td class="${isMin ? 'compare-td--best' : ''}">${row.fmt(result[row.key])}</td>`;
      }).join('');
      return `<tr><td class="compare-row-label">${row.label}</td>${cells}</tr>`;
    }).join('');

    const diffCells = batchResults.map(({ result }) => {
      const isBase = result.singleCostCNY === minCNY;
      if (isBase) return `<td class="compare-td--best">最低 ✅</td>`;
      const diff = minCNY > 0 ? ((result.singleCostCNY - minCNY) / minCNY * 100).toFixed(1) : "—";
      return `<td class="compare-td--expensive">+${diff}%</td>`;
    }).join('');

    wrap.innerHTML = `
      <div class="compare-table-scroll">
        <table class="compare-table">
          <thead><tr><th></th>${headerCells}</tr></thead>
          <tbody>
            ${rows}
            <tr class="compare-diff-row">
              <td class="compare-row-label">相对差异</td>
              ${diffCells}
            </tr>
          </tbody>
        </table>
      </div>`;
    lucide.createIcons();
  }

  // ── Exchange Badge ──
  function renderExchangeBadge(rate, source, displayDate) {
    const display = document.getElementById("exchangeRateDisplay");
    const sourceText = source === "api"
      ? "今日已更新"
      : source === "cache"
        ? "今日缓存"
        : source === "stale"
          ? "旧缓存"
          : "默认值";
    display.textContent = `1 USD = ${rate.toFixed(4)} CNY · ${sourceText} · ${displayDate}`;
    display.title = `汇率更新日期：${displayDate}`;
  }

  // ── Currency List ──
  function renderCurrencyList(allCurrencies) {
    const container = document.getElementById("currencyList");
    const PROTECTED = ["USD", "CNY"];

    container.innerHTML = allCurrencies.map(c => `
      <div class="currency-row">
        <span class="currency-row__code">${c.code}</span>
        <span class="currency-row__name">${c.name}</span>
        <span class="currency-row__rate">${c.toCny !== null ? `1 ${c.code} = ${c.toCny} CNY` : '自动获取'}</span>
        ${!PROTECTED.includes(c.code) ? `
          <button class="icon-btn icon-btn--danger" data-delete-currency="${c.code}">
            <i data-lucide="trash-2"></i>
          </button>` : `<span class="currency-row__protected">内置</span>`}
      </div>
    `).join('');
    lucide.createIcons();
  }

  // ── Compare Model Picker ──
  function renderComparePickerList(allModels, selectedIds, searchQuery = "") {
    const container = document.getElementById("comparePickerList");
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? allModels.filter(m =>
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
        )
      : allModels;

    container.innerHTML = filtered.map(model => {
      const isSelected = selectedIds.includes(model.id);
      return `
        <div class="picker-item ${isSelected ? 'picker-item--selected' : ''}" data-picker-id="${model.id}">
          <div class="picker-item__check">
            ${isSelected ? '<i data-lucide="check"></i>' : ''}
          </div>
          <div class="picker-item__info">
            <div class="picker-item__name">${model.name}</div>
            <div class="picker-item__provider">${model.provider} · ${model.currency}</div>
          </div>
        </div>`;
    }).join('');
    lucide.createIcons();
  }

  // ── Manage Custom Models List ──
  function renderManageModelsList(customModels) {
    const container = document.getElementById("manageModalBody");
    if (customModels.length === 0) {
      container.innerHTML = `
        <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">
          暂无自定义模型，点击侧边栏"添加"按钮创建
        </div>`;
      return;
    }

    container.innerHTML = customModels.map(m => `
      <div class="manage-model-row">
        <span class="manage-model-row__name">${m.name}</span>
        <span class="manage-model-row__provider">${m.provider} · ${m.currency}</span>
        <div class="manage-model-row__actions">
          <button class="icon-btn" data-edit-model="${m.id}" title="编辑">
            <i data-lucide="edit-2"></i>
          </button>
          <button class="icon-btn icon-btn--danger" data-delete-model="${m.id}" title="删除">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  // ── Toast ──
  function toast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toastContainer");
    const icons = {
      success: "check-circle",
      error:   "x-circle",
      info:    "info",
      warning: "alert-triangle",
    };
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <i data-lucide="${icons[type] ?? 'info'}"></i>
      <span>${message}</span>`;
    container.appendChild(el);
    lucide.createIcons();
    requestAnimationFrame(() => el.classList.add("toast--show"));
    setTimeout(() => {
      el.classList.remove("toast--show");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
      // Fallback removal
      setTimeout(() => { if (el.parentNode) el.remove(); }, 500);
    }, duration);
  }

  return {
    renderModelList,
    renderModelBanner,
    renderTierCard,
    renderResults,
    renderCompareTable,
    renderExchangeBadge,
    renderCurrencyList,
    renderComparePickerList,
    renderManageModelsList,
    toast,
    fmtUSD,
    fmtCNY,
  };
})();
