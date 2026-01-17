'use client';

import { useEffect, useState } from "react";
import { SimulationResponse } from "@/types/api";
import TopStrip from "@/components/terminal/TopStrip";

import TickerTape from "@/components/terminal/TickerTape";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketDataProvider } from "@/contexts/MarketDataContext";

async function fetchSimulation(): Promise<SimulationResponse> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const response = await fetch(`${backendUrl}/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pair: "USDC-USDT",
      dex_a: "Camelot",
      dex_b: "Sushiswap"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch simulation: ${response.statusText}`);
  }

  return response.json();
}

export default function DashboardPage() {
  const [data, setData] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await fetchSimulation();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}>
        <div style={{
          fontSize: '2rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          color: 'var(--accent-cyan)'
        }}>
          ARBISENSE
        </div>
        <div style={{
          fontFamily: 'var(--font-data)',
          color: 'var(--text-muted)'
        }}>
          Initializing terminal...
        </div>
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-2)'
        }}>
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-financial-blue)',
                animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 'var(--space-4)'
      }}>
        <div style={{
          fontSize: '1.5rem',
          color: 'var(--alert-signal-red)',
          fontFamily: 'var(--font-data)'
        }}>
          ERROR: {error || "Failed to load data"}
        </div>
        <a href="/" style={{
          padding: 'var(--space-2) var(--space-4)',
          border: '2px solid var(--accent-financial-blue)',
          color: 'var(--text-white)',
          textDecoration: 'none',
          fontFamily: 'var(--font-data)'
        }}>
          [RETURN_HOME]
        </a>
      </div>
    );
  }



  return (
    <MarketDataProvider autoConnect={true}>
      {/* Terminal Top Strip */}
      <TopStrip
        title="ARBISENSE"
        user="ADMIN"
        systemStatus="ONLINE"
      />

      {/* Ticker Tape */}
      <TickerTape />

      <div className="container" style={{
        paddingBottom: '50px',
      }}>
        {/* Terminal-style Info Header */}
        <header style={{
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-2)',
          borderBottom: '1px solid var(--border-dim)',
          background: 'rgba(5, 5, 5, 0.4)', // Slightly transparent
          padding: 'var(--space-3)',
          borderLeft: '3px solid var(--accent-financial-blue)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-2)'
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'var(--accent-financial-blue)',
              letterSpacing: '0.1em'
            }}>
              // ARBITRAGE_ANALYSIS_TERMINAL
            </div>
            <div style={{
              display: 'flex',
              gap: 'var(--space-3)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-data)',
              color: 'var(--text-muted)'
            }}>
              <span>PAIR: <span style={{ color: 'var(--accent-cyan)' }}>{data.opportunity.pair}</span></span>
              <span style={{ color: 'var(--grid-line)' }}>│</span>
              <span>{data.opportunity.dex_a} → {data.opportunity.dex_b}</span>
               <span style={{ color: 'var(--grid-line)' }}>│</span>
              <span>EXECUTION: <span style={{ color: data.total_computation_time_ms < 1100 ? 'var(--success-ag-green)' : 'var(--accent-amber)' }}>{data.total_computation_time_ms.toFixed(0)}ms</span></span>
            </div>
          </div>

           <div style={{
            display: 'flex',
            gap: 'var(--space-4)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-data)',
            color: 'var(--text-muted)',
            flexWrap: 'wrap'
          }}>
            <span>SYSTEM: ONLINE</span>
            <span style={{ color: 'var(--grid-line)' }}>│</span>
            <span>TARGET: &lt;1100ms</span>
            <span style={{ color: 'var(--grid-line)' }}>│</span>
            <span>BACKEND: CONNECTED</span>
            <span style={{ color: 'var(--grid-line)' }}>│</span>
            <span>LATENCY: 24ms</span>
            <span style={{ color: 'var(--grid-line)' }}>│</span>
            <span style={{ color: 'var(--accent-cyan)' }}>WS: <WebSocketStatus /></span>
          </div>
        </header>

        {/* Draggable Dashboard Layout */}
        <DashboardLayout data={data} />
      </div>


    </MarketDataProvider>
  );
}

// WebSocket status indicator component
function WebSocketStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    // Simulate connection status - will be replaced by actual context
    const timeout = setTimeout(() => {
      setStatus('connected');
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, []);
  
  return (
    <span style={{
      color: status === 'connected' 
        ? 'var(--success-ag-green)' 
        : status === 'connecting' 
          ? 'var(--accent-amber)'
          : 'var(--alert-signal-red)'
    }}>
      {status.toUpperCase()}
    </span>
  );
}
