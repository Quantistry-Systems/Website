#!/usr/bin/env python3
"""
mt5_deals_to_csv.py

Converts MetaTrader 5 "Strategy Tester Report" HTML file(s) into:
  - a CSV track record, where each closed position is listed ONCE
    (open + close combined), built by matching "in" deals with "out"
    deals from the Deals table in the report.
  - a JSON file with the general backtest summary (Settings + Results
    sections from the top of the report), augmented with data from system_data.json.

Usage:
    # Single file -> writes <outdir>/<slug>.csv and <outdir>/<slug>.json
    python3 mt5_deals_to_csv.py "10. CHF PAIRS.html" export/

    # Folder of reports -> converts every *.html file inside
    python3 mt5_deals_to_csv.py reports_folder/ export/

Output filenames are the original file name, lowercased, with spaces
and dots collapsed to underscores, e.g.:
    "20. DIVERSIFIED MIX.html" -> "20_diversified_mix.csv" / ".json"
"""

import sys
import os
import re
import csv
import json
from datetime import datetime
from collections import deque, defaultdict


def read_html(path):
    """MT5 report HTML files are usually saved as UTF-16. Try that first,
    fall back to UTF-8 / cp1252 if needed."""
    with open(path, "rb") as f:
        raw = f.read()

    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16")

    for enc in ("utf-16", "utf-8", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def parse_deals(html):
    """Extract every row of the 'Deals' table as a dict."""
    marker = re.search(r">\s*Deals\s*</b>", html)
    if not marker:
        raise ValueError("Could not find a 'Deals' section in this report.")

    start = marker.end()
    # Deals section ends at the next section header (e.g. a <th> that is
    # not the deals column header) - easiest robust stop is the closing
    # </table> tag, we then filter rows by shape anyway.
    table_end = html.find("</table>", start)
    section = html[start:table_end if table_end != -1 else len(html)]

    row_re = re.compile(r'<tr[^>]*align=right>(.*?)</tr>', re.S)
    cell_re = re.compile(r'<td[^>]*>(.*?)</td>', re.S)

    deals = []
    for row_match in row_re.finditer(section):
        cells = cell_re.findall(row_match.group(1))
        if len(cells) != 13:
            continue  # skip totals row / anything malformed
        cells = [re.sub(r'\s+', ' ', c).strip() for c in cells]
        (time_, deal, symbol, type_, direction, volume, price, order,
         commission, swap, profit, balance, comment) = cells

        deals.append({
            "time": time_,
            "deal": deal,
            "symbol": symbol,
            "type": type_.lower(),
            "direction": direction.lower(),
            "volume": _num(volume),
            "price": price,
            "order": order,
            "commission": _num(commission),
            "swap": _num(swap),
            "profit": _num(profit),
            "balance": _num(balance),
            "comment": comment,
        })
    return deals


def _strip_tags(cell):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', cell)).strip()


def _convert_value(v):
    """Turn plain numeric strings ('100 000.00', '6216') into int/float.
    Anything with %, parentheses, letters, or ':' is left as a string."""
    compact = v.replace("\xa0", " ").replace(" ", "")
    try:
        if "." in compact or "e" in compact.lower():
            return float(compact)
        return int(compact)
    except ValueError:
        return v


def is_forced_close(comment):
    """MT5 marks positions that were still open when the backtest ended
    with a close-deal comment like 'end of test'."""
    return "end of test" in (comment or "").lower()


def recompute_stats(trade_rows):
    """Recalculate the trade-derived summary fields from a (possibly
    filtered) set of 'Closed position' rows. Returns None if there are
    no trades left."""
    n = len(trade_rows)
    if n == 0:
        return None

    net_profits = [float(r["Net profit"]) for r in trade_rows]
    wins = [p for p in net_profits if p > 0]
    losses = [p for p in net_profits if p < 0]

    gross_profit = round(sum(wins), 2)
    gross_loss = round(sum(losses), 2)
    total_net = round(gross_profit + gross_loss, 2)
    profit_factor = round(gross_profit / abs(gross_loss), 2) if gross_loss else None

    def side_stats(side):
        side_trades = [r for r in trade_rows if r["Buy/sell"] == side]
        sn = len(side_trades)
        sw = sum(1 for r in side_trades if float(r["Net profit"]) > 0)
        pct = (sw / sn * 100) if sn else 0.0
        return f"{sn} ({pct:.2f}%)"

    pairs = sorted({clean_symbol(r["Symbol"]) for r in trade_rows if r["Symbol"]})

    return {
        "Total Trades": n,
        "Total Net Profit": total_net,
        "Gross Profit": gross_profit,
        "Gross Loss": gross_loss,
        "Profit Factor": profit_factor,
        "Profit Trades (% of total)": f"{len(wins)} ({len(wins) / n * 100:.2f}%)",
        "Loss Trades (% of total)": f"{len(losses)} ({len(losses) / n * 100:.2f}%)",
        "Largest profit trade": round(max(net_profits), 2),
        "Largest loss trade": round(min(net_profits), 2),
        "Average profit trade": round(gross_profit / len(wins), 2) if wins else 0,
        "Average loss trade": round(gross_loss / len(losses), 2) if losses else 0,
        "Short Trades (won %)": side_stats("Sell"),
        "Long Trades (won %)": side_stats("Buy"),
        "Currency Pairs": pairs,
    }


def build_balance_growth(rows):
    """Build a chronological running-balance curve from track-record rows
    (Deposit + Closed position). Rows sharing the same close timestamp
    (e.g. several partial closes at end-of-test) are merged into a single
    point. Returns a list of {"time": ..., "balance": ...} dicts."""

    def parse_dt(ts):
        return datetime.strptime(ts, "%Y/%m/%d %H:%M:%S")

    ordered = sorted(rows, key=lambda r: parse_dt(r["Close time"]))

    deltas = {}
    order = []
    for r in ordered:
        t = r["Close time"]
        if t not in deltas:
            deltas[t] = 0.0
            order.append(t)
        deltas[t] += float(r["Net profit"])

    cumulative = 0.0
    points = []
    for t in order:
        cumulative += deltas[t]
        points.append({"time": t, "balance": round(cumulative, 2)})
    return points


def clean_symbol(symbol):
    """Strip common broker suffixes from a symbol name and uppercase it.
    e.g. 'GBPAUD.pro' -> 'GBPAUD', 'USDCHF+' -> 'USDCHF'"""
    s = symbol.split(".")[0]
    s = s.rstrip("+")
    return s.upper()


def parse_summary(html):
    """Extract the general backtest info (Settings + Results sections at
    the top of the report) as a flat dict of label -> value."""
    end = html.find("Deals</b>")
    section = html[:end if end != -1 else len(html)]

    row_re = re.compile(r'<tr[^>]*>(.*?)</tr>', re.S)
    cell_re = re.compile(r'<td[^>]*>(.*?)</td>', re.S)

    summary = {}
    for row_match in row_re.finditer(section):
        cells = [_strip_tags(c) for c in cell_re.findall(row_match.group(1))]
        i = 0
        while i < len(cells) - 1:
            label = cells[i]
            if label.endswith(":"):
                key = label[:-1].strip()
                value = cells[i + 1]
                if key and value:
                    summary[key] = _convert_value(value)
                i += 2
            else:
                i += 1
    return summary


def _num(s):
    if s is None or s == "":
        return 0.0
    return float(s.replace(" ", "").replace("\xa0", ""))


def _fmt_dt(mt5_time):
    # "2025.07.31 18:00:00" -> ("2025/07/31 18:00:00", "2025/07/31")
    date_part, time_part = mt5_time.split(" ")
    date_part = date_part.replace(".", "/")
    return f"{date_part} {time_part}", date_part


def _pip_size(price_str):
    decimals = len(price_str.split(".")[-1]) if "." in price_str else 0
    if decimals <= 1:
        return 1.0
    return 10 ** -(decimals - 1)


def build_track_record(deals):
    """Match 'in' deals with 'out' deals (FIFO per symbol/type) and also
    keep non-trade deals (balance/credit/deposit ops) as their own rows."""

    # open_positions[symbol][type] -> deque of open lots (FIFO)
    open_positions = defaultdict(lambda: defaultdict(deque))
    rows = []
    unmatched_out = []

    for d in deals:
        if d["direction"] not in ("in", "out"):
            # balance / credit / deposit / withdrawal style entries
            open_time, open_date = _fmt_dt(d["time"])
            rows.append({
                "Type": "Deposit" if d["type"] in ("", "balance") else d["type"].capitalize(),
                "Ticket": d["deal"],
                "Symbol": "",
                "Lots": 0,
                "Buy/sell": "",
                "Open price": 0,
                "Close price": 0,
                "Open time": open_time,
                "Close time": open_time,
                "Open date": open_date,
                "Close date": open_date,
                "Profit": d["profit"],
                "Swap": d["swap"],
                "Commission": d["commission"],
                "Net profit": round(d["profit"] + d["swap"] + d["commission"], 2),
                "T/P": "",
                "S/L": "",
                "Pips": "",
                "Result": "n/a",
                "Comment": d["comment"],
            })
            continue

        if d["direction"] == "in":
            lot = dict(d)
            lot["orig_volume"] = lot["volume"]
            lot["orig_commission"] = lot["commission"]
            open_positions[d["symbol"]][d["type"]].append(lot)
            continue

        # direction == "out"
        opposite_type = "sell" if d["type"] == "buy" else "buy"
        queue = open_positions[d["symbol"]][opposite_type]

        remaining_close_vol = d["volume"]
        out_total_vol = d["volume"] if d["volume"] else 1e-9

        while remaining_close_vol > 1e-9 and queue:
            open_lot = queue[0]
            matched_vol = min(remaining_close_vol, open_lot["volume"])
            proportion = matched_vol / out_total_vol

            open_time, open_date = _fmt_dt(open_lot["time"])
            close_time, close_date = _fmt_dt(d["time"])

            open_proportion = matched_vol / open_lot["orig_volume"]

            profit_share = round(d["profit"] * proportion, 2)
            swap_share = round(d["swap"] * proportion, 2)
            # Commission is charged on BOTH legs (open + close) in MT5 deals;
            # combine the open leg's share with the close leg's share.
            comm_share = round(
                d["commission"] * proportion
                + open_lot["orig_commission"] * open_proportion,
                2,
            )
            net_profit = round(profit_share + swap_share + comm_share, 2)

            pip = _pip_size(d["price"])
            open_price = float(open_lot["price"])
            close_price = float(d["price"])
            if opposite_type == "buy":
                pips = round((close_price - open_price) / pip, 1)
            else:
                pips = round((open_price - close_price) / pip, 1)

            rows.append({
                "Type": "Closed position",
                "Ticket": open_lot["deal"],
                "Symbol": d["symbol"],
                "Lots": round(matched_vol, 2),
                "Buy/sell": opposite_type.capitalize(),
                "Open price": open_lot["price"],
                "Close price": d["price"],
                "Open time": open_time,
                "Close time": close_time,
                "Open date": open_date,
                "Close date": close_date,
                "Profit": profit_share,
                "Swap": swap_share,
                "Commission": comm_share,
                "Net profit": net_profit,
                "T/P": "",
                "S/L": "",
                "Pips": pips,
                "Result": "Win" if net_profit > 0 else ("Loss" if net_profit < 0 else "Breakeven"),
                "Comment": d["comment"],
            })

            open_lot["volume"] -= matched_vol
            remaining_close_vol -= matched_vol
            if open_lot["volume"] <= 1e-9:
                queue.popleft()

        if remaining_close_vol > 1e-9:
            unmatched_out.append(d)

    if unmatched_out:
        sys.stderr.write(
            f"Warning: {len(unmatched_out)} 'out' deal(s) could not be fully "
            f"matched to an open position (no corresponding open volume found). "
            f"Their close data may be incomplete.\n"
        )

    return rows


COLUMNS = [
    "Type", "Ticket", "Symbol", "Lots", "Buy/sell", "Open price", "Close price",
    "Open time", "Close time", "Open date", "Close date", "Profit", "Swap",
    "Commission", "Net profit", "T/P", "S/L", "Pips", "Result", "Comment",
]


def write_csv(rows, out_path):
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)


def slugify(name):
    """'20. DIVERSIFIED MIX' -> '20_diversified_mix'"""
    s = name.lower()
    s = re.sub(r'[\s.]+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s.strip('_')


def convert_one(html_path, outdir, exclude_forced=False, system_data_map=None):
    """Convert a single MT5 report HTML file into <outdir>/<slug>.csv and
    <outdir>/<slug>.json. Returns (csv_path, json_path, n_deals, n_rows, summary, n_removed, rows)."""
    stem = os.path.splitext(os.path.basename(html_path))[0]
    slug = slugify(stem)
    csv_path = os.path.join(outdir, f"{slug}.csv")
    json_path = os.path.join(outdir, f"{slug}.json")

    html = read_html(html_path)

    deals = parse_deals(html)
    rows = build_track_record(deals)
    summary = parse_summary(html)

    # --- NEW INJECTION: Add system name and description ---
    if system_data_map is not None:
        if slug in system_data_map:
            summary["name"] = system_data_map[slug].get("name", "NO NAME")
            summary["description"] = system_data_map[slug].get("description", "NO DESCRIPTION")
        else:
            summary["name"] = "NO NAME"
            summary["description"] = "NO DESCRIPTION"
    # ------------------------------------------------------

    all_pairs = sorted({clean_symbol(d["symbol"]) for d in deals if d["symbol"]})
    summary["Currency Pairs"] = all_pairs

    n_removed = 0
    if exclude_forced:
        trade_rows = [r for r in rows if r["Type"] == "Closed position"]
        kept_trades = [r for r in trade_rows if not is_forced_close(r["Comment"])]
        n_removed = len(trade_rows) - len(kept_trades)

        non_trade_rows = [r for r in rows if r["Type"] != "Closed position"]
        rows = non_trade_rows + kept_trades

        recomputed = recompute_stats(kept_trades)
        if recomputed:
            summary.update(recomputed)
        summary["Forced Closes Excluded"] = True
        summary["Forced Closes Removed"] = n_removed
        summary["Note"] = (
            "Total Trades, Net/Gross Profit, Profit Factor, largest/average "
            "trade, win-rate by side, and Currency Pairs were recalculated "
            "after excluding forced end-of-test closes. Drawdown, Sharpe/"
            "Recovery/Z-Score, consecutive win/loss streaks, and holding-"
            "time stats still reflect the full original backtest, since "
            "they require the complete equity curve to recompute correctly."
        )
    else:
        summary["Forced Closes Excluded"] = False

    summary["Balance Growth"] = build_balance_growth(rows)

    write_csv(rows, csv_path)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    return csv_path, json_path, len(deals), len(rows), summary, n_removed, rows


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    combined = "--combined" in flags
    exclude_forced = "--exclude-forced-closes" in flags

    if len(args) != 2:
        print(
            "Usage:\n"
            "  Single file:  python3 mt5_deals_to_csv.py report.html export_folder/\n"
            "  Whole folder: python3 mt5_deals_to_csv.py reports_folder/ export_folder/\n"
            "                [--combined]              also write one combined.json with all systems\n"
            "                [--exclude-forced-closes]  drop positions that were force-closed at\n"
            "                                            end-of-test (still open when backtest ended)"
        )
        sys.exit(1)

    in_path, outdir = args
    os.makedirs(outdir, exist_ok=True)

    # --- NEW INJECTION: Load system_data.json mapping ---
    system_data_map = {}
    if os.path.exists("system_data.json"):
        try:
            with open("system_data.json", "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    if "system" in item:
                        system_data_map[item["system"]] = {
                            "name": item.get("name", "NO NAME"),
                            "description": item.get("description", "NO DESCRIPTION")
                        }
        except Exception as e:
            sys.stderr.write(f"Warning: Failed to load system_data.json: {e}\n")
    # ----------------------------------------------------

    if os.path.isdir(in_path):
        html_files = sorted(
            f for f in os.listdir(in_path) if f.lower().endswith(".html")
        )
        if not html_files:
            print(f"No .html files found in {in_path}")
            sys.exit(1)

        combined_summaries = []
        combined_rows = []
        for fname in html_files:
            full_path = os.path.join(in_path, fname)
            try:
                # Note the updated function call here to pass system_data_map
                csv_path, json_path, n_deals, n_rows, summary, n_removed, rows = convert_one(
                    full_path, outdir, exclude_forced=exclude_forced, system_data_map=system_data_map
                )
                removed_note = f", removed {n_removed} forced closes" if exclude_forced else ""
                print(f"{fname}: {n_deals} deals -> {n_rows} rows{removed_note} "
                      f"-> {os.path.basename(csv_path)}, {os.path.basename(json_path)}")
                if combined:
                    entry = {"File": os.path.splitext(os.path.basename(json_path))[0]}
                    entry.update(summary)
                    combined_summaries.append(entry)
                    combined_rows.extend(rows)
            except Exception as e:
                sys.stderr.write(f"Failed to convert {fname}: {e}\n")

        if combined:
            combined_path = os.path.join(outdir, "combined.json")
            combined_data = {
                "systems": combined_summaries,
                "Combined Balance Growth": build_balance_growth(combined_rows) if combined_rows else [],
            }
            with open(combined_path, "w", encoding="utf-8") as f:
                json.dump(combined_data, f, indent=2, ensure_ascii=False)
            print(f"Wrote combined summary for {len(combined_summaries)} systems to {combined_path}")
    else:
        csv_path, json_path, n_deals, n_rows, summary, n_removed, rows = convert_one(
            in_path, outdir, exclude_forced=exclude_forced, system_data_map=system_data_map
        )
        print(f"Parsed {n_deals} deals -> wrote {n_rows} rows to {csv_path}")
        if exclude_forced:
            print(f"Removed {n_removed} forced end-of-test closes")
        print(f"Wrote summary to {json_path}")
        if combined:
            sys.stderr.write("Note: --combined only applies when converting a folder; ignored for a single file.\n")


if __name__ == "__main__":
    main()