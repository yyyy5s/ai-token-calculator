// src/calculator.js
"use strict";

const Calculator = (() => {

  /**
   * Find the first tier whose threshold is >= tokens.
   * Falls back to the last tier (highest threshold, usually Infinity).
   */
  function findTier(tiers, tokens, thresholdKey) {
    if (!Array.isArray(tiers) || tiers.length === 0) return null;
    return tiers.find(t => tokens <= t[thresholdKey]) || tiers.at(-1);
  }

  /**
   * Resolve effective per-million prices for the current usage.
   *
   * Supported pricing.type values:
   *
   *  • "standard"
   *      Flat: { input, output, cacheHit }
   *
   *  • "tiered_by_input"   ← Gemini 2.5 / Doubao 1.5 Pro 等
   *      输入 Token 数量决定整个档位（input / output / cacheHit 全部按档位走）。
   *      tiers: [{ maxInputTokens, input, output, cacheHit }]
   *
   *  • "tiered_by_output"
   *      输出 Token 数量决定整个档位（少见，但保留以备其他厂商使用）。
   *      tiers: [{ maxOutputTokens, input, output, cacheHit }]
   *
   *  • "tiered_input"       (legacy)
   *      仅 input 价随输入 Token 阶梯变化，output 固定。
   *      inputTiers: [{ maxInputTokens, price, cacheHit }], output, (cacheHit)
   *
   *  • "tiered_output"      (legacy)
   *      仅 output 价随输出 Token 阶梯变化，input 固定。
   *      outputTiers: [{ maxOutputTokens, price }], input, (cacheHit)
   *
   *  • "tiered_both"        (legacy)
   *      input 和 output 各自独立阶梯。
   *      inputTiers + outputTiers
   *
   * 返回 { inputPrice, outputPrice, cacheHitPrice, activeInputTier?, activeOutputTier? }
   */
  function resolvePrices(pricing, inputTokens, outputTokens) {
    switch (pricing.type) {

      case "tiered_by_input": {
        const tier = findTier(pricing.tiers, inputTokens, "maxInputTokens") || {};
        return {
          inputPrice:    tier.input    ?? 0,
          outputPrice:   tier.output   ?? 0,
          cacheHitPrice: tier.cacheHit ?? tier.input ?? 0,
          activeInputTier: tier,
        };
      }

      case "tiered_by_output": {
        const tier = findTier(pricing.tiers, outputTokens, "maxOutputTokens") || {};
        return {
          inputPrice:    tier.input    ?? 0,
          outputPrice:   tier.output   ?? 0,
          cacheHitPrice: tier.cacheHit ?? tier.input ?? 0,
          activeOutputTier: tier,
        };
      }

      case "tiered_input": {
        const tier = findTier(pricing.inputTiers, inputTokens, "maxInputTokens") || {};
        return {
          inputPrice:    tier.price ?? 0,
          outputPrice:   pricing.output ?? 0,
          cacheHitPrice: tier.cacheHit ?? tier.price ?? 0,
          activeInputTier: tier,
        };
      }

      case "tiered_output": {
        const tier = findTier(pricing.outputTiers, outputTokens, "maxOutputTokens") || {};
        return {
          inputPrice:    pricing.input ?? 0,
          outputPrice:   tier.price ?? 0,
          cacheHitPrice: pricing.cacheHit ?? pricing.input ?? 0,
          activeOutputTier: tier,
        };
      }

      case "tiered_both": {
        const inTier  = findTier(pricing.inputTiers,  inputTokens,  "maxInputTokens")  || {};
        const outTier = findTier(pricing.outputTiers, outputTokens, "maxOutputTokens") || {};
        return {
          inputPrice:    inTier.price ?? 0,
          outputPrice:   outTier.price ?? 0,
          cacheHitPrice: inTier.cacheHit ?? inTier.price ?? 0,
          activeInputTier:  inTier,
          activeOutputTier: outTier,
        };
      }

      case "standard":
      default: {
        return {
          inputPrice:    pricing.input ?? 0,
          outputPrice:   pricing.output ?? 0,
          cacheHitPrice: pricing.cacheHit ?? pricing.input ?? 0,
        };
      }
    }
  }

  function calculate(params, pricing, modelCurrency, allCurrencies) {
    const { inputTokens, outputTokens, cacheHitRate, dailyCalls, usdToCny } = params;

    const cachedTokens    = inputTokens * cacheHitRate;
    const nonCachedTokens = inputTokens * (1 - cacheHitRate);

    const { inputPrice, outputPrice, cacheHitPrice } =
      resolvePrices(pricing, inputTokens, outputTokens);

    const nonCachedCost = (nonCachedTokens / 1_000_000) * inputPrice;
    const cachedCost    = (cachedTokens    / 1_000_000) * cacheHitPrice;
    const inputCost     = nonCachedCost + cachedCost;

    const outputCost = (outputTokens / 1_000_000) * outputPrice;

    const singleCostNative = inputCost + outputCost;

    let singleCostCNY;
    if (modelCurrency === "CNY") {
      singleCostCNY = singleCostNative;
    } else if (modelCurrency === "USD") {
      singleCostCNY = singleCostNative * usdToCny;
    } else {
      const currencyDef = allCurrencies.find(c => c.code === modelCurrency);
      const rate = currencyDef?.toCny ?? 1;
      singleCostCNY = singleCostNative * rate;
    }

    const singleCostUSD = singleCostCNY / usdToCny;

    const dailyCostUSD   = singleCostUSD * dailyCalls;
    const dailyCostCNY   = singleCostCNY * dailyCalls;
    const monthlyCostUSD = dailyCostUSD * 30;
    const monthlyCostCNY = dailyCostCNY * 30;

    const total = singleCostNative || 1;
    const inputPercent  = ((inputCost  / total) * 100).toFixed(1);
    const outputPercent = ((outputCost / total) * 100).toFixed(1);

    return {
      singleCostNative,
      nativeCurrency: modelCurrency,
      singleCostUSD,
      singleCostCNY,
      dailyCostUSD,
      dailyCostCNY,
      monthlyCostUSD,
      monthlyCostCNY,
      detail: {
        inputCost,
        outputCost,
        cachedTokens,
        nonCachedTokens,
        inputPricePerM:    inputPrice,
        outputPricePerM:   outputPrice,
        cacheHitPricePerM: cacheHitPrice,
        inputPercent,
        outputPercent,
      }
    };
  }

  function calculateBatch(models, params, allCurrencies) {
    return models
      .map(model => ({
        model,
        result: calculate(params, model.pricing, model.currency, allCurrencies)
      }))
      .sort((a, b) => a.result.singleCostCNY - b.result.singleCostCNY);
  }

  return { calculate, calculateBatch, resolvePrices };
})();
