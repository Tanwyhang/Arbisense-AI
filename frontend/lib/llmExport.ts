/**
 * LLM-Ready Data Export Utility
 * Formats evaluation data for LLM consumption with structured prompts
 */

import {
  BacktestSummary,
  ModelVariant,
  StressTestSuite,
  StatisticalTestResults,
  LLMExportFormat
} from '@/types/evaluation';

/**
 * Generate LLM-ready export from all evaluation data
 */
export function generateLLMExport(options: {
  backtest: BacktestSummary;
  modelVariants: ModelVariant[];
  stressTests: StressTestSuite;
  statisticalTests: StatisticalTestResults;
  modelVersion?: string;
  confidenceLevel?: number;
  significanceLevel?: number;
}): LLMExportFormat {
  const {
    backtest,
    modelVariants,
    stressTests,
    statisticalTests,
    modelVersion = '1.0.0',
    confidenceLevel = 0.95,
    significanceLevel = 0.05
  } = options;

  // Generate summary for LLM
  const summaryForLLM = generateLLMSummary({
    backtest,
    modelVariants,
    stressTests,
    statisticalTests,
    confidenceLevel,
    significanceLevel
  });

  // Generate tabular data (CSV format)
  const tabularData = {
    backtest_summary_csv: formatBacktestAsCSV(backtest),
    variant_comparison_csv: formatModelVariantsAsCSV(modelVariants),
    stress_scenarios_csv: formatStressTestsAsCSV(stressTests),
    statistical_tests_csv: formatStatisticalTestsAsCSV(statisticalTests),
    agent_performance_csv: '', // Placeholder if agent performance is added
    kelly_validation_csv: '' // Placeholder if Kelly validation is added
  };

  return {
    export_date: new Date().toISOString(),
    export_version: '1.0.0',
    summary_for_llm: summaryForLLM,
    structured_data: {
      backtest_results: backtest,
      model_variants: modelVariants,
      stress_tests: stressTests,
      synthetic_tests: [], // Placeholder for synthetic test results
      statistical_tests: statisticalTests
    },
    tabular_data: tabularData,
    metadata: {
      model_version: modelVersion,
      test_period_days: backtest.duration_days,
      number_of_variants_tested: modelVariants.length,
      confidence_level: confidenceLevel,
      significance_level: significanceLevel
    }
  };
}

/**
 * Generate human-readable LLM summary
 */
function generateLLMSummary(options: {
  backtest: BacktestSummary;
  modelVariants: ModelVariant[];
  stressTests: StressTestSuite;
  statisticalTests: StatisticalTestResults;
  confidenceLevel: number;
  significanceLevel: number;
}): string {
  const { backtest, modelVariants, stressTests, statisticalTests, confidenceLevel, significanceLevel } = options;

  const bestVariant = modelVariants.sort((a, b) => b.overall_score - a.overall_score)[0];

  return `
# MODEL EVALUATION REPORT

## EXECUTIVE SUMMARY

This report presents a comprehensive PhD-level evaluation of the ArbiSense AI arbitrage model,
including backtesting, stress testing, and statistical validation across ${modelVariants.length} model variants.

### KEY FINDINGS

**Best Performing Variant:** ${bestVariant.variant_name} (${bestVariant.version})
- Overall Score: ${bestVariant.overall_score.toFixed(1)}/100
- Sharpe Ratio: ${bestVariant.backtest.sharpe_ratio.toFixed(3)} (${bestVariant.backtest.sharpe_ratio > 1 ? 'EXCELLENT' : 'NEEDS IMPROVEMENT'})
- Total Return: ${bestVariant.backtest.total_return_pct.toFixed(2)}%
- Maximum Drawdown: ${bestVariant.backtest.max_drawdown_pct.toFixed(2)}%

## BACKTEST PERFORMANCE

**Period:** ${backtest.start_date} to ${backtest.end_date} (${backtest.duration_days} days)

### Risk-Adjusted Returns
- Sharpe Ratio: ${backtest.sharpe_ratio.toFixed(3)} ${backtest.sharpe_ratio > 1 ? '✓' : '✗'}
- Sortino Ratio: ${backtest.sortino_ratio.toFixed(3)} ${backtest.sortino_ratio > 1 ? '✓' : '✗'}
- Calmar Ratio: ${backtest.calmar_ratio.toFixed(3)}
- Omega Ratio: ${backtest.omega_ratio.toFixed(3)}

### Risk Metrics
- Maximum Drawdown: ${backtest.max_drawdown_pct.toFixed(2)}%
- Annualized Volatility: ${(backtest.volatility_annualized * 100).toFixed(2)}%
- Downside Deviation: ${backtest.downside_deviation.toFixed(4)}

### Value at Risk (${(confidenceLevel * 100)}% Confidence)
- VaR (1-day): $${backtest.var_95_1d.toFixed(2)}
- CVaR (1-day): $${backtest.cvar_95_1d.toFixed(2)}

### Trade Statistics
- Win Rate: ${(backtest.win_rate * 100).toFixed(1)}%
- Profit Factor: ${backtest.profit_factor.toFixed(2)}
- Expectancy: $${backtest.expectancy.toFixed(2)}
- Average Win: $${backtest.avg_win.toFixed(2)}
- Average Loss: $${backtest.avg_loss.toFixed(2)}

## MODEL VARIANT COMPARISON

${modelVariants.map((variant, i) => `
**Rank #${i + 1}:** ${variant.variant_name} (${variant.version})
- Overall Score: ${variant.overall_score.toFixed(1)}/100
- Sharpe Ratio: ${variant.backtest.sharpe_ratio.toFixed(3)}
- Return: ${variant.backtest.total_return_pct.toFixed(2)}%
- Max DD: ${variant.backtest.max_drawdown_pct.toFixed(2)}%
- Key Hyperparameters:
  * Monte Carlo Paths: ${variant.hyperparameters.monte_carlo_paths}
  * Lévy Alpha: ${variant.hyperparameters.levy_alpha.toFixed(2)}
  * Kelly Correlation: ${variant.hyperparameters.kelly_correlation_enabled ? 'Enabled' : 'Disabled'}
`).join('\n')}

## STRESS TESTING RESULTS

### Aggregate Performance
- Worst Case Return: ${stressTests.aggregate_metrics.worst_case_return.toFixed(2)}%
- Worst Case Drawdown: ${stressTests.aggregate_metrics.worst_case_drawdown.toFixed(2)}%
- Scenario Survival Rate: ${(stressTests.aggregate_metrics.scenario_survival_rate * 100).toFixed(0)}%
- Tail Risk Exposure: ${(stressTests.aggregate_metrics.tail_risk_exposure * 100).toFixed(1)}%

### Key Scenarios
${stressTests.stress_scenarios.slice(0, 5).map(scenario => `
**${scenario.scenario_name}** (${scenario.scenario_type})
- Return: ${scenario.results.total_return.toFixed(2)}%
- Max Drawdown: ${scenario.results.max_drawdown.toFixed(2)}%
- Survives: ${scenario.results.survives_scenario ? '✓ YES' : '✗ NO'}
- Recovery Time: ${scenario.results.recovery_time_days} days
`).join('\n')}

## STATISTICAL VALIDATION

Confidence Level: ${(confidenceLevel * 100)}%
Significance Level: ${(significanceLevel * 100)}%

### Normality Tests
${Object.entries(statisticalTests.normality).map(([test, result]) => `
- ${test}: ${result.is_normal ? '✓ Normal' : '✗ Not Normal'} (p=${result.p_value.toFixed(4)})
`).join('')}

### Stationarity Tests
${Object.entries(statisticalTests.stationarity).map(([test, result]) => `
- ${test}: ${result.is_stationary ? '✓ Stationary' : '✗ Not Stationary'} (p=${result.p_value.toFixed(4)})
`).join('')}

### Heteroskedasticity Tests
${Object.entries(statisticalTests.heteroskedasticity).map(([test, result]) => {
  let isHomoskedastic: boolean;
  if ('is_homoskedastic' in result) {
    isHomoskedastic = result.is_homoskedastic;
  } else {
    isHomoskedastic = !result.arch_effects;
  }
  return `- ${test}: ${isHomoskedastic ? '✓ Homoskedastic' : '✗ Heteroskedastic'} (p=${result.p_value.toFixed(4)})`;
}).join('\n')}

### Model Selection Criteria
- AIC: ${statisticalTests.model_selection.akaike_information_criterion.toFixed(2)}
- BIC: ${statisticalTests.model_selection.bayesian_information_criterion.toFixed(2)}
- R²: ${statisticalTests.model_selection.r_squared.toFixed(4)}
- Adjusted R²: ${statisticalTests.model_selection.adjusted_r_squared.toFixed(4)}

## RECOMMENDATIONS

### Strengths
${bestVariant.backtest.sharpe_ratio > 1 ? '- Strong risk-adjusted returns (Sharpe > 1)' : ''}
${bestVariant.backtest.win_rate > 0.5 ? '- Win rate exceeds 50%' : ''}
${bestVariant.backtest.profit_factor > 1.5 ? '- Profit factor indicates favorable risk/reward' : ''}
${stressTests.aggregate_metrics.scenario_survival_rate > 0.8 ? '- High survival rate in stress scenarios' : ''}

### Areas for Improvement
${backtest.max_drawdown_pct > 15 ? '- Consider reducing maximum drawdown exposure' : ''}
${!statisticalTests.normality.jarque_bera.is_normal ? '- Returns deviate from normality - consider fat-tailed models' : ''}
${statisticalTests.heteroskedasticity.breusch_pagan.is_homoskedastic ? '- Volatility clustering detected - consider GARCH models' : ''}

### Next Steps
1. Monitor live performance against backtest projections
2. Implement position sizing limits based on stress test results
3. Consider ensemble approach using top 3 model variants
4. Review and recalibrate model quarterly

---
*Generated by ArbiSense AI Evaluation Suite*
*Confidence Level: ${(confidenceLevel * 100)}% | Significance Level: ${(significanceLevel * 100)}%*
`.trim();
}

/**
 * Format backtest as CSV
 */
function formatBacktestAsCSV(data: BacktestSummary): string {
  const metrics = [
    ['Metric', 'Value'],
    ['Start Date', data.start_date],
    ['End Date', data.end_date],
    ['Duration Days', data.duration_days.toString()],
    ['Total Return %', data.total_return_pct.toFixed(4)],
    ['CAGR', data.cagr.toFixed(4)],
    ['Sharpe Ratio', data.sharpe_ratio.toFixed(4)],
    ['Sortino Ratio', data.sortino_ratio.toFixed(4)],
    ['Calmar Ratio', data.calmar_ratio.toFixed(4)],
    ['Max Drawdown %', data.max_drawdown_pct.toFixed(4)],
    ['Win Rate', data.win_rate.toFixed(4)],
    ['Profit Factor', data.profit_factor.toFixed(4)],
    ['Number of Trades', data.total_trades.toString()],
    ['Winning Trades', data.winning_trades.toString()],
    ['Losing Trades', data.losing_trades.toString()]
  ];

  return metrics.map(row => row.join(',')).join('\n');
}

/**
 * Format model variants as CSV
 */
function formatModelVariantsAsCSV(variants: ModelVariant[]): string {
  const headers = ['Variant', 'Version', 'Sharpe', 'Return %', 'Max DD %', 'Win Rate', 'Profit Factor', 'Overall Score'];
  const rows = variants.map(v => [
    v.variant_name,
    v.version,
    v.backtest.sharpe_ratio.toFixed(4),
    v.backtest.total_return_pct.toFixed(2),
    v.backtest.max_drawdown_pct.toFixed(2),
    v.backtest.win_rate.toFixed(4),
    v.backtest.profit_factor.toFixed(4),
    v.overall_score.toFixed(2)
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Format stress tests as CSV
 */
function formatStressTestsAsCSV(data: StressTestSuite): string {
  const headers = ['Scenario', 'Type', 'Return %', 'Max DD %', 'Sharpe', 'Win Rate', 'Survives', 'Recovery Days'];
  const rows = data.stress_scenarios.map(s => [
    s.scenario_name,
    s.scenario_type,
    s.results.total_return.toFixed(2),
    s.results.max_drawdown.toFixed(2),
    s.results.sharpe_ratio.toFixed(3),
    s.results.win_rate.toFixed(3),
    s.results.survives_scenario ? 'YES' : 'NO',
    s.results.recovery_time_days.toString()
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Format statistical tests as CSV
 */
function formatStatisticalTestsAsCSV(data: StatisticalTestResults): string {
  const rows: string[][] = [];

  rows.push(['NORMALITY TESTS']);
  rows.push(['Test', 'Statistic', 'p-value', 'Is Normal']);
  Object.entries(data.normality).forEach(([test, result]) => {
    rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), result.is_normal ? 'YES' : 'NO']);
  });
  rows.push([]);

  rows.push(['STATIONARITY TESTS']);
  rows.push(['Test', 'Statistic', 'p-value', 'Is Stationary']);
  Object.entries(data.stationarity).forEach(([test, result]) => {
    rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), result.is_stationary ? 'YES' : 'NO']);
  });
  rows.push([]);

  rows.push(['HETEROSKEDASTICITY TESTS']);
  rows.push(['Test', 'Statistic', 'p-value', 'Is Homoskedastic']);
  Object.entries(data.heteroskedasticity).forEach(([test, result]) => {
    let isHomoskedastic: boolean;
    if ('is_homoskedastic' in result) {
      isHomoskedastic = result.is_homoskedastic;
    } else {
      isHomoskedastic = !result.arch_effects;
    }
    rows.push([test, result.statistic.toFixed(4), result.p_value.toFixed(6), isHomoskedastic ? 'YES' : 'NO']);
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Export LLM data as JSON file
 */
export function exportLLMData(data: LLMExportFormat, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `llm_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy LLM summary to clipboard
 */
export async function copyLLMSummary(data: LLMExportFormat): Promise<void> {
  try {
    await navigator.clipboard.writeText(data.summary_for_llm);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}
