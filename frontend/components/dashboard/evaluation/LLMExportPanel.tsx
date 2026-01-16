'use client';

import { useState } from 'react';
import { LLMExportFormat } from '@/types/evaluation';
import { copyLLMSummary, exportLLMData } from '@/lib/llmExport';

interface LLMExportPanelProps {
  data: LLMExportFormat;
}

export default function LLMExportPanel({ data }: LLMExportPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    try {
      await copyLLMSummary(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleExportJSON = () => {
    exportLLMData(data);
  };

  return (
    <div style={{
      border: 'var(--border-thick)',
      background: 'var(--base-raw-white)'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'linear-gradient(135deg, var(--bg-layer-1) 0%, var(--bg-layer-2) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <div style={{
            padding: 'var(--space-1) var(--space-3)',
            border: 'var(--border-thick)',
            background: 'linear-gradient(135deg, var(--accent-financial-blue) 0%, var(--accent-cyan) 100%)',
            color: 'var(--text-white)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: '0 0 20px rgba(0, 102, 255, 0.3)'
          }}>
            EXPORT
          </div>
          <div className="annotation" style={{ margin: 0 }}>
            Structured Data Export • JSON Format • Analysis Ready
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-2)'
        }}>
          <button
            onClick={handleCopySummary}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              border: 'var(--border-thick)',
              background: copied ? 'var(--success-ag-green)' : 'var(--bg-layer-2)',
              color: copied ? 'var(--ink-charcoal)' : 'var(--text-white)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
              boxShadow: copied ? '0 0 15px rgba(0, 255, 136, 0.5)' : 'none'
            }}
          >
            {copied ? '[✓ COPIED]' : '[COPY SUMMARY]'}
          </button>
          <button
            onClick={handleExportJSON}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              border: 'var(--border-thick)',
              background: 'var(--bg-layer-2)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            [EXPORT JSON]
          </button>
        </div>
      </div>

      {/* Export Info */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)'
        }}>
          <div>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)'
            }}>
              Export Date
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-white)'
            }}>
              {new Date(data.export_date).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)'
            }}>
              Export Version
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-white)'
            }}>
              {data.export_version}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)'
            }}>
              Model Version
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-white)'
            }}>
              {data.metadata.model_version}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-1)'
            }}>
              Confidence Level
            </div>
            <div style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              color: 'var(--accent-cyan)'
            }}>
              {(data.metadata.confidence_level * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Data Structure Overview */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: 'var(--border-thick)',
        background: 'var(--bg-layer-2)'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 'var(--space-3)',
          color: 'var(--text-white)'
        }}>
          Data Structure
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-3)'
        }}>
          <DataStructCard
            title="Executive Summary"
            description="Natural language report for analysis"
            type="text/markdown"
            size={`${data.summary_for_llm.length.toLocaleString()} chars`}
          />
          <DataStructCard
            title="Structured Data"
            description="Typed JSON objects for programmatic analysis"
            type="application/json"
            size="6 objects"
          />
          <DataStructCard
            title="Tabular Data"
            description="CSV-formatted tables for spreadsheet analysis"
            type="text/csv"
            size={`${Object.keys(data.tabular_data).length} tables`}
          />
          <DataStructCard
            title="Metadata"
            description="Test parameters and configuration"
            type="metadata"
            size="5 fields"
          />
        </div>
      </div>

      {/* Preview Section */}
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--base-raw-white)'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 'var(--space-3)',
          color: 'var(--text-white)'
        }}>
          Summary Preview (First 500 chars)
        </div>
        <div style={{
          padding: 'var(--space-3)',
          border: 'var(--border-thick)',
          background: 'var(--bg-layer-1)',
          fontFamily: 'var(--font-data)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          maxHeight: '200px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.6
        }}>
          {data.summary_for_llm.substring(0, 500)}
          {data.summary_for_llm.length > 500 && '...'}
        </div>
      </div>

      {/* Use Cases */}
      <div style={{
        padding: 'var(--space-4)',
        borderTop: 'var(--border-thick)',
        background: 'var(--bg-layer-2)',
        borderBottom: 'var(--border-thick)'
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 'var(--space-3)',
          color: 'var(--text-white)'
        }}>
          Export Applications
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-3)'
        }}>
          {[
            {
              title: 'Automated Reporting',
              description: 'Generate quarterly performance reports with detailed analysis'
            },
            {
              title: 'Risk Assessment',
              description: 'Comprehensive risk analysis based on stress test results'
            },
            {
              title: 'Model Comparison',
              description: 'Detailed insights comparing model variant performance'
            },
            {
              title: 'Strategy Optimization',
              description: 'Data-driven recommendations for parameter tuning'
            }
          ].map((useCase, i) => (
            <div
              key={i}
              style={{
                padding: 'var(--space-3)',
                border: 'var(--border-thin)',
                background: 'var(--bg-layer-1)',
                borderLeft: '3px solid var(--accent-financial-blue)'
              }}
            >
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                marginBottom: 'var(--space-1)',
                color: 'var(--text-white)'
              }}>
                {useCase.title}
              </div>
              <div style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-muted)',
                lineHeight: 1.4
              }}>
                {useCase.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Integration Hint */}
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--base-raw-white)'
      }}>
        <div style={{
          padding: 'var(--space-3)',
          border: 'var(--border-thick)',
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)',
          borderLeft: '4px solid var(--accent-financial-blue)'
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-2)',
            color: 'var(--accent-financial-blue)'
          }}>
            [INTEGRATION]
          </div>
          <div style={{
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            The exported JSON follows a structured schema for data analysis. Use the <code style={{
              padding: '2px 6px',
              background: 'var(--bg-layer-2)',
              border: 'var(--border-thin)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.75rem'
            }}>summary_for_llm</code> field for reporting context and <code style={{
              padding: '2px 6px',
              background: 'var(--bg-layer-2)',
              border: 'var(--border-thin)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.75rem'
            }}>structured_data</code> for programmatic analysis.
          </div>
        </div>
      </div>
    </div>
  );
}

interface DataStructCardProps {
  title: string;
  description: string;
  type: string;
  size: string;
}

function DataStructCard({ title, description, type, size }: DataStructCardProps) {
  return (
    <div style={{
      padding: 'var(--space-3)',
      border: 'var(--border-thin)',
      background: 'var(--base-raw-white)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--text-white)'
        }}>
          {title}
        </div>
        <div style={{
          padding: '2px 8px',
          border: 'var(--border-thin)',
          background: 'var(--bg-layer-2)',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-cyan)',
          fontWeight: 600
        }}>
          {type}
        </div>
      </div>
      <div style={{
        fontSize: '0.75rem',
        fontFamily: 'var(--font-body)',
        color: 'var(--text-muted)',
        lineHeight: 1.4
      }}>
        {description}
      </div>
      <div style={{
        fontSize: '0.7rem',
        fontFamily: 'var(--font-data)',
        color: 'var(--text-muted)',
        fontWeight: 600
      }}>
        {size}
      </div>
    </div>
  );
}
