// src/calculator.js
"use strict";

const Calculator = (() => {

  function resolveOutputPrice(pricing, outputTokens) {
    if (pricing.type === "tiered_output") {
      const tier = pricing.outputTiers.find(t => outputTokens <= t.maxOutputTokens);
      return tier ? tier.price : pricing.outputTiers.at(-1).price;
    }
    return pricing.output;
  }

  function calculate(params, pricing, modelCurrency, allCurrencies) {
    const { inputTokens, outputTokens, cacheHitRate, dailyCalls, usdToCny } = params;

    const cachedTokens    = inputTokens * cacheHitRate;
    const nonCachedTokens = inputTokens * (1 - cacheHitRate);

    const inputPricePerM  = pricing.input;
    const cachePricePerM  = pricing.cacheHit ?? pricing.input;

    const nonCachedCost = (nonCachedTokens / 1_000_000) * inputPricePerM;
    const cachedCost    = (cachedTokens    / 1_000_000) * cachePricePerM;
    const inputCost     = nonCachedCost + cachedCost;

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

  return { calculate, calculateBatch, resolveOutputPrice };
})();
