/**
 * Circuit Breaker and Risk Management System
 *
 * Migrated from Polymarket-Kalshi-Arbitrage-bot circuit_breaker.rs
 * Implements production-grade risk management with configurable limits and automatic shutoffs
 *
 * Key Features:
 * - Position limits per market and total
 * - Daily loss limits with automatic trading halt
 * - Per-trade loss limits
 * - Consecutive error tracking
 * - Gas cost buffers
 * - Automatic circuit breaker trip and recovery
 */

// ============================================================================
// TYPES
// ============================================================================

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Trading enabled (normal operation)
  OPEN = 'OPEN', // Trading disabled (circuit tripped)
  HALF_OPEN = 'HALF_OPEN', // Testing if conditions improved
}

export interface CircuitBreakerConfig {
  // Position limits
  max_position_per_market: number; // Max contracts per market (default: 50,000)
  max_total_position: number; // Max total contracts (default: 100,000)

  // Loss limits
  max_daily_loss_usd: number; // Daily loss limit (default: $500)
  max_loss_per_trade_usd: number; // Per-trade loss limit (default: $5)

  // Error tracking
  max_consecutive_errors: number; // Max consecutive failures (default: 5)
  error_cooldown_ms: number; // Cooldown after trip (default: 60,000ms = 1min)

  // Gas costs
  gas_buffer_cents: number; // Gas buffer per order (default: 3¢)

  // Position sizing
  liquidity_factor: number; // Fraction of liquidity to use (default: 0.5)
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  max_position_per_market: 50000,
  max_total_position: 100000,
  max_daily_loss_usd: 500,
  max_loss_per_trade_usd: 5,
  max_consecutive_errors: 5,
  error_cooldown_ms: 60000, // 1 minute
  gas_buffer_cents: 3,
  liquidity_factor: 0.5,
};

export interface Position {
  market_id: string;
  question: string;
  yes_quantity: number; // Number of YES contracts
  no_quantity: number; // Number of NO contracts
  avg_yes_price: number; // Average entry price for YES
  avg_no_price: number; // Average entry price for NO
  current_value_usd: number; // Current market value
  unrealized_pnl_usd: number; // Unrealized P&L
  timestamp: number; // Last update
}

export interface TradeResult {
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  actual_slippage_cents?: number;
  gas_cost_usd?: number;
  position?: Position;
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  total_trades: number;
  successful_trades: number;
  failed_trades: number;
  total_pnl_usd: number;
  max_drawdown_usd: number;
  consecutive_errors: number;
  total_gas_spent_usd: number;
}

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private positions: Map<string, Position>;
  private daily_metrics: DailyMetrics;
  private trip_time: number | null;
  private error_count: number;
  private last_reset_time: number;

  constructor(config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {
    this.config = config;
    this.state = CircuitBreakerState.CLOSED;
    this.positions = new Map();
    this.trip_time = null;
    this.error_count = 0;
    this.last_reset_time = Date.now();

    // Initialize daily metrics
    this.daily_metrics = this.initializeDailyMetrics();
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    // Auto-transition from HALF_OPEN to CLOSED if conditions improved
    if (
      this.state === CircuitBreakerState.HALF_OPEN &&
      this.canReset()
    ) {
      this.state = CircuitBreakerState.CLOSED;
      this.error_count = 0;
      this.trip_time = null;
    }

    // Auto-transition from OPEN to HALF_OPEN after cooldown
    if (
      this.state === CircuitBreakerState.OPEN &&
      this.trip_time &&
      Date.now() - this.trip_time > this.config.error_cooldown_ms
    ) {
      this.state = CircuitBreakerState.HALF_OPEN;
      this.error_count = Math.floor(this.error_count / 2); // Reduce error count
    }

    return this.state;
  }

  /**
   * Check if trading is allowed
   */
  canTrade(): boolean {
    const state = this.getState();
    return state === CircuitBreakerState.CLOSED || state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Check if circuit breaker can be reset
   */
  private canReset(): boolean {
    return (
      this.error_count === 0 &&
      this.daily_metrics.consecutive_errors < this.config.max_consecutive_errors &&
      this.daily_metrics.total_pnl_usd > -this.config.max_daily_loss_usd
    );
  }

  /**
   * Trip the circuit breaker (halt trading)
   */
  private trip(reason: string): void {
    this.state = CircuitBreakerState.OPEN;
    this.trip_time = Date.now();
    console.error(`[CIRCUIT BREAKER] TRIPPED: ${reason}`);
  }

  // ========================================================================
  // TRADE VALIDATION
  // ========================================================================

  /**
   * Validate if a trade can be executed
   *
   * Checks:
   * 1. Circuit breaker state
   * 2. Position limits (per market and total)
   * 3. Daily loss limit
   * 4. Per-trade loss limit
   *
   * @returns {canExecute: boolean, reason?: string}
   */
  validateTrade(
    market_id: string,
    trade_size_usd: number,
    estimated_loss_usd: number
  ): { canExecute: boolean; reason?: string } {
    // Check circuit breaker state
    if (!this.canTrade()) {
      return {
        canExecute: false,
        reason: `Circuit breaker is ${this.state}`,
      };
    }

    // Check daily loss limit
    const projected_loss = this.daily_metrics.total_pnl_usd - estimated_loss_usd;
    if (projected_loss < -this.config.max_daily_loss_usd) {
      this.trip(`Daily loss limit exceeded: $${projected_loss.toFixed(2)}`);
      return {
        canExecute: false,
        reason: `Daily loss limit would be exceeded`,
      };
    }

    // Check per-trade loss limit
    if (estimated_loss_usd > this.config.max_loss_per_trade_usd) {
      return {
        canExecute: false,
        reason: `Per-trade loss limit exceeded: $${estimated_loss_usd.toFixed(2)}`,
      };
    }

    // Check position limits
    const current_position = this.positions.get(market_id);
    const current_position_size = current_position
      ? current_position.yes_quantity + current_position.no_quantity
      : 0;

    const new_position_size = current_position_size + trade_size_usd;

    if (new_position_size > this.config.max_position_per_market) {
      return {
        canExecute: false,
        reason: `Position limit for market would be exceeded: ${new_position_size} > ${this.config.max_position_per_market}`,
      };
    }

    // Check total position limit
    const total_position = this.calculateTotalPosition();
    if (total_position + trade_size_usd > this.config.max_total_position) {
      return {
        canExecute: false,
        reason: `Total position limit would be exceeded`,
      };
    }

    return { canExecute: true };
  }

  // ========================================================================
  // POSITION TRACKING
  // ========================================================================

  /**
   * Update position after trade execution
   */
  updatePosition(market_id: string, result: TradeResult): void {
    if (!result.success) {
      this.handleError(result.error_message || 'Unknown error');
      return;
    }

    // Reset error count on success
    this.error_count = 0;
    this.daily_metrics.consecutive_errors = 0;

    // Update position (simplified - in real system would track actual fills)
    let position = this.positions.get(market_id);
    if (!position && result.position) {
      position = result.position;
      this.positions.set(market_id, position);
    }
  }

  /**
   * Get position for a market
   */
  getPosition(market_id: string): Position | undefined {
    return this.positions.get(market_id);
  }

  /**
   * Get all positions
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Calculate total position size across all markets
   */
  private calculateTotalPosition(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      total += position.yes_quantity + position.no_quantity;
    }
    return total;
  }

  /**
   * Calculate unrealized P&L for all positions
   */
  calculateUnrealizedPnL(): number {
    let total_pnl = 0;
    for (const position of this.positions.values()) {
      total_pnl += position.unrealized_pnl_usd;
    }
    return total_pnl;
  }

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  /**
   * Handle trade execution error
   */
  private handleError(error_message: string): void {
    this.error_count++;
    this.daily_metrics.consecutive_errors++;
    this.daily_metrics.failed_trades++;

    console.error(`[CIRCUIT BREAKER] Error (${this.error_count}/${this.config.max_consecutive_errors}): ${error_message}`);

    // Trip circuit breaker if too many consecutive errors
    if (this.error_count >= this.config.max_consecutive_errors) {
      this.trip(`Too many consecutive errors: ${this.error_count}`);
    }
  }

  /**
   * Record successful trade
   */
  recordSuccess(trade_result: TradeResult): void {
    this.daily_metrics.successful_trades++;
    this.daily_metrics.total_trades++;

    // Update P&L
    if (trade_result.position) {
      this.daily_metrics.total_pnl_usd += trade_result.position.unrealized_pnl_usd;
    }

    // Track gas costs
    if (trade_result.gas_cost_usd) {
      this.daily_metrics.total_gas_spent_usd += trade_result.gas_cost_usd;
    }

    // Reset error count on success
    this.error_count = 0;
    this.daily_metrics.consecutive_errors = 0;
  }

  // ========================================================================
  // METRICS AND REPORTING
  // ========================================================================

  /**
   * Get daily metrics
   */
  getDailyMetrics(): DailyMetrics {
    // Reset if new day
    const today = new Date().toISOString().split('T')[0];
    if (this.daily_metrics.date !== today) {
      this.daily_metrics = this.initializeDailyMetrics();
    }

    return { ...this.daily_metrics };
  }

  /**
   * Initialize daily metrics
   */
  private initializeDailyMetrics(): DailyMetrics {
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      total_trades: 0,
      successful_trades: 0,
      failed_trades: 0,
      total_pnl_usd: 0,
      max_drawdown_usd: 0,
      consecutive_errors: 0,
      total_gas_spent_usd: 0,
    };
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState;
    can_trade: boolean;
    error_count: number;
    consecutive_errors: number;
    daily_pnl_usd: number;
    daily_loss_remaining_usd: number;
    total_positions: number;
    trip_time: number | null;
  } {
    const metrics = this.getDailyMetrics();
    const state = this.getState();

    return {
      state,
      can_trade: this.canTrade(),
      error_count: this.error_count,
      consecutive_errors: metrics.consecutive_errors,
      daily_pnl_usd: metrics.total_pnl_usd,
      daily_loss_remaining_usd: this.config.max_daily_loss_usd - Math.abs(metrics.total_pnl_usd),
      total_positions: this.positions.size,
      trip_time: this.trip_time,
    };
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics(): {
    config: CircuitBreakerConfig;
    state: CircuitBreakerState;
    positions: Position[];
    daily_metrics: DailyMetrics;
    status: ReturnType<CircuitBreaker['getStatus']>;
  } {
    return {
      config: { ...this.config },
      state: this.getState(),
      positions: this.getAllPositions(),
      daily_metrics: this.getDailyMetrics(),
      status: this.getStatus(),
    };
  }

  // ========================================================================
  // MANUAL CONTROLS
  // ========================================================================

  /**
   * Manually reset circuit breaker (use with caution)
   */
  manualReset(): void {
    console.warn('[CIRCUIT BREAKER] Manual reset requested');
    this.state = CircuitBreakerState.CLOSED;
    this.error_count = 0;
    this.trip_time = null;
    this.daily_metrics.consecutive_errors = 0;
  }

  /**
   * Manually trip circuit breaker (emergency stop)
   */
  manualTrip(reason: string = 'Manual trip'): void {
    console.warn('[CIRCUIT BREAKER] Manual trip requested');
    this.trip(reason);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[CIRCUIT BREAKER] Configuration updated:', this.config);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a circuit breaker instance with default configuration
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const fullConfig = config
    ? { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
    : DEFAULT_CIRCUIT_BREAKER_CONFIG;
  return new CircuitBreaker(fullConfig);
}

/**
 * Validate circuit breaker configuration
 */
export function validateConfig(config: CircuitBreakerConfig): {
  is_valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.max_position_per_market <= 0) {
    errors.push('max_position_per_market must be positive');
  }

  if (config.max_total_position <= 0) {
    errors.push('max_total_position must be positive');
  }

  if (config.max_total_position < config.max_position_per_market) {
    errors.push('max_total_position must be >= max_position_per_market');
  }

  if (config.max_daily_loss_usd <= 0) {
    errors.push('max_daily_loss_usd must be positive');
  }

  if (config.max_loss_per_trade_usd < 0) {
    errors.push('max_loss_per_trade_usd must be non-negative');
  }

  if (config.max_consecutive_errors <= 0) {
    errors.push('max_consecutive_errors must be positive');
  }

  if (config.gas_buffer_cents < 0) {
    errors.push('gas_buffer_cents must be non-negative');
  }

  if (config.liquidity_factor <= 0 || config.liquidity_factor > 1) {
    errors.push('liquidity_factor must be in (0, 1]');
  }

  return {
    is_valid: errors.length === 0,
    errors,
  };
}
