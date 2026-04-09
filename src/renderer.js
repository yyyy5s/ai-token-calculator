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
                ${model.pricing.type === 'tiered_output' ? `
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
    tierBadge.style.display = model.pricing.type === "tiered_output" ? "inline-flex" : "none";

    document.getElementById("bannerCompareBtn").style.display = "inline-flex";
  }

  // ── Tier Card ──
  function renderTierCard(pricing, outputTokens) {
    const card = document.getElementById("tierCard");
    const rows = document.getElementById("tierCardRows");

    if (pricing.type !== "tiered_output") {
      card.style.display = "none";
      return;
    }

    card.style.display = "block";

    const html = pricing.outputTiers.map((tier, idx) => {
      const prevMax = idx > 0 ? pricing.outputTiers[idx - 1].maxOutputTokens : 0;
      const isActive = outputTokens <= tier.maxOutputTokens &&
        (idx === 0 || outputTokens > prevMax);

      const label = tier.maxOutputTokens === Infinity
        ? `输出 > ${prevMax} tokens`
        : idx === 0
          ? `输出 ≤ ${tier.maxOutputTokens} tokens`
          : `输出 ${prevMax + 1} ~ ${tier.maxOutputTokens} tokens`;

      return `
        <div class="tier-row ${isActive ? 'tier-row--active' : ''}">
          <div class="tier-row__label">
            ${isActive ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>'}
            ${label}
          </div>
          <div class="tier-row__price">
            ${tier.price.toFixed(2)} / M tokens
            ${isActive ? '<span class="tier-row__current">当前档</span>' : ''}
          </div>
        </div>`;
    }).join('');

    rows.innerHTML = html;
    lucide.createIcons();
  }

  // ── Results Table ──
  function renderResults(result) {
    const tbody = document.getElementById("resultsTableBody");

    if (!result) {
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

    lucide.createIcons();
    renderBreakdown(result.detail);
  }

  // ── Breakdown Chart ──
  let breakdownChartInstance = null;

  function renderBreakdown(detail) {
    const el = document.getElementById("resultsBreakdown");
    el.style.display = "flex";

    const { inputCost, outputCost, inputPercent, outputPercent, outputPricePerM } = detail;

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
        <span>实际输出单价：${outputPricePerM.toFixed(3)} / M</span>
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
