/**
 * PhD-Level Model Evaluation Types
 * Comprehensive types for backtesting, stress testing, and statistical validation
 */

// ============================================================================
// BACKTESTING PERFORMANCE
// ============================================================================

export interface BacktestSummary {
  // Period
  start_date: string;
  end_date: string;
  duration_days: number;

  // Trade Counts
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;

  // Returns
  total_return: number;
  total_return_pct: number;
  cagr: number; // Compound Annual Growth Rate
  daily_return_avg: number;
  daily_return_std: number;

  // Risk Metrics
  max_drawdown: number;
  max_drawdown_pct: number;
  max_drawdown_duration: number; // days
  max_drawdown_recovery: number; // days
  volatility_annualized: number;
  downside_deviation: number;

  // Risk-Adjusted Returns
  sharpe_ratio: number;
  sharpe_ratio_1y: number;
  sharpe_ratio_3y: number;
  sortino_ratio: number;
  calmar_ratio: number;
  omega_ratio: number;

  // Trade Metrics
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  avg_win_duration: number; // days
  avg_loss_duration: number; // days

  // Streaks
  longest_winning_streak: number;
  longest_losing_streak: number;
  current_streak: number;
  current_streak_type: 'winning' | 'losing';

  // Statistical
  t_stat: number;
  p_value: number;
  information_ratio: number;
  tracking_error: number;

  // Value at Risk
  var_95_1d: number;
  var_99_1d: number;
  cvar_95_1d: number;
  cvar_99_1d: number;

  // Watermarks
  all_time_high: number;
  all_time_high_date: string;
  days_from_ath: number;
}

// ============================================================================
// MODEL VARIANTS FOR COMPARISON
// ============================================================================

export interface ModelVariant {
  variant_id: string;
  variant_name: string;
  version: string;

  // Hyperparameters
  hyperparameters: {
    monte_carlo_paths: number;
    levy_alpha: number;
    agent_threshold_risk: number;
    agent_threshold_gas: number;
    agent_threshold_alpha: number;
    kelly_correlation_enabled: boolean;
    kelly_fraction_cap: number;
    consensus_mechanism: 'majority' | 'weighted' | 'unanimous';
  };

  // Performance
  backtest: BacktestSummary;

  // Statistical Tests
  statistical_tests: StatisticalTestResults;

  // Rank
  rank_sharpe: number;
  rank_return: number;
  rank_max_dd: number;
  overall_score: number;
}

export interface ModelComparison {
  variants: ModelVariant[];
  tested_date: string;
  test_period_days: number;
  number_of_variants: number;

  // Significant Improvements
  best_variant: string;
  improvement_over_baseline: {
    sharpe_improvement_pct: number;
    return_improvement_pct: number;
    drawdown_reduction_pct: number;
  };
}

// ============================================================================
// STATISTICAL TEST RESULTS (PhD Level)
// ============================================================================

export interface StatisticalTestResults {
  // Normality Tests
  normality: {
    jarque_bera: {
      statistic: number;
      p_value: number;
      is_normal: boolean;
      interpretation: string;
    };
    shapiro_wilk: {
      statistic: number;
      p_value: number;
      is_normal: boolean;
    };
    anderson_darling: {
      statistic: number;
      p_value: number;
      is_normal: boolean;
    };
  };

  // Stationarity Tests
  stationarity: {
    augmented_dickey_fuller: {
      statistic: number;
      p_value: number;
      is_stationary: boolean;
      critical_values: {
        '1%': number;
        '5%': number;
        '10%': number;
      };
    };
    kpss: {
      statistic: number;
      p_value: number;
      is_stationary: boolean;
    };
    phillips_perron: {
      statistic: number;
      p_value: number;
      is_stationary: boolean;
    };
  };

  // Autocorrelation Tests
  autocorrelation: {
    ljung_box: {
      statistic: number;
      p_value: number;
      is_white_noise: boolean;
      lags: number;
    };
    box_pierce: {
      statistic: number;
      p_value: number;
      is_white_noise: boolean;
      lags: number;
    };
    durbin_watson: {
      statistic: number;
      p_value: number;
      autocorrelation_present: boolean;
    };
  };

  // Heteroskedasticity Tests
  heteroskedasticity: {
    breusch_pagan: {
      statistic: number;
      p_value: number;
      is_homoskedastic: boolean;
    };
    white_test: {
      statistic: number;
      p_value: number;
      is_homoskedastic: boolean;
    };
    arch_lm: {
      statistic: number;
      p_value: number;
      arch_effects: boolean;
    };
  };

  // Distribution Fit Tests
  distribution_fit: {
    kolmogorov_smirnov: {
      statistic: number;
      p_value: number;
      distribution: string;
      fits: boolean;
    };
    cramer_von_mises: {
      statistic: number;
      p_value: number;
      fits: boolean;
    };
    anderson_darling: {
      statistic: number;
      p_value: number;
      fits: boolean;
    };
  };

  // Outlier Tests
  outliers: {
    grubbs: {
      outliers: number[];
      test_statistics: number[];
      p_values: number[];
      significance_level: number;
    };
    mahalanobis: {
      outliers: number[];
      distances: number[];
      threshold: number;
    };
    cooks_distance: {
      high_influence: number[];
      distances: number[];
      threshold: number;
    };
  };

  // Model Comparison
  model_selection: {
    akaike_information_criterion: number;
    bayesian_information_criterion: number;
    adjusted_r_squared: number;
    r_squared: number;
    log_likelihood: number;
  };
}

// ============================================================================
// MONTE CARLO VALIDATION
// ============================================================================

export interface MonteCarloValidation {
  // Backtest vs Forecast Comparison
  forecast_accuracy: {
    mean_directional_accuracy: number;
    mean_absolute_error: number;
    mean_squared_error: number;
    root_mean_squared_error: number;
    mean_absolute_percentage_error: number;
    symmetric_mean_absolute_percentage_error: number;
    theils_u_statistic: number;
  };

  // Distribution Tests
  distribution_tests: {
    kolmogorov_smirnov_test: {
      statistic: number;
      p_value: number;
      null_hypothesis: string;
    };
    anderson_darling_test: {
      statistic: number;
      p_value: number;
    };
  };

  // Tail Risk Capture
  tail_risk: {
    var_forecast_vs_actual: {
      var_95_diff: number;
      var_99_diff: number;
      cvar_95_diff: number;
      cvar_99_diff: number;
    };
    tail_index_capture: {
      estimated_tail_index: number;
      actual_tail_index: number;
      error_pct: number;
    };
    extreme_value_capture: {
      forecasted_extremes: number[];
      actual_extremes: number[];
      capture_rate: number;
    };
  };

  // Path Convergence
  path_convergence: {
    path_divergence_metric: number;
    average_correlation: number;
    min_correlation: number;
    max_correlation: number;
  };

  // Calibration
  calibration: {
    confidence_interval_coverage: {
      ci_50_coverage: number;
      ci_90_coverage: number;
      ci_95_coverage: number;
      ci_99_coverage: number;
    };
    pit_histogram: {
      chi_squared_statistic: number;
      p_value: number;
      is_well_calibrated: boolean;
    };
  };

  // Path Analysis
  path_analysis: {
    levy_vs_normal_performance: {
      levy_paths_mean_return: number;
      normal_paths_mean_return: number;
      improvement_pct: number;
    };
    fat_tail_events_capture: {
      forecast_fat_tail_count: number;
      actual_fat_tail_count: number;
      capture_rate: number;
    };
  };
}

// ============================================================================
// AGENT CLASSIFICATION METRICS
// ============================================================================

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;

  // Classification Metrics
  classification_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
    specificity: number;
    sensitivity: number;

    // By Class
    precision_approved: number;
    precision_rejected: number;
    recall_approved: number;
    recall_rejected: number;
  };

  // Confusion Matrix
  confusion_matrix: {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
  };

  // Probabilistic Metrics
  probabilistic: {
    log_loss: number;
    brier_score: number;
    expected_calibration_error: number;
    reliability_score: number;
  };

  // ROC Curve
  roc_curve: {
    auc: number;
    tpr_at_fpr_001: number;
    tpr_at_fpr_005: number;
    tpr_at_fpr_01: number;
    optimal_threshold: number;
  };

  // Calibration Curve
  calibration: {
    calibration_data: {
      predicted_prob: number;
      actual_freq: number;
      sample_size: number;
    }[];
    calibration_slope: number;
    calibration_intercept: number;
    hosmer_lemeshow_p: number;
  };

  // Historical Performance
  historical: {
    decisions_count: number;
    accuracy_trend: number[]; // Moving average
    current_streak: number;
    current_streak_type: 'correct' | 'incorrect';
    longest_correct_streak: number;
    longest_incorrect_streak: number;
  };

  // Contribution Analysis
  contribution: {
    information_gain: number;
    shap_value: number;
    mutual_information: number;
    correlation_weight: number;
    weighted_vote_weight: number;
  };
}

// ============================================================================
// KELLY CRITERION VALIDATION
// ============================================================================

export interface KellyValidation {
  // Backtest with Different Kelly Strategies
  strategy_comparison: {
    full_kelly: BacktestSummary;
    half_kelly: BacktestSummary;
    quarter_kelly: BacktestSummary;
    fixed_5_percent: BacktestSummary;
    fixed_3_percent: BacktestSummary;
    no_leverage: BacktestSummary;
  };

  // Sensitivity Analysis
  sensitivity_analysis: {
    correlation_sensitivity: {
      correlation_0_0: BacktestSummary;
      correlation_0_2: BacktestSummary;
      correlation_0_4: BacktestSummary;
      correlation_0_6: BacktestSummary;
      correlation_0_8: BacktestSummary;
    };
    threshold_sensitivity: {
      threshold_1_0: BacktestSummary;
      threshold_1_5: BacktestSummary;
      threshold_2_0: BacktestSummary;
      threshold_2_5: BacktestSummary;
      threshold_3_0: BacktestSummary;
    };
    volatility_sensitivity: {
      vol_0_5x: BacktestSummary;
      vol_0_75x: BacktestSummary;
      vol_1_0x: BacktestSummary; // baseline
      vol_1_25x: BacktestSummary;
      vol_1_5x: BacktestSummary;
    };
  };

  // Optimal Kelly vs Actual
  kelly_optimization: {
    theoretical_optimal: number;
    recommended_position: number;
    actual_used: number;
    efficiency: number; // actual / theoretical
    overbetting_periods: number;
    underbetting_periods: number;
  };

  // Risk Metrics
  risk_analysis: {
    probability_of_ruin: number;
    expected_time_to_ruin: number;
    risk_of_ruin_5pct: number;
    kelly_heuristic: {
      numerator: number;
      denominator: number;
      edge: number;
      odds: number;
    };
  };
}

// ============================================================================
// STRESS TEST SCENARIOS
// ============================================================================

export interface StressTestScenario {
  scenario_id: string;
  scenario_name: string;
  scenario_type: 'historical' | 'synthetic' | 'extreme';
  description: string;

  // Scenario Parameters
  parameters: {
    spread_shock_pct: number;
    liquidity_shock_pct: number;
    gas_price_multiplier: number;
    volatility_multiplier: number;
    correlation_breakdown: boolean;
    black_swan_probability: number;
  };

  // Results Under Stress
  results: {
    total_return: number;
    max_drawdown: number;
    sharpe_ratio: number;
    win_rate: number;
    avg_trade_slippage_pct: number;

    // Tail Risk
    var_99: number;
    cvar_99: number;
    tail_loss_probability: number;

    // Survival
    survives_scenario: boolean;
    recovery_time_days: number;
    worst_single_trade: number;
  };

  // Model Behavior
  model_behavior: {
    agent_consensus_rate: number;
    kelly_avg_position: number;
    monte_carlo_convergence: number;
    confidence_intervals: {
      low: number;
      high: number;
      width: number;
    };
  };
}

export interface StressTestSuite {
  test_date: string;
  baseline_scenario: BacktestSummary;
  stress_scenarios: StressTestScenario[];

  // Scenario Categories
  categories: {
    historical_crashes: StressTestScenario[]; // 2008, 2020, FTX, Luna, etc.
    synthetic_extreme: StressTestScenario[];   // Custom shocks
    regime_changes: StressTestScenario[];      // Market regime shifts
    black_swan: StressTestScenario[];          // Tail events
    liquidity_crisis: StressTestScenario[];    // DEX liquidity freeze
    gas_spiral: StressTestScenario[];         // Extreme gas prices
  };

  // Aggregate Results
  aggregate_metrics: {
    worst_case_return: number;
    worst_case_drawdown: number;
    average_drawdown_scenarios: number;
    scenario_survival_rate: number;
    tail_risk_exposure: number;
  };
}

// ============================================================================
// SYNTHETIC DATA GENERATION
// ============================================================================

export interface SyntheticDataTest {
  test_id: string;
  generation_date: string;

  // Generation Parameters
  parameters: {
    num_synthetic_opportunities: number;
    spread_distribution: {
      type: 'normal' | 'lognormal' | 'student_t' | 'gamma';
      mean: number;
      std: number;
      dof?: number; // for student_t
    };
    liquidity_distribution: {
      type: 'normal' | 'lognormal' | 'gamma';
      mean: number;
      std: number;
    };
    gas_price_distribution: {
      type: 'normal' | 'lognormal';
      mean: number;
      std: number;
    };
    correlation_structure: {
      type: 'constant' | 'dynamic' | 'breakdown';
      base_correlation: number;
      breakdown_probability: number;
    };
  };

  // Results on Synthetic Data
  results: BacktestSummary;

  // Validation
  validation: {
    statistical_power: number;
    type_i_error_rate: number;
    type_ii_error_rate: number;
    false_discovery_rate: number;
  };
}

// ============================================================================
// EXPORT FORMATS (LLM-Ready)
// ============================================================================

export interface LLMExportFormat {
  export_date: string;
  export_version: string;

  // Summary (LLM prompt)
  summary_for_llm: string;

  // Structured Data
  structured_data: {
    backtest_results: BacktestSummary;
    model_variants: ModelVariant[];
    stress_tests: StressTestSuite;
    synthetic_tests: SyntheticDataTest[];
    statistical_tests: StatisticalTestResults;
  };

  // Tabular Data (CSV format)
  tabular_data: {
    backtest_summary_csv: string;
    variant_comparison_csv: string;
    stress_scenarios_csv: string;
    statistical_tests_csv: string;
    agent_performance_csv: string;
    kelly_validation_csv: string;
  };

  // Metadata
  metadata: {
    model_version: string;
    test_period_days: number;
    number_of_variants_tested: number;
    confidence_level: number;
    significance_level: number;
  };
}

// ============================================================================
// EXPANDABLE TABLE DATA
// ============================================================================

export interface ExpandableTableData {
  table_id: string;
  title: string;

  // Table Config
  config: {
    is_expandable: boolean;
    is_collapsible: boolean;
    default_state: 'expanded' | 'collapsed';
    max_rows_collapsed: number;
  };

  // Data
  columns: {
    key: string;
    title: string;
    type: 'string' | 'number' | 'percentage' | 'boolean' | 'currency';
    sortable: boolean;
    format?: string; // Number formatting
  }[];

  rows: {
    id: string;
    data: Record<string, any>;
    highlight_condition?: string; // Conditional highlighting
  }[];

  // Export Options
  export_formats: {
    csv: boolean;
    json: boolean;
    excel: boolean;
    clipboard: boolean;
  };
}
