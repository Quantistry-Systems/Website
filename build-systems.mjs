// build-systems.mjs
// Converts combined.json (raw MT5/MT4 backtest export) into systems.json,
// the shape main.js actually renders on the site.
//
// Run with:  node build-systems.mjs
// Re-run this any time combined.json changes (new Name/Description fields,
// updated backtests, etc). It always overwrites systems.json.

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './data/exports/combined.json';
const OUT = './public/systems.json';

const raw = JSON.parse(readFileSync(SRC, 'utf-8'));
const systems = raw.systems || [];

// "18_majors" -> "Majors" | "16_carry_trade" -> "Carry Trade"
function nameFromFile(file) {
  return file
    .replace(/^\d+_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// pulls "19.44" out of "37 697.32 (19.44%)"
function pctInParens(str) {
  const m = /\(([\d.]+)%\)/.exec(str || '');
  return m ? `${m[1]}%` : (str || '');
}

// "2025.07.30 - 2026.07.30" -> number of months between the two dates
function monthsFromPeriod(period) {
  const m = /\((\d{4})\.(\d{2})\.(\d{2}) - (\d{4})\.(\d{2})\.(\d{2})\)/.exec(period || '');
  if (!m) return 12;
  const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const end = new Date(Date.UTC(+m[4], +m[5] - 1, +m[6]));
  const months = (end - start) / (1000 * 60 * 60 * 24 * 30.4375);
  return months > 0 ? months : 12;
}

function usd(n) {
  const num = typeof n === 'number' ? n : parseFloat(n);
  if (Number.isNaN(num)) return String(n);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

const converted = systems.map((s) => {
  const months = monthsFromPeriod(s.Period);
  const monthlyPct = ((s['Total Net Profit'] / s['Initial Deposit']) / months) * 100;

  return {
    // Prefer a hand-written "Name"/"Description" field on the raw record once
    // you add them to combined.json - falls back to an auto name for now.
    name: s.name || nameFromFile(s.File),
    description: s.description || '',
    pairs: s['Currency Pairs'] || [],
    stats: {
      monthly: `${monthlyPct.toFixed(1)}%`,
      profitFactor: s['Profit Factor']?.toFixed ? s['Profit Factor'].toFixed(2) : s['Profit Factor'],
      winRate: pctInParens(s['Profit Trades (% of total)']),
      maxDrawdown: pctInParens(s['Balance Drawdown Maximal']),
    },
    details: {
      totalNetProfit: usd(s['Total Net Profit']),
      sharpeRatio: s['Sharpe Ratio'],
      recoveryFactor: s['Recovery Factor'],
      expectedPayoff: usd(s['Expected Payoff']),
      totalTrades: s['Total Trades'],
      shortTradesWon: s['Short Trades (won %)'],
      longTradesWon: s['Long Trades (won %)'],
      grossProfit: usd(s['Gross Profit']),
      grossLoss: usd(s['Gross Loss']),
      largestProfitTrade: usd(s['Largest profit trade']),
      largestLossTrade: usd(s['Largest loss trade']),
      averageProfitTrade: usd(s['Average profit trade']),
    },
    // Real equity curve, used to draw the chart in the system detail modal
    // (and on the homepage hero). One point per row from "Balance Growth".
    balanceGrowth: (s['Balance Growth'] || []).map((p) => ({ time: p.time, balance: p.balance })),
  };
});

writeFileSync(OUT, JSON.stringify(converted, null, 2));
console.log(`Wrote ${converted.length} systems to ${OUT}`);
