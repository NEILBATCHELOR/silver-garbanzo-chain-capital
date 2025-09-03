# NAV Module Database Analysis

## Overview

This document outlines the database structure analysis for the NAV (Net Asset Value) engine implementation, following the specifications in the NAV Spec document.

## Existing Database Structure

### Core NAV Tables

#### asset_nav_data
**Purpose**: Main NAV storage table (already exists)
- `id` (UUID PK) - Primary identifier
- `asset_id` (UUID) - References products in various product tables
- `project_id` (UUID) - Links to projects table
- `date` (DATE) - Valuation date (NOT timestamptz - uses DATE)
- `nav` (NUMERIC) - Net Asset Value 
- `total_assets` (NUMERIC) - Total assets value
- `asset_name` (TEXT) - Descriptive name
- `total_liabilities` (NUMERIC) - Total liabilities (default 0)
- `outstanding_shares` (NUMERIC) - Shares outstanding
- `previous_nav` (NUMERIC) - Previous NAV for change calculation
- `change_amount` (NUMERIC) - NAV change amount
- `change_percent` (NUMERIC) - NAV change percentage
- `source` (TEXT) - Data source (manual/oracle/calculated/administrator)
- `validated` (BOOLEAN) - Validation status
- `validated_by` (UUID) - Validator user ID
- `validated_at` (TIMESTAMPTZ) - Validation timestamp
- `notes` (TEXT) - Additional notes
- `calculation_method` (TEXT) - Method used for calculation
- `market_conditions` (TEXT) - Market conditions context
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID) - Creator user ID
- `calculated_nav` (NUMERIC) - **GENERATED ALWAYS AS** computed column

#### asset_holdings
**Purpose**: Composite asset holdings for funds/MMFs
- `id` (UUID PK)
- `asset_id` (UUID) - References the parent asset
- `holding_type` (TEXT) - Type of holding (Government Securities, Repos, etc.)
- `quantity` (NUMERIC) - Quantity held
- `value` (NUMERIC) - Current value
- `maturity_date` (DATE) - Maturity date
- `credit_rating` (TEXT) - Credit rating
- `source` (TEXT) - Data source
- `updated_at` (TIMESTAMPTZ)
- `oracle_price` (NUMERIC) - Oracle price data
- `last_oracle_update` (TIMESTAMPTZ) - Last oracle update

**Note**: Has MMF compliance constraints (maturity ≤ 397 days for Government Securities, etc.)

### Product Tables

The system uses multiple product-specific tables, all linked to `projects.id` via `project_id`:

#### Discovered Product Tables:
- `fund_products` - ETFs, mutual funds, MMFs
- `bond_products` - Fixed income securities
- `equity_products` - Stocks and equity securities  
- `commodities_products` - Commodity investments
- `structured_products` - Structured investment products
- `quantitative_investment_strategies_products` - Quant strategies
- `private_equity_products` - Private equity investments
- `private_debt_products` - Private debt investments
- `real_estate_products` - Real estate investments
- `energy_products` - Energy sector investments
- `infrastructure_products` - Infrastructure investments
- `collectibles_products` - Collectibles and other assets
- `asset_backed_products` - Asset-backed securities
- `digital_tokenized_fund_products` - Digital tokenized funds
- `stablecoin_products` - Stablecoin products

#### Sample Product Table Structure (fund_products):
- `id` (UUID PK)
- `project_id` (UUID FK -> projects.id)
- `fund_name` (TEXT)
- `fund_type` (VARCHAR)
- `net_asset_value` (NUMERIC) - Current NAV
- `assets_under_management` (NUMERIC) - AUM
- `expense_ratio` (NUMERIC) - Management fees
- `holdings` (JSONB) - Holdings data
- `currency` (VARCHAR) - Base currency
- `status` (VARCHAR) - Fund status
- Standard audit fields (created_at, updated_at)

### Projects Table
**Purpose**: Central project management
- `id` (UUID PK)
- `organization_id` (UUID) - Multi-tenant organization
- `name` (TEXT) - Project name
- `description` (TEXT) - Description
- `project_type` (TEXT) - Type of project/product
- `status` (VARCHAR) - Project status
- `target_raise` (NUMERIC) - Funding target
- `currency` (TEXT) - Base currency
- Financial and legal fields (maturity_date, minimum_investment, etc.)

## Key Relationships

### Product → Asset NAV Flow:
1. `projects.id` ← `{product_table}.project_id`
2. `{product_table}.id` → `asset_nav_data.asset_id`
3. `{product_table}.id` → `asset_holdings.asset_id` (for composite assets)

### Multi-Product Support:
- Each project can have multiple products across different product tables
- NAV calculations must aggregate across product types
- Product type determined by which table contains the asset

## Identified Gaps for NAV Module

### Missing Tables (Need to be created):

#### 1. nav_calculation_runs
**Purpose**: Track NAV calculation processes
```sql
CREATE TABLE nav_calculation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    product_type TEXT NOT NULL,
    project_id UUID NULL REFERENCES projects(id),
    valuation_date DATE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL CHECK (status IN ('queued','running','failed','completed')) DEFAULT 'queued',
    inputs_json JSONB,
    result_nav_value NUMERIC NULL,
    nav_per_share NUMERIC NULL,
    fx_rate_used NUMERIC NULL,
    pricing_sources JSONB NULL,
    error_message TEXT NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nav_calc_runs_asset_date ON nav_calculation_runs (asset_id, valuation_date);
CREATE INDEX idx_nav_calc_runs_status ON nav_calculation_runs (status);
CREATE INDEX idx_nav_calc_runs_project_date ON nav_calculation_runs (project_id, valuation_date);
```

#### 2. nav_validation_results
**Purpose**: Store validation rule results
```sql
CREATE TABLE nav_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES nav_calculation_runs(id) ON DELETE CASCADE,
    rule_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info','warn','error')),
    passed BOOLEAN NOT NULL,
    details_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nav_validation_run ON nav_validation_results (run_id);
```

#### 3. nav_approvals
**Purpose**: Approval workflow for NAV data
```sql
CREATE TABLE nav_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES nav_calculation_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft','validated','approved','rejected','published')) DEFAULT 'draft',
    requested_by UUID NOT NULL,
    validated_by UUID NULL,
    approved_by UUID NULL,
    approved_at TIMESTAMPTZ NULL,
    comments TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nav_approvals_run_status ON nav_approvals (run_id, status);
```

#### 4. nav_redemptions
**Purpose**: Track redemption rates and activity
```sql
CREATE TABLE nav_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    product_type TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    shares_redeemed NUMERIC NOT NULL DEFAULT 0,
    value_redeemed NUMERIC NOT NULL DEFAULT 0,
    redemption_rate NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(asset_id, as_of_date)
);
```

#### 5. nav_fx_rates
**Purpose**: Foreign exchange rates for multi-currency NAV
```sql
CREATE TABLE nav_fx_rates (
    base_ccy TEXT NOT NULL,
    quote_ccy TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    as_of TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'chainlink',
    
    PRIMARY KEY (base_ccy, quote_ccy, as_of)
);
```

#### 6. nav_price_cache (Optional)
**Purpose**: Cache market prices for performance
```sql
CREATE TABLE nav_price_cache (
    instrument_key TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    as_of TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    
    PRIMARY KEY (instrument_key, source, as_of)
);
```

### Missing Indexes on Existing Tables:
```sql
-- Add indexes for asset_nav_data if missing
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_asset_date ON asset_nav_data (asset_id, date);
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_project_date ON asset_nav_data (project_id, date);
CREATE INDEX IF NOT EXISTS idx_asset_nav_data_source_status ON asset_nav_data (source, validated);
```

## Asset Type Mapping

### Product Table to Asset Type Mapping:
| Product Table | Asset Type | NAV Calculation Method |
|---------------|------------|----------------------|
| `fund_products` | MMF/ETF/Fund | Holdings-based aggregation |
| `bond_products` | Fixed Income | Mark-to-market + accrued interest |
| `equity_products` | Equity | Market price × shares |
| `commodities_products` | Commodities | Spot/futures price × units |
| `stablecoin_products` | Stablecoin | Collateral-based (varies by type) |
| `asset_backed_products` | Receivables | Discounted cash flow |
| `private_equity_products` | Private Equity | Appraisal-based |
| `private_debt_products` | Private Debt | Amortized cost + interest |
| `real_estate_products` | Real Estate | Appraisal + cap rate |
| `energy_products` | Energy | Production-based DCF |
| `infrastructure_products` | Infrastructure | Revenue projections |
| `collectibles_products` | Collectibles | Last appraisal |
| `structured_products` | Structured | Underlying + risk adjustments |
| `quantitative_investment_strategies_products` | Quant | Strategy returns |
| `digital_tokenized_fund_products` | Digital Fund | Mirror underlying |

## Currency and Multi-Product Considerations

### Multi-Currency Support:
- Projects have base `currency` field
- Products may have different base currencies
- FX conversion needed for portfolio-level NAV
- Historical FX rates required for time series

### Multi-Product Projects:
- Single project can contain multiple products
- Portfolio-level NAV = weighted sum of constituent NAVs
- Currency conversion to project base currency
- Aggregate validation rules

## Integration Points

### Existing Systems to Leverage:
1. **Audit System**: Existing audit_logs table for NAV workflow tracking
2. **Permissions**: Use existing RBAC for nav.read/nav.calculate/nav.approve
3. **Organizations**: Multi-tenant support via organization_id
4. **Wallet Integration**: For on-chain NAV publishing (HSM/DFNS)
5. **Climate Receivables**: Reuse valuation logic for energy/climate assets
6. **Factoring**: Reuse receivables valuation for asset-backed products

### External Data Requirements:
1. **Market Data**: Price feeds (Chainlink, CoinGecko)
2. **FX Rates**: Currency conversion data
3. **Blockchain**: On-chain token supply/price data

## Next Steps

1. **Phase 2**: Create SQL migration scripts for missing tables
2. **Phase 3**: Begin backend service implementation
3. **Validation**: Test with existing product data
4. **Integration**: Connect with existing audit/auth systems

## Risk Considerations

1. **Data Integrity**: Ensure atomic NAV calculations
2. **Performance**: Index strategy for large datasets
3. **Compliance**: MMF-specific rules (Rule 2a-7)
4. **Precision**: High-precision decimal math for financial calculations
5. **Multi-tenancy**: Organization-level data isolation
6. **Audit Trail**: Complete traceability of NAV changes
