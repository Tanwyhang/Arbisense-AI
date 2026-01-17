/**
 * Position Tracking and Real-time P&L System
 *
 * Migrated from Polymarket-Kalshi-Arbitrage-bot position_tracker.rs
 * Tracks arbitrage positions with real-time P&L calculation and cross-platform reconciliation
 *
 * Key Features (AUDIT-0012):
 * - Real-time P&L calculation for all positions
 * - Cross-platform position reconciliation
 * - Settlement monitoring and automatic payout detection
 * - Position exposure tracking
 * - Historical performance metrics
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Position {
  id: string;
  market_id: string;
  question: string;

  // Position details
  platform: 'polymarket' | 'limitless';
  outcome: 'yes' | 'no';
  quantity: number; // Number of contracts
  avg_entry_price: number; // Average entry price in cents
  current_price: number; // Current market price in cents

  // Financials
  cost_basis_usd: number;
  current_value_usd: number;
  unrealized_pnl_usd: number;
  unrealized_pnl_pct: number;

  // Risk metrics
  exposure_usd: number;
  max_loss_usd: number;
  max_gain_usd: number;

  // Timestamps
  opened_at: number;
  last_updated: number;
  settled_at?: number;
}

export interface ArbitragePositionPair {
  id: string;
  opportunity_id: string;

  // Both legs of the arbitrage
  leg1: Position; // e.g., Polymarket YES
  leg2: Position; // e.g., Limitless NO

  // Combined metrics
  total_cost_usd: number;
  current_value_usd: number;
  net_pnl_usd: number;
  net_pnl_pct: number;

  // Status
  status: 'open' | 'closed' | 'settled' | 'failed';

  // Settlement info
  expected_payout_usd: number;
  actual_payout_usd?: number;
  settlement_date?: number;
}

export interface FillRecord {
  id: string;
  position_id: string;
  timestamp: number;

  // Fill details
  side: 'buy' | 'sell';
  quantity: number;
  price: number; // in cents
  platform: 'polymarket' | 'limitless';

  // Costs
  fee_usd: number;
  gas_usd: number;
  total_cost_usd: number;

  // Execution
  order_id?: string;
  transaction_hash?: string;
  execution_time_ms?: number;
}

export interface SettlementRecord {
  position_id: string;
  market_id: string;
  outcome: 'yes' | 'no' | 'draw';

  // Settlement details
  settled_price: number; // Final price (0 or 100 cents)
  settled_at: number;
  payout_per_contract: number;

  // Reconciliation
  expected_payout: number;
  actual_payout: number;
  discrepancy?: number;
}

// ============================================================================
// POSITION TRACKER CLASS
// ============================================================================

export class PositionTracker {
  private positions: Map<string, Position>;
  private arbitrage_pairs: Map<string, ArbitragePositionPair>;
  private fill_history: FillRecord[];
  private settlement_history: SettlementRecord[];

  constructor() {
    this.positions = new Map();
    this.arbitrage_pairs = new Map();
    this.fill_history = [];
    this.settlement_history = [];
  }

  // ========================================================================
  // POSITION MANAGEMENT
  // ========================================================================

  /**
   * Open a new position
   */
  openPosition(params: {
    market_id: string;
    question: string;
    platform: 'polymarket' | 'limitless';
    outcome: 'yes' | 'no';
    quantity: number;
    entry_price: number; // in cents
    fee_usd?: number;
    gas_usd?: number;
  }): Position {
    const cost_basis_usd = (params.quantity * params.entry_price) / 100 + (params.fee_usd || 0) + (params.gas_usd || 0);

    const position: Position = {
      id: `${params.market_id}-${params.platform}-${params.outcome}-${Date.now()}`,
      market_id: params.market_id,
      question: params.question,
      platform: params.platform,
      outcome: params.outcome,
      quantity: params.quantity,
      avg_entry_price: params.entry_price,
      current_price: params.entry_price,
      cost_basis_usd,
      current_value_usd: cost_basis_usd,
      unrealized_pnl_usd: 0,
      unrealized_pnl_pct: 0,
      exposure_usd: cost_basis_usd,
      max_loss_usd: cost_basis_usd, // Worst case: price goes to 0
      max_gain_usd: (params.quantity * 100) / 100 - cost_basis_usd, // Best case: price goes to 100
      opened_at: Date.now(),
      last_updated: Date.now(),
    };

    this.positions.set(position.id, position);
    console.log(`[POSITION TRACKER] Opened position: ${position.id}`);

    return position;
  }

  /**
   * Update position with current market price
   */
  updatePositionPrice(
    position_id: string,
    current_price: number
  ): Position | null {
    const position = this.positions.get(position_id);
    if (!position) return null;

    position.current_price = current_price;
    position.current_value_usd = (position.quantity * current_price) / 100;
    position.unrealized_pnl_usd = position.current_value_usd - position.cost_basis_usd;
    position.unrealized_pnl_pct =
      (position.unrealized_pnl_usd / position.cost_basis_usd) * 100;
    position.last_updated = Date.now();

    this.positions.set(position_id, position);
    return position;
  }

  /**
   * Close a position
   */
  closePosition(
    position_id: string,
    exit_price: number,
    exit_fee_usd?: number,
    exit_gas_usd?: number
): Position | null {
    const position = this.positions.get(position_id);
    if (!position) return null;

    // Calculate final P&L
    const exit_value = (position.quantity * exit_price) / 100;
    const total_exit_cost = exit_fee_usd || 0 + exit_gas_usd || 0;
    const realized_pnl = exit_value - position.cost_basis_usd - total_exit_cost;

    position.current_price = exit_price;
    position.current_value_usd = exit_value;
    position.unrealized_pnl_usd = realized_pnl;
    position.unrealized_pnl_pct = (realized_pnl / position.cost_basis_usd) * 100;
    position.last_updated = Date.now();

    // Remove from active positions
    this.positions.delete(position_id);

    console.log(`[POSITION TRACKER] Closed position: ${position_id}, P&L: $${realized_pnl.toFixed(2)}`);
    return position;
  }

  /**
   * Create arbitrage position pair
   */
  createArbitragePair(
    opportunity_id: string,
    leg1: Omit<Position, 'id' | 'opened_at' | 'last_updated'>,
    leg2: Omit<Position, 'id' | 'opened_at' | 'last_updated'>
  ): ArbitragePositionPair {
    // Add IDs and timestamps
    const position1: Position = {
      ...leg1,
      id: `${leg1.market_id}-leg1-${Date.now()}`,
      opened_at: Date.now(),
      last_updated: Date.now(),
    };

    const position2: Position = {
      ...leg2,
      id: `${leg2.market_id}-leg2-${Date.now()}`,
      opened_at: Date.now(),
      last_updated: Date.now(),
    };

    // Store individual positions
    this.positions.set(position1.id, position1);
    this.positions.set(position2.id, position2);

    // Create pair
    const pair: ArbitragePositionPair = {
      id: `arb-${opportunity_id}-${Date.now()}`,
      opportunity_id,
      leg1: position1,
      leg2: position2,
      total_cost_usd: position1.cost_basis_usd + position2.cost_basis_usd,
      current_value_usd: position1.current_value_usd + position2.current_value_usd,
      net_pnl_usd:
        position1.unrealized_pnl_usd +
        position2.unrealized_pnl_usd,
      net_pnl_pct: 0, // Calculated below
      status: 'open',
      expected_payout_usd: leg1.max_gain_usd + leg2.max_gain_usd, // Simplified
    };

    // Calculate net P&L percentage
    pair.net_pnl_pct = (pair.net_pnl_usd / pair.total_cost_usd) * 100;

    this.arbitrage_pairs.set(pair.id, pair);
    console.log(`[POSITION TRACKER] Created arbitrage pair: ${pair.id}`);

    return pair;
  }

  /**
   * Update arbitrage pair prices
   */
  updateArbitragePair(
    pair_id: string,
    leg1_price: number,
    leg2_price: number
  ): ArbitragePositionPair | null {
    const pair = this.arbitrage_pairs.get(pair_id);
    if (!pair) return null;

    // Update both legs
    this.updatePositionPrice(pair.leg1.id, leg1_price);
    this.updatePositionPrice(pair.leg2.id, leg2_price);

    // Recalculate combined metrics
    const updated_leg1 = this.positions.get(pair.leg1.id)!;
    const updated_leg2 = this.positions.get(pair.leg2.id)!;

    pair.current_value_usd =
      updated_leg1.current_value_usd + updated_leg2.current_value_usd;
    pair.net_pnl_usd =
      updated_leg1.unrealized_pnl_usd + updated_leg2.unrealized_pnl_usd;
    pair.net_pnl_pct = (pair.net_pnl_usd / pair.total_cost_usd) * 100;

    this.arbitrage_pairs.set(pair_id, pair);
    return pair;
  }

  // ========================================================================
  // SETTLEMENT (AUDIT-0012)
  // ========================================================================

  /**
   * Record settlement for a position
   */
  recordSettlement(record: SettlementRecord): void {
    this.settlement_history.push(record);

    // Update position if it exists
    for (const position of this.positions.values()) {
      if (position.market_id === record.market_id) {
        // Determine if this position won or lost
        const is_winning =
          (record.outcome === 'yes' && position.outcome === 'yes') ||
          (record.outcome === 'no' && position.outcome === 'no');

        position.current_price = is_winning ? 100 : 0;
        position.current_value_usd = is_winning
          ? (position.quantity * 100) / 100
          : 0;
        position.unrealized_pnl_usd =
          position.current_value_usd - position.cost_basis_usd;
        position.unrealized_pnl_pct =
          (position.unrealized_pnl_usd / position.cost_basis_usd) * 100;
        position.settled_at = record.settled_at;

        console.log(
          `[POSITION TRACKER] Settled position: ${position.id}, ` +
          `Outcome: ${record.outcome}, P&L: $${position.unrealized_pnl_usd.toFixed(2)}`
        );
      }
    }

    // Update arbitrage pairs
    for (const pair of this.arbitrage_pairs.values()) {
      if (pair.leg1.market_id === record.market_id ||
          pair.leg2.market_id === record.market_id) {
        const leg1 = this.positions.get(pair.leg1.id);
        const leg2 = this.positions.get(pair.leg2.id);

        if (leg1 && leg2) {
          pair.current_value_usd = leg1.current_value_usd + leg2.current_value_usd;
          pair.net_pnl_usd = leg1.unrealized_pnl_usd + leg2.unrealized_pnl_usd;
          pair.net_pnl_pct = (pair.net_pnl_usd / pair.total_cost_usd) * 100;
          pair.status = 'settled';
          pair.actual_payout_usd = pair.current_value_usd;
          pair.settlement_date = record.settled_at;
        }
      }
    }
  }

  /**
   * Check for settlement discrepancies
   */
  checkSettlementDiscrepancies(): Array<{
    record: SettlementRecord;
    discrepancy_usd: number;
  }> {
    const discrepancies: Array<{
      record: SettlementRecord;
      discrepancy_usd: number;
    }> = [];

    for (const record of this.settlement_history) {
      if (record.discrepancy && Math.abs(record.discrepancy) > 0.01) {
        discrepancies.push({
          record,
          discrepancy_usd: record.discrepancy,
        });
      }
    }

    return discrepancies;
  }

  // ========================================================================
  // QUERIES AND REPORTS
  // ========================================================================

  /**
   * Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position by ID
   */
  getPosition(position_id: string): Position | undefined {
    return this.positions.get(position_id);
  }

  /**
   * Get all arbitrage pairs
   */
  getArbitragePairs(): ArbitragePositionPair[] {
    return Array.from(this.arbitrage_pairs.values());
  }

  /**
   * Calculate portfolio P&L
   */
  calculatePortfolioPnL(): {
    total_pnl_usd: number;
    total_pnl_pct: number;
    unrealized_pnl_usd: number;
    realized_pnl_usd: number;
    total_cost_usd: number;
    total_value_usd: number;
    open_positions: number;
    settled_pairs: number;
  } {
    let unrealized_pnl = 0;
    let total_cost = 0;
    let total_value = 0;
    let settled_count = 0;

    // Sum all open positions
    for (const position of this.positions.values()) {
      unrealized_pnl += position.unrealized_pnl_usd;
      total_cost += position.cost_basis_usd;
      total_value += position.current_value_usd;
    }

    // Sum settled arbitrage pairs
    let realized_pnl = 0;
    for (const pair of this.arbitrage_pairs.values()) {
      if (pair.status === 'settled') {
        realized_pnl += pair.net_pnl_usd;
        settled_count++;
      }
    }

    const total_pnl = unrealized_pnl + realized_pnl;
    const total_pnl_pct = total_cost > 0 ? (total_pnl / total_cost) * 100 : 0;

    return {
      total_pnl_usd: total_pnl,
      total_pnl_pct,
      unrealized_pnl_usd: unrealized_pnl,
      realized_pnl_usd: realized_pnl,
      total_cost_usd: total_cost,
      total_value_usd: total_value,
      open_positions: this.positions.size,
      settled_pairs: settled_count,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    average_profit_usd: number;
    average_loss_usd: number;
    profit_factor: number;
    largest_win_usd: number;
    largest_loss_usd: number;
    total_fees_usd: number;
    total_gas_usd: number;
  } {
    const settled = Array.from(this.arbitrage_pairs.values()).filter(
      (p) => p.status === 'settled'
    );

    const winning_trades = settled.filter((p) => p.net_pnl_usd > 0).length;
    const losing_trades = settled.filter((p) => p.net_pnl_usd < 0).length;

    const profits = settled.filter((p) => p.net_pnl_usd > 0).map((p) => p.net_pnl_usd);
    const losses = settled.filter((p) => p.net_pnl_usd < 0).map((p) => p.net_pnl_usd);

    const average_profit =
      profits.length > 0
        ? profits.reduce((sum, p) => sum + p, 0) / profits.length
        : 0;
    const average_loss =
      losses.length > 0
        ? losses.reduce((sum, p) => sum + p, 0) / losses.length
        : 0;

    const total_profit = profits.reduce((sum, p) => sum + p, 0);
    const total_loss = Math.abs(losses.reduce((sum, p) => sum + p, 0));
    const profit_factor = total_loss > 0 ? total_profit / total_loss : 0;

    const largest_win = profits.length > 0 ? Math.max(...profits) : 0;
    const largest_loss = losses.length > 0 ? Math.min(...losses) : 0;

    // Calculate fees and gas from fill history
    const total_fees = this.fill_history.reduce((sum, f) => sum + f.fee_usd, 0);
    const total_gas = this.fill_history.reduce((sum, f) => sum + f.gas_usd, 0);

    return {
      total_trades: settled.length,
      winning_trades,
      losing_trades,
      win_rate: settled.length > 0 ? (winning_trades / settled.length) * 100 : 0,
      average_profit_usd: average_profit,
      average_loss_usd: Math.abs(average_loss),
      profit_factor,
      largest_win_usd: largest_win,
      largest_loss_usd: largest_loss,
      total_fees_usd: total_fees,
      total_gas_usd: total_gas,
    };
  }

  // ========================================================================
  // FILL HISTORY
  // ========================================================================

  /**
   * Record a fill
   */
  recordFill(fill: FillRecord): void {
    this.fill_history.push(fill);
  }

  /**
   * Get fill history for a position
   */
  getFillsForPosition(position_id: string): FillRecord[] {
    return this.fill_history.filter((f) => f.position_id === position_id);
  }

  /**
   * Get all fills
   */
  getAllFills(): FillRecord[] {
    return [...this.fill_history];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a position tracker instance
 */
export function createPositionTracker(): PositionTracker {
  return new PositionTracker();
}

/**
 * Calculate expected profit for an arbitrage opportunity
 */
export function calculateExpectedProfit(
  yes_price: number,
  no_price: number,
  size: number,
  fees_cents: number
): {
  profit_cents: number;
  profit_usd: number;
  profit_pct: number;
  total_cost_cents: number;
} {
  const total_cost = yes_price + no_price + fees_cents;
  const profit_cents = 100 - total_cost;
  const profit_usd = profit_cents / 100;
  const profit_pct = (profit_cents / total_cost) * 100;

  return {
    profit_cents,
    profit_usd,
    profit_pct,
    total_cost_cents: total_cost,
  };
}
