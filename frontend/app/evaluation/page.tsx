'use client';

import { useEffect, useState } from 'react';
import BacktestSummary from '@/components/evaluation/BacktestSummary';
import ModelVariantComparison from '@/components/evaluation/ModelVariantComparison';
import StressTestDashboard from '@/components/evaluation/StressTestDashboard';
import StatisticalTestsPanel from '@/components/evaluation/StatisticalTestsPanel';
import LLMExportPanel from '@/components/evaluation/LLMExportPanel';
import {
  generateSyntheticBacktest,
  generateModelVariants,
  generateStressTestScenarios,
  generateModelComparison
} from '@/lib/syntheticBacktestData';
import { generateLLMExport } from '@/lib/llmExport';
import { BacktestSummary as BacktestSummaryType, ModelVariant, StressTestSuite, StatisticalTestResults, LLMExportFormat } from '@/types/evaluation';

export default function EvaluationPage() {
  const [backtestData, setBacktestData] = useState<BacktestSummaryType | null>(null);
  const [modelComparisonData, setModelComparisonData] = useState<ModelVariant[]>([]);
  const [stressTestData, setStressTestData] = useState<StressTestSuite | null>(null);
  const [llmExportData, setLlmExportData] = useState<LLMExportFormat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate synthetic data
    const backtest = generateSyntheticBacktest(12345);
    const variants = generateModelVariants(5);
    const stressTests = generateStressTestScenarios();

    setBacktestData(backtest);
    setModelComparisonData(variants);
    setStressTestData(stressTests);

    // Generate LLM export data
    const llmData = generateLLMExport({
      backtest: backtest,
      modelVariants: variants,
      stressTests: stressTests,
      statisticalTests: variants[0].statistical_tests,
      modelVersion: '1.0.0',
      confidenceLevel: 0.95,
      significanceLevel: 0.05
    });
    setLlmExportData(llmData);

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        background: 'var(--terminal-black)'
      }}>
        <div style={{
          fontSize: '2rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          color: 'var(--accent-financial-blue)',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          ARBISENSE
        </div>
        <div style={{
          fontFamily: 'var(--font-data)',
          color: 'var(--text-muted)'
        }}>
          Loading evaluation suite...
        </div>
      </div>
    );
  }

  // Get statistical tests from first variant
  const statisticalTestsData = modelComparisonData[0]?.statistical_tests;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--terminal-black)',
      paddingBottom: 'var(--space-8)'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-6) var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--terminal-panel-blue)',
        borderLeft: '4px solid var(--accent-financial-blue)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-3)'
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-2)',
              background: 'linear-gradient(135deg, var(--text-white) 0%, var(--accent-financial-blue) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              MODEL EVALUATION SUITE
            </h1>
            <div className="annotation">
              PhD-Level Validation • Bloomberg Terminal Precision • Synthetic Test Data
            </div>
          </div>
          <div style={{
            padding: 'var(--space-3)',
            border: 'var(--border-thick)',
            background: 'var(--bg-layer-1)',
            textAlign: 'right'
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: '4px'
            }}>
              Status
            </div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              fontFamily: 'var(--font-data)',
              color: 'var(--success-ag-green)'
            }}>
              ACTIVE
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-4)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-data)',
          color: 'var(--text-muted)',
          flexWrap: 'wrap'
        }}>
          <span>[1] Backtest Performance</span>
          <span>[2] Model Variant Comparison</span>
          <span>[3] Stress Test Scenarios</span>
          <span>[4] Statistical Validation</span>
          <span>[5] Data Export</span>
        </div>
      </div>

      <div className="container" style={{
        paddingTop: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8)'
      }}>
        {/* Backtest Summary */}
        <section>
          <div style={{
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <div className="number-indicator">01</div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
                margin: 0,
                color: 'var(--text-white)'
              }}>
                Backtest Performance Summary
              </h2>
              <div className="annotation" style={{ margin: 0 }}>
                Comprehensive metrics including Sharpe, Sortino, Calmar, drawdown analysis, VaR/CVaR
              </div>
            </div>
          </div>
          {backtestData && <BacktestSummary data={backtestData} />}
        </section>

        {/* Model Variant Comparison */}
        <section>
          <div style={{
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <div className="number-indicator">02</div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
                margin: 0,
                color: 'var(--text-white)'
              }}>
                Model Variant Comparison
              </h2>
              <div className="annotation" style={{ margin: 0 }}>
                A/B testing across multiple model configurations with hyperparameter analysis
              </div>
            </div>
          </div>
          <ModelVariantComparison
            data={{
              variants: modelComparisonData,
              tested_date: new Date().toISOString().split('T')[0],
              test_period_days: 365,
              number_of_variants: modelComparisonData.length,
              best_variant: modelComparisonData[0].variant_id,
              improvement_over_baseline: {
                sharpe_improvement_pct: 15.5,
                return_improvement_pct: 22.3,
                drawdown_reduction_pct: 18.7
              }
            }}
          />
        </section>

        {/* Stress Test Dashboard */}
        <section>
          <div style={{
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <div className="number-indicator">03</div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
                margin: 0,
                color: 'var(--text-white)'
              }}>
                Stress Test Scenarios
              </h2>
              <div className="annotation" style={{ margin: 0 }}>
                Historical crashes, synthetic extreme events, black swans, liquidity crises
              </div>
            </div>
          </div>
          {stressTestData && <StressTestDashboard data={stressTestData} />}
        </section>

        {/* Statistical Tests Panel */}
        {statisticalTestsData && (
          <section>
            <div style={{
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)'
            }}>
              <div className="number-indicator">04</div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  margin: 0,
                  color: 'var(--text-white)'
                }}>
                  PhD-Level Statistical Validation
                </h2>
                <div className="annotation" style={{ margin: 0 }}>
                  Normality, stationarity, heteroskedasticity, autocorrelation, distribution fit tests
                </div>
              </div>
            </div>
            <StatisticalTestsPanel data={statisticalTestsData} />
          </section>
        )}

        {/* LLM Export Panel */}
        {llmExportData && (
          <section>
            <div style={{
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)'
            }}>
              <div className="number-indicator">05</div>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  margin: 0,
                  color: 'var(--text-white)'
                }}>
                  Data Export
                </h2>
                <div className="annotation" style={{ margin: 0 }}>
                  Structured export for automated reporting, risk analysis, and strategy optimization
                </div>
              </div>
            </div>
            <LLMExportPanel data={llmExportData} />
          </section>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        marginTop: 'var(--space-8)',
        padding: 'var(--space-4)',
        border: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        textAlign: 'center'
      }}>
        <div style={{
          padding: 'var(--space-2)',
          border: '1px solid var(--alert-signal-red)',
          background: 'rgba(255, 61, 61, 0.1)',
          color: 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)',
          fontWeight: 700,
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          display: 'inline-block'
        }}>
          [SYNTHETIC_DATA] • NOT_FINANCIAL_ADVICE • DEMONSTRATION_PURPOSES_ONLY
        </div>
      </footer>
    </div>
  );
}
