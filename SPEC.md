# SPEC.md — Anomaly Detection & Predictive Maintenance Analysis Plan

## Problem Statement

The GCSS-MC dataset spans ~2020–2024 and captures the full repair lifecycle for Marine Corps equipment: service requests (`sr_header`, 103k rows), parts consumed per request (`sr_parts`, 98k rows), and supply requisitions (`due_in`, 38k rows), joined on `SR_NUMBER`. All identifiers are hashed (NSN, TAMCN, serial numbers, units), but structural relationships within those hashes are preserved.

Our goal: surface anomalies that indicate financial irregularities, chronic maintenance failures, and supply chain breakdown — and illustrate them with reproducible pandas analysis. This document is the plan; a companion notebook will implement it.

---

## Data Preparation Notes

### Known Schema Problem: `due_in` Numeric Columns Stored as TEXT

The `load_data.py` script applies type inference via the data dictionary. The `due_in` data dict uses a `Column / Comment` format (not `COLUMN_NAME / DATA_TYPE`), so the loader defaults every column in `due_in` to `TEXT`. This silently breaks numeric operations on `CWT`, `OST`, `LRT`, `UNIT_PRICE`, `ESTABLISHED_TO_MRO`, `MRO_TO_SHIP`, `RDD_DAYS_FROM_BASE`, etc.

**Fix at load time:**

```python
NUMERIC_COLS_DUE_IN = [
    'UNIT_PRICE', 'STATUS_QTY', 'BO_QTY_FIRST', 'BO_QTY_LAST',
    'QTY_PEND_SHIP', 'BM_QTY', 'BZ_BV_QTY', 'BG_QTY', 'BJ_QTY',
    'QTY_CANCELLED', 'D9_QTY', 'QTY_SHIPPED', 'QTY_RECEIVED',
    'DRA_QTY', 'COR_QTY', 'DRB_QTY', 'DRF_QTY',
    'ESTABLISHED_TO_MRO', 'MRO_TO_SHIP', 'OST', 'LRT', 'CWT',
    'RDD_DAYS_FROM_BASE', 'RDD_DAYS_FROM_TODAY',
    'DOC_FY', 'FY_QTR', 'DOC_FY_QTR', 'FY_MTH', 'RULE_ASSIGNED', 'TASK_NBR',
]

for col in NUMERIC_COLS_DUE_IN:
    if col in df_due_in.columns:
        df_due_in[col] = pd.to_numeric(df_due_in[col], errors='coerce')
```

Similarly, parse all `*_DT` columns to datetime:

```python
date_cols = [c for c in df_due_in.columns if c.endswith('_DT')]
for col in date_cols:
    df_due_in[col] = pd.to_datetime(df_due_in[col], errors='coerce')

for col in ['DATE_RECEIVED_IN_SHOP', 'DEADLINED_DATE', 'JOB_STATUS_DATE']:
    df_sr_header[col] = pd.to_datetime(df_sr_header[col], errors='coerce')
```

### Preferred Join Strategy

`SR_NUMBER` is the primary join key across all three tables. `due_in` links to `sr_header` 1:many (one SR may have many requisitions). A fully enriched analytical frame:

```python
df_full = (
    df_sr_header
    .merge(df_due_in, on='SR_NUMBER', how='left')
    .merge(
        df_sr_parts.groupby('SR_NUMBER').agg(
            part_count=('RNSN', 'count'),
            total_parts_charge=('PARTS_CHARGE', 'sum'),
            unique_parts=('RNSN', 'nunique'),
        ).reset_index(),
        on='SR_NUMBER', how='left'
    )
)
```

Use `RDD_CAL_DT_CURATED` everywhere instead of `RDD_CAL_DT`. The latter has a confirmed Julian-date/year-rollover bug (835 records flagged with `RDD_ERROR`).

---

## Analysis Plan

### 1. Data Quality & Source System Bugs

These must be identified first — they contaminate every downstream analysis.

#### 1a. RDD Julian Date Rollover Bug

835 records in `due_in` carry the error:
> `"ERROR: RDD < requisition and next-year rollover exceeds 100 days"`

These are cases where the source system (GCSS-MC) failed to roll the fiscal year correctly when computing Required Delivery Dates at year boundaries.

```python
rdd_errors = df_due_in[df_due_in['RDD_ERROR'].notna()]
print(f"Affected records: {len(rdd_errors)}")  # → 835

# Distribution by fiscal year / quarter
rdd_errors.groupby(['DOC_FY', 'DOC_FY_QTR']).size().sort_index()
```

**Expected finding:** Errors cluster at fiscal year transitions (Q1 of each FY, i.e., Oct–Dec), confirming the Julian date rollover defect. Any time-to-fulfill metric computed from `RDD_CAL_DT` on these records is meaningless.

#### 1b. Field-Swap Data Quality Issues

Two distinct cases were found where incorrect values appear in structured fields:

- `MASTER_PRIORITY_CODE` has 2 records containing `"01-DEC-23"` — a date stored where a priority code should be.
- `ECHELON_OF_MAINT` has 2 records containing `"E17982G"` — a unit identification code stored where an echelon level (1–5) should be.

```python
# Priority code should match pattern: NN [A|B|C]-[Level]
valid_priority = df_sr_header['MASTER_PRIORITY_CODE'].str.match(r'^\d{2}\s+[ABC]-', na=False)
bad_priority = df_sr_header[~valid_priority & df_sr_header['MASTER_PRIORITY_CODE'].notna()]

# Echelon should be 1–5
valid_echelon = df_sr_header['ECHELON_OF_MAINT'].isin(['1', '2', '3', '4', '5'])
bad_echelon = df_sr_header[~valid_echelon & df_sr_header['ECHELON_OF_MAINT'].notna()]
```

#### 1c. Unrecognized RDD Codes

6,937 records (18% of `due_in`) carry `RDD_MEANING = "Unrecognized or non-JDATE RDD"`. These requisitions cannot be classified into standard delivery priority tiers.

```python
rdd_dist = df_due_in.groupby('RDD_MEANING').size().sort_values(ascending=False)
# Also check CURATED_RDD_MEANING for recovery rate
curated_recovery = df_due_in.groupby(['RDD_MEANING', 'CURATED_RDD_MEANING']).size()
```

#### 1d. Null PARTS_CHARGE in `sr_parts`

34,564 of 98,210 records (35%) in `sr_parts` have null `PARTS_CHARGE`. These correlate almost exactly with null `SERVICE_ACTIVITY` rows, suggesting they represent unposted or labor-only transactions.

```python
parts_null_charge = df_sr_parts[df_sr_parts['PARTS_CHARGE'].isna()]
print(parts_null_charge['SERVICE_ACTIVITY'].value_counts(dropna=False))
# Hypothesis: null charge ↔ null SERVICE_ACTIVITY (unposted/labor records)
```

---

### 2. Financial & Pricing Anomalies

**Goal:** Flag NSNs where unit cost deviates significantly from historical baseline, and identify suspiciously priced requisitions.

#### 2a. Per-NSN Price Baseline with 5-Sigma Flagging

```python
price_stats = (
    df_due_in[df_due_in['UNIT_PRICE'] > 0]
    .groupby('NSN_ORDERED')['UNIT_PRICE']
    .agg(mean='mean', std='std', count='count')
    .reset_index()
)

df_due_in = df_due_in.merge(price_stats, on='NSN_ORDERED', how='left')
df_due_in['price_zscore'] = (
    (df_due_in['UNIT_PRICE'] - df_due_in['mean']) / df_due_in['std']
).abs()

price_anomalies = df_due_in[
    (df_due_in['price_zscore'] > 5) | (df_due_in['UNIT_PRICE'] > 1_000_000)
].sort_values('UNIT_PRICE', ascending=False)
```

#### 2b. Parts Charge Outliers (Actual Expenditure)

`PARTS_CHARGE` in `sr_parts` reflects real money spent, not catalog price. Max observed: **$1,010,000** on a single line item.

```python
charge_99th = df_sr_parts['PARTS_CHARGE'].quantile(0.99)

high_charge = df_sr_parts[df_sr_parts['PARTS_CHARGE'] > charge_99th].copy()
high_charge = high_charge.merge(
    df_sr_header[['SR_NUMBER', 'TAMCN', 'DEFECT_CODE', 'MASTER_PRIORITY_CODE']],
    on='SR_NUMBER', how='left'
)
# Expected: RNSN rnsn_4Bodk9JUIZvbSn1ccl7l appears 320 times for $3.7M total
```

#### 2c. Zero-Dollar Parts (Potential Recording Anomaly)

97 `sr_parts` records have `PARTS_CHARGE = 0.00` with a valid `RNSN`. These may indicate free-issue items, recording errors, or government-furnished equipment bypassing normal costing.

```python
zero_charge = df_sr_parts[df_sr_parts['PARTS_CHARGE'] == 0]
zero_charge.merge(df_sr_header[['SR_NUMBER', 'TAMCN', 'DEFECT_CODE']], on='SR_NUMBER')
```

---

### 3. End-Item Maintenance Burden (TAMCN)

**Goal:** Identify equipment types that impose a disproportionate share of maintenance cost and frequency.

#### 3a. Total and Per-Incident Cost by TAMCN

Real data shows extreme spread. The top 10 TAMCNs by total parts charge:

| TAMCN | SRs | Total Charge | Avg per SR |
|---|---|---|---|
| `tamcn_A2SzfB7l...` | 378 | $11.4M | $3,923 |
| `tamcn_n7urpf-J...` | 142 | $8.0M | $32,352 |
| `tamcn__dR7_haW...` | 43 | $6.6M | **$71,085** |
| `tamcn_NQ7dz8XS...` | 104 | $6.3M | $32,821 |

`tamcn__dR7_haWtUOlToFPzG3u` with only 43 SRs but $6.6M total cost ($71k average per event) is a primary anomaly candidate.

```python
tamcn_burden = (
    df_sr_parts[df_sr_parts['PARTS_CHARGE'].notna()]
    .merge(df_sr_header[['SR_NUMBER', 'TAMCN', 'DEFECT_CODE']], on='SR_NUMBER')
    .groupby('TAMCN')
    .agg(
        sr_count=('SR_NUMBER', 'nunique'),
        total_charge=('PARTS_CHARGE', 'sum'),
        avg_charge_per_sr=('PARTS_CHARGE', lambda x: x.sum() / x.index.nunique()),
        top_defect=('DEFECT_CODE', lambda x: x.mode()[0] if len(x) > 0 else None),
    )
    .reset_index()
    .sort_values('total_charge', ascending=False)
)

# Anomaly flag: avg_charge_per_sr > 2 std above mean of all TAMCNs
mu = tamcn_burden['avg_charge_per_sr'].mean()
sigma = tamcn_burden['avg_charge_per_sr'].std()
tamcn_burden['is_outlier'] = tamcn_burden['avg_charge_per_sr'] > (mu + 2 * sigma)
```

#### 3b. High-Frequency Defect Codes per TAMCN

Some TAMCNs repeatedly appear with the same defect code — a signal of systemic design or quality issues rather than random failures.

```python
tamcn_defect = (
    df_sr_header
    .groupby(['TAMCN', 'DEFECT_CODE'])
    .size()
    .reset_index(name='count')
    .sort_values('count', ascending=False)
)

# For each TAMCN, compute what fraction of SRs share the most common defect
tamcn_total = df_sr_header.groupby('TAMCN')['SR_NUMBER'].count().rename('total_srs')
tamcn_defect = tamcn_defect.merge(tamcn_total, on='TAMCN')
tamcn_defect['defect_concentration'] = tamcn_defect['count'] / tamcn_defect['total_srs']

# Flag: single defect accounts for > 50% of all SRs for that TAMCN
systemic = tamcn_defect[tamcn_defect['defect_concentration'] > 0.5]
# Note: FCON.CBB is the top defect (49k records) — expect it to dominate several TAMCNs
```

---

### 4. Chronic Failure Units ("Lemon Detection")

**Goal:** Identify specific pieces of equipment (by serial number) that fail repeatedly, signaling an asset that has exceeded its useful life or has a latent defect.

Individual units with the most service requests (top observed):

- `serial_number_9NnYfvHxvzq-bBOiPkE0` (TAMCN `tamcn_ufzCtGpYSD_vsKL8ZEKL`): **11 separate SRs**
- Multiple units with 8–10 SRs across different TAMCNs

```python
unit_recurrence = (
    df_sr_header[df_sr_header['SERIAL_NUMBER'].notna()]
    .groupby(['SERIAL_NUMBER', 'TAMCN'])
    .agg(
        sr_count=('SR_NUMBER', 'nunique'),
        first_sr=('DATE_RECEIVED_IN_SHOP', 'min'),
        last_sr=('DATE_RECEIVED_IN_SHOP', 'max'),
        defects=('DEFECT_CODE', lambda x: list(x.unique())),
    )
    .reset_index()
    .sort_values('sr_count', ascending=False)
)

# Days between first and last breakdown
unit_recurrence['days_active'] = (
    unit_recurrence['last_sr'] - unit_recurrence['first_sr']
).dt.days

# Lemon flag: >= 4 SRs OR sr_count in top 1%
threshold = unit_recurrence['sr_count'].quantile(0.99)
lemons = unit_recurrence[unit_recurrence['sr_count'] >= max(4, threshold)]
```

#### 4a. Time Between Failures (TBF) Distribution

For units with multiple SRs, the distribution of time between consecutive failures gives a failure rate estimate. Short TBF = deteriorating asset.

```python
# Sort SRs per serial number by date, compute inter-SR gaps
multi_sr_units = df_sr_header[
    df_sr_header['SERIAL_NUMBER'].isin(
        unit_recurrence[unit_recurrence['sr_count'] >= 3]['SERIAL_NUMBER']
    )
].copy()

multi_sr_units = multi_sr_units.sort_values(['SERIAL_NUMBER', 'DATE_RECEIVED_IN_SHOP'])
multi_sr_units['tbf_days'] = (
    multi_sr_units
    .groupby('SERIAL_NUMBER')['DATE_RECEIVED_IN_SHOP']
    .diff()
    .dt.days
)

# Short TBF (<30 days) after a prior repair suggests repair was ineffective
short_tbf = multi_sr_units[multi_sr_units['tbf_days'] < 30]
```

---

### 5. Order Pattern & Bulk Hoarding Anomalies

**Goal:** Flag requisitions where quantity ordered is out of proportion with historical norms per NSN, or where the same NSN is requisitioned many times under a single SR.

#### 5a. Quantity-Per-SR Ratio Flagging

Average `QUANTITY_REQUIRED` across all `sr_parts` is ~1.9. Max observed: **762 units** of one RNSN in a single line. The 95th percentile threshold will flag bulk orders.

```python
# Compute historical per-RNSN quantity baseline from due_in
nsn_qty_stats = (
    df_due_in.groupby('NSN_ORDERED')['STATUS_QTY']
    .agg(['mean', 'std', lambda x: x.quantile(0.95)])
    .rename(columns={'mean': 'qty_mean', 'std': 'qty_std', '<lambda_0>': 'qty_p95'})
    .reset_index()
)

# Flag any due_in record where STATUS_QTY > 95th pct for that NSN
df_due_in = df_due_in.merge(nsn_qty_stats, on='NSN_ORDERED', how='left')
df_due_in['qty_flag'] = df_due_in['STATUS_QTY'] > df_due_in['qty_p95']

# Extreme bulk orders (top observed):
# sr_number_qc-kJ8sobVZLjs22_G0o: 762 units of rnsn_qRLqdFGGfAhswb_3Loqx ($0.53/ea)
# sr_number_ZuvgbSFbbwwjvbjUjUL5: 704 units of rnsn_AOyRAgAyLrupsO6YUelz ($14.76/ea)
# sr_number_acN93d1ZCQ-3UxNE2RMb: 500 units each of 3 different parts (NULL charge)
```

#### 5b. Same NSN Repeated Many Times Within One SR (Due-In Loop Anomaly)

One SR (`sr_number_o8Gna47ar7m0RcQ8z5yV`) ordered the same NSN **140 times** in `due_in`. This may indicate a retry loop bug in the source system or manual re-submission of failed requisitions.

```python
repeat_nsn_in_sr = (
    df_due_in.groupby(['SR_NUMBER', 'NSN_ORDERED'])
    .size()
    .reset_index(name='order_count')
    .sort_values('order_count', ascending=False)
)

# Flag: same NSN ordered > 5 times under one SR
repeat_anomalies = repeat_nsn_in_sr[repeat_nsn_in_sr['order_count'] > 5]
# Top anomalies:
# sr_number_o8Gna47ar7m0RcQ8z5yV + nsn_ordered_1PGBxQTOjkbSpsKmyEAy: 140 repeats
# sr_number_L901Jv476TTkZXb5CDcS + nsn_ordered_YylvUjQat2gOWrBAVYmP: 106 repeats
```

#### 5c. Same-Day Multi-Part Orders — Intra-SR Time Gap Analysis

The expert noted: *"items ordered on the same day may have multiple parts such as tires. Is there any time gap in ordering the part? This could allude to a faulty part or bad troubleshooting."*

The `ESTABLISHED_DT` timestamp in `due_in` lets us compute the spread of requisition times within a single SR. A second burst of parts hours after initial ordering suggests the first attempt failed.

```python
sr_part_timing = (
    df_due_in[df_due_in['ESTABLISHED_DT'].notna()]
    .sort_values(['SR_NUMBER', 'ESTABLISHED_DT'])
    .groupby('SR_NUMBER')
    .agg(
        first_part_dt=('ESTABLISHED_DT', 'min'),
        last_part_dt=('ESTABLISHED_DT', 'max'),
        part_order_count=('DOC_NBR', 'nunique'),
    )
    .assign(order_spread_hours=lambda df: (
        (df['last_part_dt'] - df['first_part_dt']).dt.total_seconds() / 3600
    ))
    .reset_index()
)

# SRs where parts were ordered over multiple distinct days — possible failed repair followed by re-order
multi_day_orders = sr_part_timing[sr_part_timing['order_spread_hours'] > 24]
```

#### 5d. High-Frequency Failure Parts (Cross-SR RNSN Hotlist)

Some parts appear across a very large number of distinct SRs, signaling either a consumable that is universally used or a specific component with a high systemic failure rate.

Top observed (by distinct SR count):
- `rnsn_uqAXq9W1ZL0zmNTaXxnI`: 1,171 SRs, $81k total charge
- `rnsn_V0fQc9FnoulzOD1_ZmSS`: 984 SRs, $61k total charge
- `rnsn_728ztLsMUVUgYDb4QpBQ`: 765 SRs, $135k total charge
- `rnsn_4Bodk9JUIZvbSn1ccl7l`: 320 SRs, **$3.7M total charge** (outlier: $11.6k/use)

```python
rnsn_frequency = (
    df_sr_parts[df_sr_parts['PARTS_CHARGE'].notna()]
    .groupby('RNSN')
    .agg(
        sr_count=('SR_NUMBER', 'nunique'),
        total_qty=('QUANTITY_REQUIRED', 'sum'),
        total_charge=('PARTS_CHARGE', 'sum'),
        avg_charge_per_use=('PARTS_CHARGE', 'mean'),
    )
    .reset_index()
    .sort_values('sr_count', ascending=False)
)

# Flag: SR count > 99th percentile AND avg_charge_per_use > median * 10
sr_p99 = rnsn_frequency['sr_count'].quantile(0.99)
median_charge = rnsn_frequency['avg_charge_per_use'].median()

rnsn_frequency['is_high_freq'] = rnsn_frequency['sr_count'] > sr_p99
rnsn_frequency['is_high_cost'] = rnsn_frequency['avg_charge_per_use'] > (median_charge * 10)
```

---

### 6. Supply Chain Bottleneck Detection

**Goal:** Identify NSNs and SOS pairings where Customer Wait Time (CWT) is systemically elevated, indicating a paralyzed supply chain.

#### 6a. CWT Distribution and NSN-Level Bottlenecks

CWT (days from requisition established to customer receipt) ranges widely. The highest-CWT NSNs represent parts that routinely take many months to receive — a readiness risk.

Top NSNs by average CWT (among those with >= 3 orders):
- `nsn_ordered_1PGBxQTOjkbSpsKmyEAy`: 910 orders, avg CWT **~429 days**
- `nsn_ordered_YylvUjQat2gOWrBAVYmP`: 241 orders, avg CWT **~299 days**

```python
cwt_by_nsn = (
    df_due_in[df_due_in['CWT'].notna() & (df_due_in['CWT'] > 0)]
    .groupby('NSN_ORDERED')
    .agg(
        order_count=('CWT', 'count'),
        avg_cwt=('CWT', 'mean'),
        max_cwt=('CWT', 'max'),
        p90_cwt=('CWT', lambda x: x.quantile(0.90)),
    )
    .reset_index()
)

# Require >= 3 orders to have a stable estimate
cwt_stable = cwt_by_nsn[cwt_by_nsn['order_count'] >= 3]

# Flag: avg CWT > 180 days (6 months) = likely systemic bottleneck
bottlenecks = cwt_stable[cwt_stable['avg_cwt'] > 180].sort_values('avg_cwt', ascending=False)
```

#### 6b. SOS (Source of Supply) Performance Comparison

Group CWT by SOS to identify whether delays are NSN-specific or supplier-specific.

```python
cwt_by_sos = (
    df_due_in[df_due_in['CWT'].notna() & (df_due_in['CWT'] > 0)]
    .groupby('SOS')
    .agg(
        order_count=('CWT', 'count'),
        avg_cwt=('CWT', 'mean'),
        median_cwt=('CWT', 'median'),
        fill_rate=('DOC_STATUS', lambda x: (x == 'Complete').mean()),
    )
    .reset_index()
    .sort_values('avg_cwt', ascending=False)
)
```

#### 6c. OST Trend by Fiscal Quarter

Order-and-Shipping Time (OST) should be tracked over time to detect deteriorating supply chain performance.

```python
df_due_in['fy_qtr_label'] = df_due_in['DOC_FY'].astype(str) + '-Q' + df_due_in['DOC_FY_QTR'].astype(str)

ost_trend = (
    df_due_in[df_due_in['OST'].notna() & (df_due_in['OST'] > 0)]
    .groupby('fy_qtr_label')
    .agg(avg_ost=('OST', 'mean'), median_ost=('OST', 'median'), n=('OST', 'count'))
    .reset_index()
    .sort_values('fy_qtr_label')
)
# OST rising across FY2020–FY2024 would signal systemic degradation
```

#### 6d. Cancellation Rate as a Bottleneck Proxy

When parts can't be fulfilled, requisitions get cancelled. A high cancellation rate for an NSN/SOS pair is an early signal of supply failure.

```python
cancellation_rate = (
    df_due_in
    .assign(is_cancelled=lambda df: df['DOC_STATUS'] == 'Cancelled')
    .groupby('NSN_ORDERED')
    .agg(
        total_orders=('DOC_STATUS', 'count'),
        cancelled=('is_cancelled', 'sum'),
    )
    .assign(cancel_rate=lambda df: df['cancelled'] / df['total_orders'])
    .reset_index()
)

high_cancel = cancellation_rate[
    (cancellation_rate['total_orders'] >= 5) & (cancellation_rate['cancel_rate'] > 0.4)
].sort_values('cancel_rate', ascending=False)
```

---

### 7. Seasonal / Fiscal Year Demand Spike Detection

**Goal:** Identify NSNs or TAMCN types with abnormal demand spikes by fiscal year and quarter — consistent with the expert observation to *"look for spikes in ordering the same part by fiscal year and/or quarter."*

```python
# Quarterly demand per NSN
demand_by_quarter = (
    df_due_in
    .groupby(['NSN_ORDERED', 'DOC_FY', 'DOC_FY_QTR'])
    .agg(qty=('STATUS_QTY', 'sum'), orders=('DOC_NBR', 'count'))
    .reset_index()
)

# Z-score within each NSN across quarters
demand_by_quarter['qty_zscore'] = (
    demand_by_quarter
    .groupby('NSN_ORDERED')['qty']
    .transform(lambda x: (x - x.mean()) / (x.std() + 1e-9))
)

demand_spikes = demand_by_quarter[demand_by_quarter['qty_zscore'] > 3].sort_values(
    'qty_zscore', ascending=False
)
```

---

### 8. Extreme SR Complexity Outliers

Some SRs are implausibly large — these may represent data aggregation errors, bulk depot events, or undetected system artifacts.

Top SR by part line count:
- `sr_number_8QodYdPCDYkkj9Y8x2CS`: **846 part lines**, 3,943 total qty, TAMCN `tamcn_LdTtAkWe7qujsAQoWR97`, received 2011-11-02
- `sr_number__xyErEA1komnovCZh1Bi`: **376 part lines**, received 2020-12-15

The 2011 date on the top SR is also suspicious — this dataset supposedly spans 2020–2024, suggesting either a data integrity issue or a long-running open SR.

```python
sr_complexity = (
    df_sr_parts.groupby('SR_NUMBER')
    .agg(
        part_lines=('RNSN', 'count'),
        unique_parts=('RNSN', 'nunique'),
        total_qty=('QUANTITY_REQUIRED', 'sum'),
        total_charge=('PARTS_CHARGE', 'sum'),
    )
    .reset_index()
    .merge(df_sr_header[['SR_NUMBER', 'TAMCN', 'DATE_RECEIVED_IN_SHOP', 'DEFECT_CODE']], on='SR_NUMBER')
    .sort_values('part_lines', ascending=False)
)

# Flag SRs with date outside expected range
sr_complexity['date_anomaly'] = (
    sr_complexity['DATE_RECEIVED_IN_SHOP'].dt.year < 2019
)
# sr_number_8QodYdPCDYkkj9Y8x2CS has DATE_RECEIVED_IN_SHOP = 2011-11-02
```

---

## Prioritized Output Plan

Each anomaly type should produce a flagged dataframe that can be persisted to SQLite or exported as CSV. The final deliverable should include:

| Output | Method | Key Fields |
|---|---|---|
| `anomaly_price` | Z-score per NSN on UNIT_PRICE | NSN, price, z-score, SOS |
| `anomaly_tamcn_burden` | Total + avg parts charge per TAMCN | TAMCN, SR count, total $, avg $ |
| `anomaly_lemon_units` | SR count per serial number | Serial, TAMCN, SR count, defects, TBF |
| `anomaly_bulk_order` | Qty > 95th pct per NSN; repeat NSN per SR | SR, NSN, qty, flag reason |
| `anomaly_cwt_bottleneck` | Avg CWT > 180 days per NSN | NSN, avg CWT, order count, SOS |
| `anomaly_rdd_error` | Confirmed RDD calculation bugs | SR, NSN, RDD_ERROR, FY/Qtr |
| `anomaly_data_quality` | Field-swap, out-of-range, null clusters | Table, field, value, SR |
| `anomaly_demand_spike` | Z-score > 3 on quarterly demand per NSN | NSN, FY, Qtr, qty, z-score |
| `anomaly_sr_complexity` | Part line count > 99th pct; date anomalies | SR, TAMCN, part lines, date |

All anomaly frames share a common schema prefix:
```python
# Each row in an anomaly output should carry:
# anomaly_type, severity (high/medium/low), SR_NUMBER (if applicable),
# entity_id (NSN/TAMCN/serial), metric_name, metric_value, flag_reason
```

This normalized structure allows all anomaly types to be stacked and reviewed in a single analyst dashboard.
