/**
 * Synthetic Backtest Data Generator
 * Generates realistic backtest results for testing and demonstration
 */

import { BacktestSummary, ModelVariant, ModelComparison, StressTestScenario, StressTestSuite } from '@/types/evaluation';

/**
 * Generate a synthetic backtest summary with realistic metrics
 */
export function generateSyntheticBacktest(seed?: number): BacktestSummary {
  const random = seed ? seededRandom(seed) : Math.random;

  // Period
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');
  const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Base parameters
  const totalTrades = Math.floor(500 + random() * 1000);
  const winRate = 0.45 + random() * 0.2; // 45-65%
  const winningTrades = Math.floor(totalTrades * winRate);
  const losingTrades = Math.floor(totalTrades * (1 - winRate));
  const breakevenTrades = totalTrades - winningTrades - losingTrades;

  // Returns
  const totalReturnPct = 15 + random() * 40; // 15-55%
  const totalReturn = 10000 * (totalReturnPct / 100);
  const cagr = totalReturnPct / 100;
  const dailyReturnAvg = cagr / 365;
  const dailyReturnStd = 0.01 + random() * 0.02;

  // Risk metrics
  const maxDrawdownPct = 5 + random() * 15; // 5-20%
  const maxDrawdown = 10000 * (maxDrawdownPct / 100);
  const maxDrawdownDuration = Math.floor(10 + random() * 40);
  const maxDrawdownRecovery = Math.floor(5 + random() * 30);
  const volatilityAnnualized = dailyReturnStd * Math.sqrt(365) * 100;
  const downsideDeviation = dailyReturnStd * (0.5 + random() * 0.5);

  // Risk-adjusted returns
  const sharpeRatio = (dailyReturnAvg * 365) / (dailyReturnStd * Math.sqrt(365));
  const sortinoRatio = (dailyReturnAvg * 365) / (downsideDeviation * Math.sqrt(365));
  const calmarRatio = cagr / (maxDrawdownPct / 100);
  const omegaRatio = 1.5 + random() * 1.5;

  // Trade metrics
  const profitFactor = 1.2 + random() * 1.3;
  const expectancy = 50 + random() * 150;
  const avgWin = 100 + random() * 200;
  const avgLoss = -(50 + random() * 150);
  const largestWin = avgWin * (2 + random() * 3);
  const largestLoss = avgLoss * (1.5 + random() * 2.5);
  const avgWinDuration = Math.floor(1 + random() * 5);
  const avgLossDuration = Math.floor(1 + random() * 4);

  // Streaks
  const longestWinningStreak = Math.floor(5 + random() * 15);
  const longestLosingStreak = Math.floor(3 + random() * 12);
  const currentStreak = Math.floor(random() * 10);
  const currentStreakType: 'winning' | 'losing' = random() > 0.5 ? 'winning' : 'losing';

  // Statistical
  const tStat = (dailyReturnAvg * Math.sqrt(totalTrades)) / dailyReturnStd;
  const pValue = 1 - normalCDF(Math.abs(tStat));
  const informationRatio = sharpeRatio * (0.5 + random() * 0.5);
  const trackingError = dailyReturnStd * Math.sqrt(365);

  // Value at Risk
  const var95_1d = -dailyReturnAvg - 1.645 * dailyReturnStd;
  const var99_1d = -dailyReturnAvg - 2.326 * dailyReturnStd;
  const cvar95_1d = var95_1d * 1.2;
  const cvar99_1d = var99_1d * 1.3;

  // Watermarks
  const allTimeHigh = 10000 + totalReturn;
  const allTimeHighDate = '2024-11-15';
  const daysFromAth = Math.floor(random() * 30);

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    duration_days: durationDays,
    total_trades: totalTrades,
    winning_trades: winningTrades,
    losing_trades: losingTrades,
    breakeven_trades: breakevenTrades,
    total_return: totalReturn,
    total_return_pct: totalReturnPct,
    cagr: cagr,
    daily_return_avg: dailyReturnAvg,
    daily_return_std: dailyReturnStd,
    max_drawdown: maxDrawdown,
    max_drawdown_pct: maxDrawdownPct,
    max_drawdown_duration: maxDrawdownDuration,
    max_drawdown_recovery: maxDrawdownRecovery,
    volatility_annualized: volatilityAnnualized / 100,
    downside_deviation: downsideDeviation,
    sharpe_ratio: sharpeRatio,
    sharpe_ratio_1y: sharpeRatio * (0.8 + random() * 0.4),
    sharpe_ratio_3y: sharpeRatio * (0.9 + random() * 0.2),
    sortino_ratio: sortinoRatio,
    calmar_ratio: calmarRatio,
    omega_ratio: omegaRatio,
    win_rate: winRate,
    profit_factor: profitFactor,
    expectancy: expectancy,
    avg_win: avgWin,
    avg_loss: avgLoss,
    largest_win: largestWin,
    largest_loss: largestLoss,
    avg_win_duration: avgWinDuration,
    avg_loss_duration: avgLossDuration,
    longest_winning_streak: longestWinningStreak,
    longest_losing_streak: longestLosingStreak,
    current_streak: currentStreak,
    current_streak_type: currentStreakType,
    t_stat: tStat,
    p_value: pValue,
    information_ratio: informationRatio,
    tracking_error: trackingError,
    var_95_1d: Math.abs(var95_1d),
    var_99_1d: Math.abs(var99_1d),
    cvar_95_1d: Math.abs(cvar95_1d),
    cvar_99_1d: Math.abs(cvar99_1d),
    all_time_high: allTimeHigh,
    all_time_high_date: allTimeHighDate,
    days_from_ath: daysFromAth
  };
}

/**
 * Generate multiple model variants for comparison
 */
export function generateModelVariants(count: number = 5): ModelVariant[] {
  const variants: ModelVariant[] = [];

  for (let i = 0; i < count; i++) {
    const seed = 1000 + i;
    const backtest = generateSyntheticBacktest(seed);

    variants.push({
      variant_id: `variant-${i + 1}`,
      variant_name: `Model Variant ${i + 1}`,
      version: `v${1 + Math.floor(i / 2)}.${i % 2 === 0 ? '0' : '1'}.${i % 3}`,
      hyperparameters: {
        monte_carlo_paths: 50 + i * 10,
        levy_alpha: 1.5 + (i % 3) * 0.2,
        agent_threshold_risk: 0.3 + (i % 4) * 0.1,
        agent_threshold_gas: 0.25 + (i % 3) * 0.15,
        agent_threshold_alpha: 0.35 + (i % 5) * 0.1,
        kelly_correlation_enabled: i % 2 === 0,
        kelly_fraction_cap: 0.15 + (i % 4) * 0.05,
        consensus_mechanism: ['majority', 'weighted', 'unanimous'][i % 3] as 'majority' | 'weighted' | 'unanimous'
      },
      backtest: backtest,
      statistical_tests: {
        normality: {
          jarque_bera: { statistic: 3.5 + Math.random() * 2, p_value: 0.1 + Math.random() * 0.3, is_normal: Math.random() > 0.5, interpretation: 'Cannot reject normality' },
          shapiro_wilk: { statistic: 0.95 + Math.random() * 0.04, p_value: 0.1 + Math.random() * 0.4, is_normal: Math.random() > 0.4 },
          anderson_darling: { statistic: 0.5 + Math.random() * 1, p_value: 0.15 + Math.random() * 0.35, is_normal: Math.random() > 0.5 }
        },
        stationarity: {
          augmented_dickey_fuller: {
            statistic: -4 + Math.random() * 2,
            p_value: 0.01 + Math.random() * 0.04,
            is_stationary: true,
            critical_values: { '1%': -3.43, '5%': -2.86, '10%': -2.57 }
          },
          kpss: { statistic: 0.1 + Math.random() * 0.3, p_value: 0.1 + Math.random() * 0.4, is_stationary: true },
          phillips_perron: { statistic: -3.5 + Math.random() * 2, p_value: 0.02 + Math.random() * 0.08, is_stationary: true }
        },
        autocorrelation: {
          ljung_box: { statistic: 5 + Math.random() * 15, p_value: 0.2 + Math.random() * 0.3, is_white_noise: true, lags: 10 },
          box_pierce: { statistic: 4 + Math.random() * 12, p_value: 0.25 + Math.random() * 0.35, is_white_noise: true, lags: 10 },
          durbin_watson: { statistic: 1.8 + Math.random() * 0.3, p_value: 0.3, autocorrelation_present: false }
        },
        heteroskedasticity: {
          breusch_pagan: { statistic: 2 + Math.random() * 8, p_value: 0.1 + Math.random() * 0.4, is_homoskedastic: true },
          white_test: { statistic: 15 + Math.random() * 30, p_value: 0.2 + Math.random() * 0.3, is_homoskedastic: true },
          arch_lm: { statistic: 1 + Math.random() * 10, p_value: 0.15 + Math.random() * 0.35, arch_effects: false }
        },
        distribution_fit: {
          kolmogorov_smirnov: { statistic: 0.05 + Math.random() * 0.1, p_value: 0.2 + Math.random() * 0.3, distribution: 'normal', fits: true },
          cramer_von_mises: { statistic: 0.1 + Math.random() * 0.3, p_value: 0.15 + Math.random() * 0.4, fits: true },
          anderson_darling: { statistic: 0.3 + Math.random() * 0.7, p_value: 0.2 + Math.random() * 0.3, fits: true }
        },
        outliers: {
          grubbs: { outliers: [], test_statistics: [], p_values: [], significance_level: 0.05 },
          mahalanobis: { outliers: [], distances: [], threshold: 3 },
          cooks_distance: { high_influence: [], distances: [], threshold: 1 }
        },
        model_selection: {
          akaike_information_criterion: 1000 + Math.random() * 100,
          bayesian_information_criterion: 1050 + Math.random() * 100,
          adjusted_r_squared: 0.6 + Math.random() * 0.2,
          r_squared: 0.65 + Math.random() * 0.15,
          log_likelihood: -500 + Math.random() * 50
        }
      },
      rank_sharpe: count - i,
      rank_return: count - ((i * 2) % count),
      rank_max_dd: i + 1,
      overall_score: 100 - i * 15 + Math.random() * 10
    });
  }

  return variants;
}

/**
 * Generate stress test scenarios
 */
export function generateStressTestScenarios(): StressTestSuite {
  const scenarios: StressTestScenario[] = [
    {
      scenario_id: 'hist-2008',
      scenario_name: '2008 Financial Crisis',
      scenario_type: 'historical',
      description: 'Simulates 2008 market crash conditions',
      parameters: {
        spread_shock_pct: 150,
        liquidity_shock_pct: 80,
        gas_price_multiplier: 1.5,
        volatility_multiplier: 3.0,
        correlation_breakdown: true,
        black_swan_probability: 0.02
      },
      results: {
        total_return: -15.5,
        max_drawdown: 25.3,
        sharpe_ratio: -0.85,
        win_rate: 0.35,
        avg_trade_slippage_pct: 2.5,
        var_99: 12000,
        cvar_99: 15000,
        tail_loss_probability: 0.08,
        survives_scenario: true,
        recovery_time_days: 45,
        worst_single_trade: -3500
      },
      model_behavior: {
        agent_consensus_rate: 0.45,
        kelly_avg_position: 0.08,
        monte_carlo_convergence: 0.75,
        confidence_intervals: { low: -20000, high: 5000, width: 25000 }
      }
    },
    {
      scenario_id: 'hist-2020',
      scenario_name: '2020 COVID Crash',
      scenario_type: 'historical',
      description: 'Simulates March 2020 crypto market crash',
      parameters: {
        spread_shock_pct: 120,
        liquidity_shock_pct: 70,
        gas_price_multiplier: 2.0,
        volatility_multiplier: 2.5,
        correlation_breakdown: true,
        black_swan_probability: 0.03
      },
      results: {
        total_return: -12.3,
        max_drawdown: 20.1,
        sharpe_ratio: -0.65,
        win_rate: 0.38,
        avg_trade_slippage_pct: 2.0,
        var_99: 10000,
        cvar_99: 13000,
        tail_loss_probability: 0.06,
        survives_scenario: true,
        recovery_time_days: 30,
        worst_single_trade: -2800
      },
      model_behavior: {
        agent_consensus_rate: 0.52,
        kelly_avg_position: 0.10,
        monte_carlo_convergence: 0.82,
        confidence_intervals: { low: -15000, high: 8000, width: 23000 }
      }
    },
    {
      scenario_id: 'synth-extreme-vol',
      scenario_name: 'Extreme Volatility Spike',
      scenario_type: 'synthetic',
      description: 'Synthetic scenario with 5x normal volatility',
      parameters: {
        spread_shock_pct: 80,
        liquidity_shock_pct: 40,
        gas_price_multiplier: 1.2,
        volatility_multiplier: 5.0,
        correlation_breakdown: false,
        black_swan_probability: 0.01
      },
      results: {
        total_return: 5.2,
        max_drawdown: 15.8,
        sharpe_ratio: 0.42,
        win_rate: 0.48,
        avg_trade_slippage_pct: 1.8,
        var_99: 8500,
        cvar_99: 11000,
        tail_loss_probability: 0.05,
        survives_scenario: true,
        recovery_time_days: 15,
        worst_single_trade: -2200
      },
      model_behavior: {
        agent_consensus_rate: 0.58,
        kelly_avg_position: 0.12,
        monte_carlo_convergence: 0.88,
        confidence_intervals: { low: -12000, high: 10000, width: 22000 }
      }
    },
    {
      scenario_id: 'black-swan-1',
      scenario_name: 'Black Swan Event',
      scenario_type: 'extreme',
      description: 'Tail risk event with 1% probability',
      parameters: {
        spread_shock_pct: 200,
        liquidity_shock_pct: 90,
        gas_price_multiplier: 3.0,
        volatility_multiplier: 4.0,
        correlation_breakdown: true,
        black_swan_probability: 0.01
      },
      results: {
        total_return: -22.8,
        max_drawdown: 32.5,
        sharpe_ratio: -1.2,
        win_rate: 0.28,
        avg_trade_slippage_pct: 3.5,
        var_99: 18000,
        cvar_99: 22000,
        tail_loss_probability: 0.12,
        survives_scenario: true,
        recovery_time_days: 60,
        worst_single_trade: -5500
      },
      model_behavior: {
        agent_consensus_rate: 0.35,
        kelly_avg_position: 0.05,
        monte_carlo_convergence: 0.65,
        confidence_intervals: { low: -25000, high: 2000, width: 27000 }
      }
    },
    {
      scenario_id: 'liquidity-freeze',
      scenario_name: 'DEX Liquidity Crisis',
      scenario_type: 'extreme',
      description: 'Simulated DEX liquidity freeze',
      parameters: {
        spread_shock_pct: 180,
        liquidity_shock_pct: 95,
        gas_price_multiplier: 1.0,
        volatility_multiplier: 2.0,
        correlation_breakdown: false,
        black_swan_probability: 0.005
      },
      results: {
        total_return: -8.5,
        max_drawdown: 18.2,
        sharpe_ratio: -0.45,
        win_rate: 0.42,
        avg_trade_slippage_pct: 4.2,
        var_99: 9500,
        cvar_99: 12500,
        tail_loss_probability: 0.07,
        survives_scenario: true,
        recovery_time_days: 25,
        worst_single_trade: -3200
      },
      model_behavior: {
        agent_consensus_rate: 0.48,
        kelly_avg_position: 0.06,
        monte_carlo_convergence: 0.70,
        confidence_intervals: { low: -14000, high: 6000, width: 20000 }
      }
    }
  ];

  const baseline = generateSyntheticBacktest(2000);

  return {
    test_date: new Date().toISOString().split('T')[0],
    baseline_scenario: baseline,
    stress_scenarios: scenarios,
    categories: {
      historical_crashes: [scenarios[0], scenarios[1]],
      synthetic_extreme: [scenarios[2]],
      regime_changes: [],
      black_swan: [scenarios[3]],
      liquidity_crisis: [scenarios[4]],
      gas_spiral: []
    },
    aggregate_metrics: {
      worst_case_return: -22.8,
      worst_case_drawdown: 32.5,
      average_drawdown_scenarios: 22.38,
      scenario_survival_rate: 1.0,
      tail_risk_exposure: 0.07
    }
  };
}

/**
 * Generate complete model comparison
 */
export function generateModelComparison(): ModelComparison {
  const variants = generateModelVariants(5);

  return {
    variants: variants,
    tested_date: new Date().toISOString().split('T')[0],
    test_period_days: 365,
    number_of_variants: 5,
    best_variant: variants[0].variant_id,
    improvement_over_baseline: {
      sharpe_improvement_pct: 15.5,
      return_improvement_pct: 22.3,
      drawdown_reduction_pct: 18.7
    }
  };
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
