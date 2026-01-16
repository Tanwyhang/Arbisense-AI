'use client';

import { useEffect, useRef, useState } from 'react';
import { NetworkPolygon } from '@web3icons/react';

interface LetterGlitchProps {
  glitchColors?: string[];
  className?: string;
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
}

const LetterGlitch = ({
  glitchColors = ['#0066ff', '#00d4ff', '#0a1929'],
  className = '',
  glitchSpeed = 80,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$€£¥₿@#%&*'
}: LetterGlitchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const letters = useRef<any[]>([]);
  const grid = useRef({ columns: 0, rows: 0 });
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const lastGlitchTime = useRef(Date.now());

  const lettersAndSymbols = Array.from(characters);

  const fontSize = 42;
  const charWidth = 27;
  const charHeight = 56;

  const getRandomChar = () => {
    return lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)];
  };

  const getRandomColor = () => {
    return glitchColors[Math.floor(Math.random() * glitchColors.length)];
  };

  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  };

  const interpolateColor = (start: any, end: any, factor: number) => {
    const result = {
      r: Math.round(start.r + (end.r - start.r) * factor),
      g: Math.round(start.g + (end.g - start.g) * factor),
      b: Math.round(start.b + (end.b - start.b) * factor)
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
  };

  const calculateGrid = (width: number, height: number) => {
    const columns = Math.ceil(width / charWidth);
    const rows = Math.ceil(height / charHeight);
    return { columns, rows };
  };

  const initializeLetters = (columns: number, rows: number) => {
    grid.current = { columns, rows };
    const totalLetters = columns * rows;
    letters.current = Array.from({ length: totalLetters }, () => ({
      char: getRandomChar(),
      color: getRandomColor(),
      targetColor: getRandomColor(),
      colorProgress: 1
    }));
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (context.current) {
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const { columns, rows } = calculateGrid(rect.width, rect.height);
    initializeLetters(columns, rows);

    drawLetters();
  };

  const drawLetters = () => {
    if (!context.current || letters.current.length === 0) return;
    const ctx = context.current;
    const { width, height } = canvasRef.current!.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fontSize}px 'IBM Plex Mono', monospace`;
    ctx.textBaseline = 'top';

    letters.current.forEach((letter, index) => {
      const x = (index % grid.current.columns) * charWidth;
      const y = Math.floor(index / grid.current.columns) * charHeight;
      ctx.fillStyle = letter.color;
      ctx.fillText(letter.char, x, y);
    });
  };

  const updateLetters = () => {
    if (!letters.current || letters.current.length === 0) return;

    const updateCount = Math.max(1, Math.floor(letters.current.length * 0.03));

    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * letters.current.length);
      if (!letters.current[index]) continue;

      letters.current[index].char = getRandomChar();
      letters.current[index].targetColor = getRandomColor();

      if (!smooth) {
        letters.current[index].color = letters.current[index].targetColor;
        letters.current[index].colorProgress = 1;
      } else {
        letters.current[index].colorProgress = 0;
      }
    }
  };

  const handleSmoothTransitions = () => {
    let needsRedraw = false;
    letters.current.forEach(letter => {
      if (letter.colorProgress < 1) {
        letter.colorProgress += 0.08;
        if (letter.colorProgress > 1) letter.colorProgress = 1;

        const startRgb = hexToRgb(letter.color);
        const endRgb = hexToRgb(letter.targetColor);
        if (startRgb && endRgb) {
          letter.color = interpolateColor(startRgb, endRgb, letter.colorProgress);
          needsRedraw = true;
        }
      }
    });

    if (needsRedraw) {
      drawLetters();
    }
  };

  const animate = () => {
    const now = Date.now();
    if (now - lastGlitchTime.current >= glitchSpeed) {
      updateLetters();
      drawLetters();
      lastGlitchTime.current = now;
    }

    if (smooth) {
      handleSmoothTransitions();
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    context.current = canvas.getContext('2d');
    resizeCanvas();
    animate();

    let resizeTimeout: any;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        resizeCanvas();
        animate();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [glitchSpeed, smooth]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden'
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%'
  };

  const outerVignetteStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(0,0,0,0.95) 100%)'
  };

  const centerVignetteStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%)'
  };

  return (
    <div style={containerStyle} className={className}>
      <canvas ref={canvasRef} style={canvasStyle} />
      {outerVignette && <div style={outerVignetteStyle}></div>}
      {centerVignette && <div style={centerVignetteStyle}></div>}
    </div>
  );
};

export default function HomePage() {
  const [sectionVisible, setSectionVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setSectionVisible(true), 100);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Hero Section - Brutalist Terminal */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 0
      }}>
        {/* Left Column - Content */}
        <div style={{
          padding: 'clamp(40px, 8vw, 80px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: '2px solid #0066ff',
          position: 'relative',
          background: '#000000',
          overflow: 'hidden'
        }}>
          {/* Marble Background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/marble.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
            filter: 'sepia(100%) hue-rotate(190deg) saturate(400%) contrast(120%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* Content Wrapper for z-index */}
          <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Status Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '60px',
            fontSize: '12px',
            fontFamily: "'Space Mono', monospace",
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out forwards'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                background: '#00ff88',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }}></span>
              <span style={{ color: '#00ff88' }}>SYSTEM ONLINE</span>
            </div>
            <span style={{ color: '#666666' }}>│</span>
            <span style={{ color: '#b8bfc7' }}>ARBITRUM MAINNET</span>
            <span style={{ color: '#666666' }}>│</span>
            <span style={{ color: '#b8bfc7' }}>LATENCY: 47ms</span>
          </div>

          {/* Main Title */}
          <div style={{
            opacity: 0,
            animation: 'slide-up 0.8s ease-out 0.2s forwards'
          }}>
            <h1 style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 'clamp(48px, 10vw, 120px)',
              fontWeight: 700,
              lineHeight: 0.85,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              marginBottom: '24px',
              textTransform: 'uppercase'
            }}>
              Arbi
              <span style={{
                color: '#0066ff'
              }}>sense</span> AI
            </h1>

            {/* Subtitle */}
            <div style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              fontFamily: "'Space Mono', monospace",
              color: '#b8bfc7',
              lineHeight: 1.6,
              marginBottom: '48px',
              maxWidth: '600px',
              letterSpacing: '0.05em'
            }}>
              <span style={{ color: '#0066ff', fontWeight: 700 }}>AI-POWERED</span>{' '}
              arbitrage analysis terminal.
              <br />
              Bloomberg-grade precision for DeFi.
            </div>

            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: '#1a1a1a',
              border: '1px solid #1a1a1a',
              marginBottom: '48px',
              maxWidth: '600px',
              opacity: 0,
              animation: 'fade-in 0.6s ease-out 0.6s forwards'
            }}>
              {[
                { label: 'Exec', value: '847ms' },
                { label: 'SLA', value: '99.9%' },
                { label: 'Uptime', value: '100%' }
              ].map((metric, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: '#000000',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#666666',
                    letterSpacing: '0.1em',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {metric.label}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#00d4ff',
                    fontFamily: "'Chakra Petch', sans-serif"
                  }}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              gap: '16px',
              opacity: 0,
              animation: 'fade-in 0.6s ease-out 0.8s forwards'
            }}>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  padding: '16px 32px',
                  background: '#0066ff',
                  border: 'none',
                  color: '#000000',
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#00d4ff';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0066ff';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                [ Launch Terminal ]
              </button>

              <button
                onClick={() => window.location.href = '/evaluation'}
                style={{
                  padding: '16px 32px',
                  background: 'transparent',
                  border: '2px solid #0066ff',
                  color: '#0066ff',
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0066ff';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#0066ff';
                }}
              >
                [ View Metrics ]
              </button>
            </div>
          </div>

          {/* Corner Accents */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '60px',
            height: '60px',
            borderTop: '3px solid #0066ff',
            borderLeft: '3px solid #0066ff',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out 1s forwards'
          }}></div>

          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '60px',
            height: '60px',
            borderBottom: '3px solid #0066ff',
            borderRight: '3px solid #0066ff',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out 1s forwards'
          }}></div>
          </div>
        </div>

        {/* Right Column - Subtle Glitch Element */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px',
          overflow: 'hidden'
        }}>
          {/* Marble Background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/marble.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
            filter: 'sepia(100%) hue-rotate(190deg) saturate(400%) contrast(120%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* Glass Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            zIndex: 0
          }} />

          {/* Content Wrapper */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Terminal Header */}
          <div style={{
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(10, 10, 10, 0.6)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out 0.4s forwards'
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '11px',
              color: '#666666',
              letterSpacing: '0.1em'
            }}>
              TERMINAL_v1.0.4
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#00ff88',
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }}></div>
              <div style={{
                fontSize: '10px',
                fontFamily: "'Space Mono', monospace",
                color: '#00ff88',
                letterSpacing: '0.1em'
              }}>
                ACTIVE
              </div>
            </div>
          </div>

          {/* Small Glitch Display */}
          <div style={{
            flex: 1,
            border: '2px solid #0066ff',
            position: 'relative',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out 0.6s forwards',
            background: 'rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '12px',
              zIndex: 10,
              fontFamily: "'Space Mono', monospace",
              fontSize: '10px',
              color: '#666666',
              letterSpacing: '0.1em'
            }}>
              LIVE_DATA_STREAM
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              opacity: 1
            }}>

              <div style={{ opacity: 0.4, height: '100%', width: '100%' }}>
                <LetterGlitch
                  glitchColors={['#0066ff', '#00d4ff', '#ffffff']}
                  glitchSpeed={100}
                  centerVignette={false}
                  outerVignette={true}
                  smooth={true}
                  characters='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$€£¥₿ARBISENSE'
                />
              </div>
              
              {/* Centered Polygon Icon Overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                opacity: 1
              }}>
                <NetworkPolygon variant="mono" size={320} color="#ffffff" />
              </div>
            </div>

            {/* Terminal Footer */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px 12px',
              background: 'rgba(10, 10, 10, 0.8)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              color: '#666666',
              letterSpacing: '0.05em'
            }}>
              <div>PATH: /usr/bin/arbisense</div>
              <div>PID: 8472</div>
            </div>
          </div>

          {/* Terminal Info */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(10, 10, 10, 0.6)',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out 0.8s forwards'
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '11px',
              color: '#b8bfc7',
              lineHeight: 1.8,
              letterSpacing: '0.05em'
            }}>
              <div style={{ color: '#666666', marginBottom: '8px' }}>
                /// SYSTEM STATUS
              </div>
              <div>MULTI-AGENT CONSENSUS: <span style={{ color: '#00ff88' }}>ACTIVE</span></div>
              <div>MONTE CARLO SIMULATION: <span style={{ color: '#00ff88' }}>RUNNING</span></div>
              <div>KELLY OPTIMIZER: <span style={{ color: '#00ff88' }}>ENABLED</span></div>
              <div>STRESS TEST ENGINE: <span style={{ color: '#00ff88' }}>READY</span></div>
            </div>
          </div>
          </div> {/* End Content Wrapper */}
        </div>
      </section>

      {/* Features Strip */}
      <section style={{
        background: '#000000',
        borderTop: '2px solid #0066ff',
        padding: '80px 40px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            marginBottom: '60px',
            opacity: 0,
            animation: 'fade-in 0.6s ease-out forwards'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              border: '1px solid #0066ff',
              background: 'transparent',
              color: '#0066ff',
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '24px'
            }}>
              [ CAPABILITIES ]
            </div>

            <h2 style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1
            }}>
              TERMINAL FEATURES
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: '#1a1a1a'
          }}>
            {[
              {
                num: '01',
                title: 'REALTIME ANALYSIS',
                desc: 'Multi-agent consensus with 2/3 approval. Sub-1100ms execution.'
              },
              {
                num: '02',
                title: 'MONTE CARLO',
                desc: '80-path Lévy flights. CVaR, VaR, fat-tail capture.'
              },
              {
                num: '03',
                title: 'KELLY CRITERION',
                desc: 'Optimal position sizing. Correlation adjustments.'
              },
              {
                num: '04',
                title: 'STRESS TESTING',
                desc: '2008, 2020 crashes. Black swan scenarios.'
              },
              {
                num: '05',
                title: 'PHD METRICS',
                desc: 'Normality, stationarity, heteroskedasticity tests.'
              },
              {
                num: '06',
                title: 'DATA EXPORT',
                desc: 'Structured JSON. CSV tables. API-ready.'
              }
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  padding: '40px 32px',
                  background: '#000000',
                  border: '1px solid transparent',
                  transition: 'all 0.3s ease',
                  opacity: 0,
                  animation: `fade-in 0.6s ease-out ${0.2 + i * 0.1}s forwards`,
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066ff';
                  e.currentTarget.style.background = '#0a0a0a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = '#000000';
                }}
              >
                <div style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '48px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '16px',
                  opacity: 1
                }}>
                  {feature.num}
                </div>

                <h3 style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0066ff',
                  marginBottom: '12px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  {feature.title}
                </h3>

                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '13px',
                  color: '#b8bfc7',
                  lineHeight: 1.6,
                  letterSpacing: '0.02em'
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#000000',
        borderTop: '2px solid #0066ff',
        padding: '40px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '11px',
            color: '#666666',
            letterSpacing: '0.1em'
          }}>
            © 2026 ARBISENSE AI
          </div>

          <div style={{
            padding: '12px 20px',
            border: '1px solid #ff3d3d',
            background: 'rgba(255, 61, 61, 0.05)',
            color: '#ff3d3d',
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}>
            [ SYNTHETIC_DATA ] • NOT_FINANCIAL_ADVICE
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
