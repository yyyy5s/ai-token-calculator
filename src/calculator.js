// src/calculator.js
"use strict";

const Calculator = (() => {

  /**
   * Resolve the output price from outputTiers based on outputTokens.
   * Falls back to pricing.output for non-tiered output types.
   */
  function resolveOutputPrice(pricing, outputTokens) {
    if (pricing.outputTiers) {
      const tier = pricing.outputTiers.find(t => outputTokens <= t.maxOutputTokens);
      return tier ? tier.price : pricing.outputTiers.at(-1).price;
    }
    return pricing.output;
  }

  /**
   * Resolve the input price (and cacheHit price) from inputTiers based on inputTokens.
   * Falls back to pricing.input / pricing.cacheHit for non-tiered input types.
   */
  function resolveInputPrice(pricing, inputTokens) {
    if (pricing.inputTiers) {
      const tier = pricing.inputTiers.find(t => inputTokens <= t.maxInputTokens);
      const matched = tier || pricing.inputTiers.at(-1);
      return {
        inputPrice: matched.price,
        cacheHitPrice: matched.cacheHit ?? matched.price,
      };
    }
    return {
      inputPrice: pricing.input,
      cacheHitPrice: pricing.cacheHit ?? pricing.input,
    };
  }

  function calculate(params, pricing, modelCurrency, allCurrencies) {
    const { inputTokens, outputTokens, cacheHitRate, dailyCalls, usdToCny } = params;

    const cachedTokens    = inputTokens * cacheHitRate;
    const nonCachedTokens = inputTokens * (1 - cacheHitRate);

    // Resolve input pricing (handles standard, tiered_input, tiered_both)
    const { inputPrice: inputPricePerM, cacheHitPrice: cachePricePerM } =
      resolveInputPrice(pricing, inputTokens);

    const nonCachedCost = (nonCachedTokens / 1_000_000) * inputPricePerM;
    const cachedCost    = (cachedTokens    / 1_000_000) * cachePricePerM;
    const inputCost     = nonCachedCost + cachedCost;

    // Resolve output pricing (handles standard, tiered_output, tiered_both)
    const outputPricePerM = resolveOutputPrice(pricing, outputTokens);
    const outputCost      = (outputTokens / 1_000_000) * outputPricePerM;

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
        outputPricePerM,
        inputPricePerM,
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

  return { calculate, calculateBatch, resolveOutputPrice, resolveInputPrice };
})();
