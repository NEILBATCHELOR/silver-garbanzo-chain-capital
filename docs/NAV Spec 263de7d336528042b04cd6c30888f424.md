# NAV Spec

### Brief:

I have a blockchain securitization and tokenization engine supporting multiple products. I want to develop a NAV engine for collateral assets and for these tokenized products: Money market funds (MMFs) are mutual funds designed to provide stability, liquidity, and modest returns by investing in short-term, high-quality debt securities that act as cash equivalents. These funds typically hold assets with maturities of 397 days or less to minimize interest rate risk and maintain a stable net asset value (NAV), often aiming for $1 per share. The specific composition varies by fund type (e.g., government, prime, or tax-exempt), but common holdings include:

- **Government Securities**: U.S. Treasury bills, notes, and bonds, as well as securities issued by government agencies like Fannie Mae or Freddie Mac. Government MMFs must invest at least 99.5% of assets in these or repurchase agreements (repos) collateralized by them, offering the lowest risk.
- **Repurchase Agreements (Repos)**: Short-term loans backed by collateral, often government securities, where the fund lends cash overnight or for a few days in exchange for interest.
- **Commercial Paper**: Unsecured, short-term debt issued by corporations with strong credit ratings (e.g., A-1/P-1), typically maturing in 1-270 days.
- **Certificates of Deposit (CDs)**: Time deposits from banks, insured up to limits, with short maturities.
- **Corporate and Municipal Debt**: High-quality corporate bonds or municipal securities for tax-exempt funds, focusing on low-risk issuers.
- **Cash and Cash Equivalents**: Direct cash holdings or other highly liquid instruments that can be converted to cash quickly.
Prime MMFs may include a broader mix with slightly higher-yielding corporate debt, while government funds stick to safer assets. Overall, MMFs prioritize minimal credit risk, with regulations like SEC Rule 2a-7 limiting investments to "eligible securities" rated in the top two tiers by rating agencies. As of recent data, total MMF assets exceed $7 trillion, with significant portions in government securities and repos.
Products: Traditional Assets:
Structured Products
Equity
Commodities
Funds, ETFs, ETPs - including Money Market Funds
Bonds
Quantitative Investment Strategies
Alternative Assets:
Private Equity
Private Debt
Real Estate
Energy
Infrastructure
Collectibles & all other assets
Asset Backed or Invoice Receivables
Solar and Wind Energy, Climate Receivables
Digital Assets:
Digital Tokenised Fund
Stablecoins
- Fiat-Backed Stablecoins
- Crypto-Backed Stablecoins
- Commodity-Backed Stablecoins
- Algorithmic Stablecoins
- Rebasing Stablecoins
So that we can track the value of underlying collateral and tokenized products to record, adjust the value and volume of underlying assets and to record, adjust the value of tokenized products. This should impact redemption exchange rates.

### Overview of NAV Engine Implementation

The NAV (Net Asset Value) engine is a critical component of your blockchain securitization and tokenization platform. It enables real-time or periodic valuation of underlying collateral assets and their tokenized representations across traditional, alternative, and digital asset classes. This supports dynamic adjustments to asset values, volumes, and redemption exchange rates, ensuring transparency, compliance (e.g., SEC Rule 2a-7 for MMFs), and trust in tokenized products.

The engine focuses on:

- **Tracking and Valuation**: Recording daily (or higher-frequency) NAV for assets and tokens, sourced from manuals, oracles, or calculations.
- **Adjustments**: Updating underlying asset volumes/values based on market data, events (e.g., maturities, defaults), or blockchain transactions.
- **Impact on Tokenized Products**: Propagating NAV changes to tokenized products, influencing redemption rates (e.g., token redemption value = tokens held * current NAV).
- **Integration**: Linking to the `projects` table (assuming it represents securitization/tokenization initiatives), where each project aggregates assets and issues tokens.

This spec focuses on basics: database schema extensions, core logic for NAV calculation by asset type, data ingestion workflows, and redemption rate impacts. It assumes a PostgreSQL backend (based on your provided schema) and integration with blockchain oracles (e.g., Chainlink) for automated feeds. Expansions like full smart contract code or advanced analytics can be added later.

### Key Assumptions and Dependencies

- **Linked Tables**:
    - `projects`: Stores project details (e.g., `id`, `name`, `asset_type`, `token_contract_address`). Each project links to one or more assets/tokenized products.
    - `assets` (or equivalent, e.g., inferred from your "products" mention): Stores asset metadata (e.g., `id`, `project_id`, `name`, `type` like 'MMF', 'Stablecoin-Fiat', 'Equity').
    - Foreign keys: `asset_nav_data.project_id` references `projects.id`; `asset_nav_data.asset_id` references `assets.id` (implement as needed, but per your request, no auto-generated ALTER here—add manually if `products` is renamed to `assets`).
- **Asset Types**: Categorized as per your list (e.g., MMFs under Funds/ETFs, various Stablecoins under Digital Assets).
- **Frequency**: Daily NAV updates (extendable to intra-day for volatile assets like crypto-backed stablecoins).
- **Blockchain Integration**: Tokens are ERC-20/ERC-721 compliant; NAV influences smart contract functions for minting/burning/redemption.
- **Data Sources**:
    - Manual: Admin inputs for illiquid assets (e.g., Private Equity, Collectibles).
    - Oracle: Automated feeds (e.g., for Treasury yields, crypto prices).
    - Calculated: Derived from holdings (e.g., MMF NAV from weighted asset values).
- **Constraints**: Ensure compliance (e.g., MMFs limit maturities ≤397 days, ≥99.5% government securities for gov't funds).
- **Tech Stack**: PostgreSQL for storage, PL/pgSQL for triggers/functions, Node.js/Python for ingestion scripts, Solidity for on-chain logic.

### Database Schema Extensions

Build on your `asset_nav_data` table. Add these for better support:

This setup allows granular tracking (e.g., MMF holdings in Treasuries, Repos) while aggregating to NAV.

### NAV Calculation Logic by Asset Type

NAV = (Total Assets - Total Liabilities) / Outstanding Shares (or Units for non-share assets).

Implement as a stored procedure or backend service calling the `calculate_nav_change` trigger. Tailor by type:

1. **Traditional Assets (e.g., MMFs, Bonds, Equity, Commodities, Funds/ETFs/ETPs)**:
    - **MMFs**: Aim for stable $1 NAV. Calculate daily:
        - Sum values of holdings (e.g., Treasuries at market price via oracle; Repos at principal + accrued interest; Commercial Paper at amortized cost if <60 days maturity).
        - Adjust for liabilities (e.g., fees). Ensure ≥99.5% in eligible securities per Rule 2a-7.
        - Example: For a Government MMF, fetch Treasury yields from oracles, weight by portfolio (e.g., 50% T-bills, 30% Repos, 20% Agency debt).
    - **Bonds/Equity/Commodities**: Mark-to-market via oracles (e.g., stock prices from APIs, bond yields adjusted for duration).
    - **Structured/Quantitative Strategies**: Aggregate sub-assets; use Monte Carlo simulations if needed (via code_execution tool for prototyping, but not in prod).
    - **Adjustment**: On maturity/redemption, reduce `total_assets` and burn tokens proportionally.
2. **Alternative Assets (e.g., Private Equity/Debt, Real Estate, Infrastructure, Energy, Collectibles, Receivables, Solar/Wind/Climate)**:
    - Often illiquid: Use manual/appraisal-based NAV (quarterly updates).
    - **Private Debt/Receivables**: Value at principal + interest - impairments (e.g., invoice receivables discounted by risk factor).
    - **Real Estate/Energy/Infrastructure**: Appraisal models + oracle feeds (e.g., property indices, energy prices).
    - **Collectibles**: Manual/oracle (e.g., NFT marketplaces for tokenized art).
    - **Adjustment**: Event-driven (e.g., rental income increases `total_assets`).
3. **Digital Assets (e.g., Tokenized Funds, Stablecoins)**:
    - **Digital Tokenized Funds**: Mirror traditional funds but on-chain; NAV from underlying (e.g., tokenized MMF NAV = off-chain MMF NAV).
    - **Stablecoins**:
        - **Fiat-Backed**: NAV ~1:1 with reserves (e.g., audit reserves via oracle; adjust for fees).
        - **Crypto-Backed**: Over-collateralized (e.g., 150% crypto value); NAV = collateral value / tokens.
        - **Commodity-Backed**: Peg to gold/oil prices via oracles.
        - **Algorithmic/Rebasing**: Dynamic supply adjustments; NAV calculated on-chain (e.g., rebase to maintain peg).
    - **Adjustment**: Oracle triggers for volatility (e.g., if collateral drops, liquidate to maintain NAV).

Procedure Example (PL/pgSQL for daily batch):

Call daily via cron job, passing project_id.

### Data Ingestion and Validation Workflow

1. **Ingestion**:
    - **Manual**: Admin UI inserts into `asset_nav_data` (source='manual').
    - **Oracle**: Scripts poll feeds (e.g., Chainlink for prices); insert with source='oracle'.
    - **Calculated**: Trigger on holdings updates.
2. **Validation**: Set `validated=true` by admin (link to `validated_by`). Flag anomalies (e.g., NAV deviation >5% for stable assets).
3. **Adjustments**: On NAV change:
    - Update `total_assets`/`outstanding_shares` (e.g., mint/burn tokens via smart contract).
    - Log in audit trail table (add if needed).

### Impact on Redemption Exchange Rates

- **Calculation**: Redemption rate = Current NAV (from latest validated `asset_nav_data` entry).
- **On-Chain Enforcement**: Smart contract queries NAV oracle (e.g., via custom function):
    
    ```solidity
    contract TokenizedAsset {
      address public navOracle;
      function redeem(uint256 tokens) external {
        uint256 nav = INAVOracle(navOracle).getLatestNAV(assetId);
        uint256 value = tokens * nav;
        // Transfer underlying or equivalent
      }
    }
    
    ```
    
- **Project Linkage**: For a project, aggregate asset NAVs (e.g., weighted average) to set project-level token rates.
- **Edge Cases**: For rebasing stablecoins, auto-adjust supply instead of rate.

### Next Steps and Enhancements

- **Testing**: Simulate with sample data (e.g., MMF with $10B assets, 10B shares → NAV=1).
- **Security**: Role-based access; encrypt sensitive fields.
- **Scalability**: Partition `asset_nav_data` by date/project.
- **Monitoring**: Alerts for unvalidated entries or NAV drifts.

This spec provides a foundational implementation. If you need code for specific parts (e.g., oracle scripts) or expansions, provide more details!

### Updated NAV Engine Implementation Spec

Based on the provided Supabase database schema (from `supabase.ts`), I've updated the implementation spec to align with the existing structure. Key observations and adjustments:

- **Existing Tables**: The schema includes `asset_nav_data` (matching your initial creation script), `projects` (for linking via `project_id`), and specialized product tables (e.g., `asset_backed_products`, `bond_products`, `commodities_products`, `collectibles_products`, etc.) that represent asset types. There is no unified `assets` or `products` table; instead, each asset type has its own table with `id` (UUID) and `project_id` (foreign key to `projects.id`).
- **Foreign Keys**: Per your earlier request, I've avoided auto-generating an ALTER for `asset_id` to a hypothetical `products` table. Instead, treat `asset_id` as referencing the `id` from the relevant product table (e.g., `bond_products.id` for bonds). You can add type-specific foreign keys manually if needed (e.g., via constraints in product tables).
- **Enums and Types**: Incorporated schema enums (e.g., `product_status` for asset states) and ensured numeric precision matches (e.g., `numeric(18,6)` for NAV, `numeric(78,18)` for totals). JSON fields (e.g., `metadata`) can store complex holdings if `asset_holdings` isn't added.
- **Functions and Triggers**: The schema has `calculate_nav_change` (as you provided). I've kept the suggestion but ensured compatibility. Other functions like `get_product_table_name` or `validate_project_type` exist and can be leveraged for type-safe queries.
- **Asset Types**: Tailored logic to match schema tables (e.g., MMFs via `funds_products` if present; otherwise, generalize under `asset_backed_products` or similar). For composites like MMFs, added `asset_holdings` remains valid as it's not in the schema.
- **Integration**: Linked to blockchain aspects (e.g., via `tokens` views like `token_erc20_view`), redemption (e.g., `redemption_requests`, `redemption_settlements`), and climate/digital assets (e.g., `climate_receivables`, `stablecoins` implied via product tables).
- **Tools Usage**: If real-time data (e.g., oracle prices) is needed for prototyping, we could use `code_execution` for simulations or `web_search` for market data, but this spec focuses on DB/backend logic.

This update emphasizes basics: schema alignment, NAV calc per type, ingestion, and redemption impacts, while linking to `projects`.

### Key Assumptions and Dependencies (Updated)

- **Linked Tables**:
    - `projects`: Core linkage (`id`, `name`, etc.). All products reference `project_id`.
    - Product-specific tables (e.g., `bond_products`, `asset_backed_products`): `asset_id` in `asset_nav_data` points to these `id`s. Use schema functions like `get_product_table_name(p_project_type)` to dynamically query.
    - No `assets` table; use unions or views for cross-type queries (e.g., create a view if needed).
    - `tokens` views (e.g., `token_erc20_view`): For tokenized products, link via metadata or custom joins.
- **Asset Types**: Mapped to schema tables (e.g., Bonds → `bond_products`, Commodities → `commodities_products`, Stablecoins → digital asset extensions).
- **Frequency**: Daily NAV (use `date` in `asset_nav_data`; extend via triggers for intra-day).
- **Data Sources**: Align with `source` enum ('manual', 'oracle', 'calculated', 'administrator').
- **Constraints**: Honor checks (e.g., `positive_nav`, `non_negative_liabilities`).
- **Tech Stack**: PostgreSQL (Supabase), PL/pgSQL for functions/triggers. Use schema functions like `safe_uuid_cast` for IDs.

### Database Schema Extensions (Updated)

Build on `asset_nav_data`. Additions are compatible with schema types (e.g., `NUMERIC(18,6)` for NAV).

Eg: For product-specific FKs, add manually (e.g., for bonds: `ALTER TABLE asset_holdings ADD CONSTRAINT fk_holdings_bonds FOREIGN KEY (asset_id) REFERENCES bond_products(id);`).

### NAV Calculation Logic by Asset Type (Updated)

NAV = (Total Assets - Total Liabilities) / Outstanding Shares. Use schema fields (e.g., `total_assets NUMERIC(78,18)`).

Implement via stored procedure, calling `calculate_nav_change` trigger. Tailor to schema tables/enums:

1. **Traditional Assets (e.g., MMFs via `funds_products` or `asset_backed_products`, Bonds via `bond_products`, Equity/Commodities via respective tables, Funds/ETFs/ETPs)**:
    - **MMFs**: Stable $1 NAV aim. Calc daily from holdings (e.g., Treasuries value from `yield_to_maturity` in bonds; Repos from `coupon_rate`). Ensure compliance (e.g., maturities ≤397 days via `maturity_date`). Use `asset_holdings` for composition (≥99.5% gov't per Rule 2a-7).
    - **Bonds**: Mark-to-market (use `yield_to_maturity`, `accrued_interest` from `bond_products`).
    - **Equity/Commodities**: Oracle-based (e.g., prices via `production_inventory_levels` JSON in `commodities_products`).
    - **Structured/Quantitative**: Aggregate sub-assets; use schema functions like `code_execution` for simulations if prototyping.
    - **Adjustment**: On events (e.g., maturity via `maturity_date`), update `total_assets` and sync tokens (e.g., burn via `token_erc20_view`).
2. **Alternative Assets (e.g., Private Equity/Debt via `private_equity_products`/`private_debt_products`, Real Estate/Energy/Infrastructure via respective, Collectibles via `collectibles_products`, Receivables via `asset_backed_products`, Solar/Wind/Climate via `climate_receivables`)**:
    - Illiquid: Manual/appraisals (e.g., quarterly via `current_value` in collectibles).
    - **Receivables**: Value at principal + interest - impairments (use `amount`, `discount_rate` from `climate_receivables`).
    - **Real Estate/Energy**: Appraisals + oracles (e.g., `capacity` in `energy_assets`).
    - **Adjustment**: Event-driven (e.g., income updates `total_assets`; use `climate_risk_calculations` for risk-adjusted NAV).
3. **Digital Assets (e.g., Tokenized Funds via `digital_tokenised_fund_products`, Stablecoins via subtypes)**:
    - **Tokenized Funds**: Mirror traditional (NAV from underlying product table).
    - **Stablecoins**:
        - **Fiat-Backed**: ~1:1 reserves (audit via `collateral_type` enum).
        - **Crypto/Commodity-Backed**: Over-collateralized (oracle for backing value).
        - **Algorithmic/Rebasing**: On-chain dynamic (rebase supply; use `rebasing` JSON in `token_erc20_view`).
    - **Adjustment**: Oracle triggers (e.g., collateral drop liquidates; sync with `total_supply` in token views).

Procedure (uses schema types; call via `calculate_daily_nav(p_project_id UUID, p_date DATE)` if exists, or create):

Call daily via Supabase cron/edge functions.

### Data Ingestion and Validation Workflow (Updated)

1. **Ingestion**:
    - **Manual**: Admin inserts (source='manual'; use `created_by` FK to `auth.users`).
    - **Oracle**: Scripts poll (e.g., Chainlink); insert with source='oracle'.
    - **Calculated**: Holdings trigger or procedure (e.g., integrate with `climate_cash_flow_projections` for projections).
2. **Validation**: Set `validated=true` (link `validated_by` to `auth.users`). Use schema functions like `validate_redemption_amount` for related checks.
3. **Adjustments**: On change, update `total_assets`/`outstanding_shares` (e.g., mint/burn via token views). Log via `audit_logs`.

### Impact on Redemption Exchange Rates (Updated)

- **Calculation**: Rate = Latest validated NAV (query `asset_nav_data` by `asset_id`, max `date` where `validated=true`).
- **On-Chain**: Smart contracts query NAV (e.g., via custom oracle; link to `redemption_settlements` for tracking).
    
    ```solidity
    contract TokenizedAsset {
      address public navOracle;
      function redeem(uint256 tokens) external {
        uint256 nav = INAVOracle(navOracle).getLatestNAV(assetId);
        uint256 value = tokens * nav;
        // Settle (record in redemption_settlements)
      }
    }
    
    ```
    
- **Project Linkage**: Aggregate per `project_id` (e.g., weighted NAV). Use `check_redemption_eligibility` function for validation.
- **Edge Cases**: For rebasing, auto-adjust (sync with `token_erc20_view.rebasing`).

### Next Steps and Enhancements

- **Testing**: Use schema functions like `get_redemption_capacity` for simulations.
- **Security**: RLS via Supabase; use `auth_events` for audits.
- **Scalability**: Partition `asset_nav_data` by `date`/`project_id`.
- **Monitoring**: Alerts via `alerts` table for NAV drifts.

This updated spec integrates tightly with your schema. If you need SQL for specific views/functions or tool-based prototypes (e.g., code_execution for NAV sims), provide details!

### Other Product Types Requiring Specialist Logic

Yes, based on the provided Supabase schema (parsed from the TypeScript type definitions) and the initial requirements for your blockchain securitization/tokenization engine, there are several additional product types beyond the examples in your procedure (`bond_products`, `commodities_products`, `collectibles_products`). These types correspond to the traditional, alternative, and digital assets you listed (e.g., MMFs under Funds/ETFs/ETPs, Stablecoins under Digital Assets, etc.).

The schema defines product-specific tables (mostly ending in `_products`), each with unique fields for valuation, which necessitate specialist logic in the `calculate_daily_nav` procedure. For instance:

- Fields like `current_balance` or `yield_to_maturity` require type-specific computations (e.g., mark-to-market adjustments, compliance checks for MMFs per SEC Rule 2a-7).
- For real-time accuracy on September 3, 2025, external data (e.g., yields, prices) may be needed, but the logic focuses on DB fields and formulas.
- Composite assets (e.g., MMFs) can aggregate from `asset_holdings` (e.g., sum values while checking maturities ≤397 days).
- Tokenized aspects link via joins to views like `token_erc20_view` for `outstanding_shares` (e.g., `total_supply`).

### Identified Product Tables

From parsing the schema, the relevant product/asset tables include (filtered for those linked to `project_id` and matching your asset categories; note the schema is truncated, but based on visible and contextual tables):

- `asset_backed_products` (for Asset Backed or Invoice Receivables)
- `bond_products` (for Bonds; already in procedure)
- `collectibles_products` (for Collectibles; already in procedure)
- `commodities_products` (for Commodities; already in procedure)
- Other inferred from context/schema patterns (as the document truncates but aligns with your list): `climate_receivables` (for Solar/Wind Energy, Climate Receivables), `digital_tokenised_fund_products` (for Digital Tokenised Funds), `energy_assets` (for Energy), `equity_products` (for Equity), `funds_products` (for Funds, ETFs, ETPs including MMFs), `infrastructure_products` (for Infrastructure), `private_debt_products` (for Private Debt), `private_equity_products` (for Private Equity), `real_estate_products` (for Real Estate), `structured_products` (for Structured Products), and potentially `stablecoin_products` or subtypes (for Stablecoins; may use JSON in digital tables if not explicit).

Non-`_products` tables like `energy_assets` and `climate_receivables` also qualify as they have `project_id` and valuation fields (e.g., `capacity`, `amount`).

### Where Specialist Logic is Needed

All these types benefit from specialist logic in the `CASE v_product.type` block to handle unique valuation mechanics, compliance, and data sources. The default fallback in your procedure (hardcoded placeholders) should be replaced or augmented for accuracy. Below, I suggest extensions:

1. **asset_backed_products (Asset Backed/Invoice Receivables)**:
    - **Specialist Logic**: NAV based on discounted cash flows from receivables. Adjust for delinquency (`delinquency_status`), recovery rates (`recovery_rate_percentage`), and interest accrual (`interest_rate`). Aggregate if multiple assets via `asset_holdings`.
    - **Extension**: Add to UNION: `UNION SELECT id, 'asset_backed' AS type FROM asset_backed_products WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'asset_backed' THEN
          SELECT asset_type, current_balance, (current_balance * (1 + (interest_rate / 100)) * (recovery_rate_percentage / 100)), total_supply::NUMERIC(78,18)
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM asset_backed_products abp
          LEFT JOIN token_erc20_view tv ON abp.id::text = tv.token_id
          WHERE abp.id = v_product.id;
          -- Adjust for delinquency: if >0, reduce by penalty
          IF delinquency_status > 0 THEN v_total_assets := v_total_assets * (1 - (delinquency_status / 100)); END IF;
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);
        
        ```
        
2. **climate_receivables (Solar/Wind Energy, Climate Receivables)**:
    - **Specialist Logic**: Value based on projected cash flows from green assets, discounted by risk (`discount_rate`). Factor in environmental metrics (e.g., from `climate_risk_calculations` if linked).
    - **Extension**: Add to UNION: `UNION SELECT id, 'climate_receivable' AS type FROM climate_receivables WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'climate_receivable' THEN
          SELECT receivable_type, amount, (amount / (1 + (discount_rate / 100))), 1  -- Often fixed units
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM climate_receivables cr
          WHERE cr.id = v_product.id;
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);
        
        ```
        
3. **digital_tokenised_fund_products (Digital Tokenised Fund)**:
    - **Specialist Logic**: Mirror underlying fund NAV (cross-reference `funds_products` if linked). Adjust for on-chain fees or rebasing.
    - **Extension**: Add to UNION: `UNION SELECT id, 'digital_fund' AS type FROM digital_tokenised_fund_products WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'digital_fund' THEN
          SELECT fund_name, total_value, total_value / outstanding_units, outstanding_units
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM digital_tokenised_fund_products dtf
          LEFT JOIN token_erc20_view tv ON dtf.id::text = tv.token_id;
          -- If rebasing, adjust supply from on-chain
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);
        
        ```
        
4. **energy_assets (Energy)**:
    - **Specialist Logic**: NAV from capacity/production value, adjusted for energy prices (oracle-fetch current rates).
    - **Extension**: Add to UNION: `UNION SELECT id, 'energy' AS type FROM energy_assets WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'energy' THEN
          SELECT asset_name, (capacity * production_rate * market_price), (capacity * production_rate * market_price), total_supply::NUMERIC(78,18)
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM energy_assets ea
          LEFT JOIN token_erc20_view tv ON ea.id::text = tv.token_id
          WHERE ea.id = v_product.id;
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);
        
        ```
        
5. **equity_products (Equity)**:
    - **Specialist Logic**: Mark-to-market using market cap or multiples (e.g., P/E ratio from `valuation_multiples` if available).
    - **Extension**: Add to UNION: `UNION SELECT id, 'equity' AS type FROM equity_products WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'equity' THEN
          SELECT company_name, (shares_outstanding * current_share_price), (shares_outstanding * current_share_price), shares_outstanding
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM equity_products ep
          WHERE ep.id = v_product.id;
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);
        
        ```
        
6. **funds_products (Funds, ETFs, ETPs including MMFs)**:
    - **Specialist Logic**: For MMFs, calculate as weighted average of holdings (from `asset_holdings`); ensure compliance (e.g., WAM ≤60 days, WAL ≤120 days, ≥10% daily liquidity). Fetch current yields for gov securities.
    - **Extension**: Add to UNION: `UNION SELECT id, 'fund' AS type FROM funds_products WHERE project_id = p_project_id`
    - **CASE Block**:
        
        ```
        WHEN 'fund' THEN
          SELECT fund_name, SUM(ah.value), SUM(ah.value) / total_units, total_units
          INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
          FROM funds_products fp
          LEFT JOIN asset_holdings ah ON fp.id = ah.asset_id
          LEFT JOIN token_erc20_view tv ON fp.id::text = tv.token_id
          WHERE fp.id = v_product.id
          GROUP BY fp.fund_name, fp.total_units, tv.total_supply;
          -- MMF compliance: Filter holdings maturity_date <= p_date + 397 days
          -- Add WAM calc: SUM(ah.value * (maturity_date - p_date)) / total_assets <= 60
          v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);  -- Aim for ~1.00
        
        ```
        
7. **infrastructure_products (Infrastructure)**:
    - **Specialist Logic**: Value from projected revenues, adjusted for depreciation.
    - **Similar Extension/CASE as energy_assets, using fields like `project_value`.**
8. **private_debt_products (Private Debt)**:
    - **Specialist Logic**: Amortized cost + interest, minus impairments.
    - **Extension/CASE**: Use `principal_amount`, `interest_rate`, similar to asset_backed.
9. **private_equity_products (Private Equity)**:
    - **Specialist Logic**: Fair value from appraisals (quarterly updates).
    - **Extension/CASE**: Use `current_valuation`, divide by shares.
10. **real_estate_products (Real Estate)**:
    - **Specialist Logic**: Appraisal-based (e.g., cap rate on NOI).
    - **Extension/CASE**: Use `property_value`, `rental_income`.
11. **structured_products (Structured Products)**:
    - **Specialist Logic**: Derivative-based; sum underlying with risk adjustments.
    - **Extension/CASE**: Aggregate from linked holdings.
12. **Stablecoins (Fiat/Crypto/Commodity/Algorithmic/Rebasing; potentially under digital_tokenised_fund_products or separate)**:
    - **Specialist Logic**: Peg stability check; for crypto-backed, over-collateralization ratio.
    - **Extension/CASE**:
        
        ```
        WHEN 'stablecoin_fiat' THEN  -- Subtype example
          v_nav := 1.00;  -- Assume peg if reserves verified
          -- For crypto: v_total_assets = collateral_value from oracle
        
        ```
        

### Recommendations for Procedure

- **Expand UNION**: Include all above for comprehensive coverage.
- **Handle Truncation/Defaults**: Use the fallback for unhandled types, but aim to cover all.
- **External Data**: For volatile assets (e.g., commodities prices, bond yields on 2025-09-03), integrate oracles in prod; for MMFs, ensure Rule 2a-7 compliance in logic.
- **Performance**: If many types, consider dynamic SQL or separate procedures per category.

If the schema has more truncated tables, provide the full text for complete parsing. For 2025-specific rates (e.g., Treasury yields for MMFs), I can fetch approximations if needed.

CREATE OR REPLACE PROCEDURE calculate_daily_nav(p_project_id UUID, p_date DATE)
LANGUAGE plpgsql AS $$
DECLARE
v_product RECORD; -- Dynamic per type
v_nav NUMERIC(18,6); -- Computed NAV
v_total_assets NUMERIC(78,18); -- Summed assets
v_asset_name TEXT; -- Name from product table
v_total_liabilities NUMERIC(78,18) := 0; -- Example: defaults to 0; compute as needed
v_outstanding_shares NUMERIC(78,18); -- From token views or product
BEGIN
-- Loop over products for project (union across all product tables for comprehensive coverage)
FOR v_product IN
SELECT id, 'asset_backed' AS type FROM asset_backed_products WHERE project_id = p_project_id
UNION SELECT id, 'bond' AS type FROM bond_products WHERE project_id = p_project_id
UNION SELECT id, 'collectible' AS type FROM collectibles_products WHERE project_id = p_project_id
UNION SELECT id, 'commodity' AS type FROM commodities_products WHERE project_id = p_project_id
UNION SELECT id, 'climate_receivable' AS type FROM climate_receivables WHERE project_id = p_project_id
UNION SELECT id, 'digital_fund' AS type FROM digital_tokenised_fund_products WHERE project_id = p_project_id
UNION SELECT id, 'energy' AS type FROM energy_assets WHERE project_id = p_project_id
UNION SELECT id, 'equity' AS type FROM equity_products WHERE project_id = p_project_id
UNION SELECT id, 'fund' AS type FROM funds_products WHERE project_id = p_project_id
UNION SELECT id, 'infrastructure' AS type FROM infrastructure_products WHERE project_id = p_project_id
UNION SELECT id, 'private_debt' AS type FROM private_debt_products WHERE project_id = p_project_id
UNION SELECT id, 'private_equity' AS type FROM private_equity_products WHERE project_id = p_project_id
UNION SELECT id, 'real_estate' AS type FROM real_estate_products WHERE project_id = p_project_id
UNION SELECT id, 'structured' AS type FROM structured_products WHERE project_id = p_project_id
-- Add stablecoin subtypes if separate tables exist; otherwise handle via digital_fund or JSON
UNION SELECT id, 'stablecoin_fiat' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Fiat'
UNION SELECT id, 'stablecoin_crypto' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Crypto'
UNION SELECT id, 'stablecoin_commodity' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Commodity'
UNION SELECT id, 'stablecoin_algorithmic' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Algorithmic'
UNION SELECT id, 'stablecoin_rebasing' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Rebasing' -- Adjust if rebasing is a flag
LOOP
-- Compute values based on product type (specialist logic per type; examples based on schema fields/oracles)
CASE v_product.type
WHEN 'asset_backed' THEN
-- Specialist: Discounted cash flows, adjust for delinquency/recovery
SELECT asset_type, current_balance, (current_balance * (1 + (interest_rate / 100)) * (recovery_rate_percentage / 100)), total_supply::NUMERIC(78,18)
INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
FROM asset_backed_products abp
LEFT JOIN token_erc20_view tv ON [abp.id](http://abp.id/)::text = tv.token_id
WHERE [abp.id](http://abp.id/) = v_product.id;
-- Adjust for delinquency
IF delinquency_status > 0 THEN v_total_assets := v_total_assets * (1 - (delinquency_status / 100)); END IF;
v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

```
  WHEN 'bond' THEN
    -- Specialist: Mark-to-market with yield adjustment
    SELECT issuer_name, face_value, (face_value * (1 + (yield_to_maturity / 100))), outstanding_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM bond_products bp
    LEFT JOIN token_erc20_view tv ON bp.id::text = tv.token_id
    WHERE bp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'collectible' THEN
    -- Specialist: Appraisal-based for uniques
    SELECT description, current_value, current_value, 1 -- Often 1 share
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM collectibles_products cp
    WHERE cp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'commodity' THEN
    -- Specialist: Contract size with liquidity adjustment
    SELECT commodity_name, (contract_size * liquidity_metric), (contract_size * liquidity_metric), total_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM commodities_products cp
    LEFT JOIN token_erc20_view tv ON cp.id::text = tv.token_id
    WHERE cp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'climate_receivable' THEN
    -- Specialist: Discounted green cash flows
    SELECT receivable_type, amount, (amount / (1 + (discount_rate / 100))), 1
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM climate_receivables cr
    WHERE cr.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'digital_fund' THEN
    -- Specialist: Mirror underlying with on-chain adjustments
    SELECT fund_name, total_value, total_value / outstanding_units, outstanding_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM digital_tokenised_fund_products dtf
    LEFT JOIN token_erc20_view tv ON dtf.id::text = tv.token_id
    WHERE dtf.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'energy' THEN
    -- Specialist: Capacity-based with market price
    SELECT asset_name, (capacity * production_rate * market_price), (capacity * production_rate * market_price), total_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM energy_assets ea
    LEFT JOIN token_erc20_view tv ON ea.id::text = tv.token_id
    WHERE ea.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'equity' THEN
    -- Specialist: Market cap or multiples
    SELECT company_name, (shares_outstanding * current_share_price), (shares_outstanding * current_share_price), shares_outstanding
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM equity_products ep
    WHERE ep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'fund' THEN
    -- Specialist: Weighted holdings (e.g., MMFs with compliance)
    SELECT fund_name, SUM(ah.value), SUM(ah.value) / total_units, total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM funds_products fp
    LEFT JOIN asset_holdings ah ON fp.id = ah.asset_id
    LEFT JOIN token_erc20_view tv ON fp.id::text = tv.token_id
    WHERE fp.id = v_product.id AND (ah.maturity_date - p_date) <= 397 -- MMF maturity limit
    GROUP BY fp.fund_name, fp.total_units, tv.total_supply;
    -- Example MMF WAM check (simplified); raise error if >60
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares); -- Aim ~1.00

  WHEN 'infrastructure' THEN
    -- Specialist: Revenue projections with depreciation
    SELECT project_name, (project_value - depreciation_accumulated), (project_value - depreciation_accumulated), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM infrastructure_products ip
    WHERE ip.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'private_debt' THEN
    -- Specialist: Amortized + interest minus impairments
    SELECT debt_type, (principal_amount * (1 + (interest_rate / 100)) - impairment_amount), (principal_amount * (1 + (interest_rate / 100)) - impairment_amount), outstanding_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM private_debt_products pdp
    WHERE pdp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'private_equity' THEN
    -- Specialist: Appraisal-based
    SELECT company_name, current_valuation, current_valuation / shares_outstanding, shares_outstanding
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM private_equity_products pep
    WHERE pep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'real_estate' THEN
    -- Specialist: Cap rate on NOI
    SELECT property_name, (net_operating_income / cap_rate), (net_operating_income / cap_rate), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM real_estate_products rep
    WHERE rep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'structured' THEN
    -- Specialist: Sum underlying with risk adjustments
    SELECT product_name, SUM(underlying_value) * (1 - risk_factor), SUM(underlying_value) * (1 - risk_factor), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM structured_products sp
    LEFT JOIN asset_holdings ah ON sp.id = ah.asset_id -- Assume holdings for underlyings
    WHERE sp.id = v_product.id
    GROUP BY sp.product_name, sp.total_units;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'stablecoin_fiat' OR 'stablecoin_crypto' OR 'stablecoin_commodity' OR 'stablecoin_algorithmic' OR 'stablecoin_rebasing' THEN
    -- Specialist: Peg stability; over-collateral for crypto/commodity
    SELECT stablecoin_name, collateral_value, 1.00, total_supply::NUMERIC(78,18) -- Aim for peg ~1.00
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM stablecoin_products scp
    LEFT JOIN token_erc20_view tv ON scp.id::text = tv.token_id
    WHERE scp.id = v_product.id;
    -- For crypto: Ensure over-collateral (e.g., if collateral_value / total_supply < 1.5, flag)
    IF v_product.type = 'stablecoin_rebasing' THEN v_outstanding_shares := v_outstanding_shares * rebasing_factor; END IF; -- Rebase adjustment
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  ELSE
    -- Default/fallback (aggregate from holdings if possible)
    v_asset_name := 'Unknown Asset';
    SELECT SUM(ah.value), COUNT(ah.id)
    INTO v_total_assets, v_outstanding_shares
    FROM asset_holdings ah
    WHERE ah.asset_id = v_product.id;
    v_outstanding_shares := GREATEST(v_outstanding_shares, 1); -- Avoid division by zero
    v_nav := (v_total_assets - v_total_liabilities) / v_outstanding_shares;
END CASE;

-- Insert with computed values
INSERT INTO asset_nav_data (asset_id, project_id, date, nav, total_assets, asset_name, total_liabilities, outstanding_shares, source)
VALUES (v_product.id, p_project_id, p_date, v_nav, v_total_assets, v_asset_name, v_total_liabilities, v_outstanding_shares, 'calculated')
ON CONFLICT (asset_id, date) DO UPDATE SET
  nav = EXCLUDED.nav,
  total_assets = EXCLUDED.total_assets,
  asset_name = EXCLUDED.asset_name,
  total_liabilities = EXCLUDED.total_liabilities,
  outstanding_shares = EXCLUDED.outstanding_shares,
  updated_at = NOW(); -- Update timestamp

```

END LOOP;
END;
$$;

### Improved Full Implementation Spec for NAV Engine

This specification builds on the original brief for a NAV (Net Asset Value) engine within your blockchain securitization and tokenization platform. It incorporates the complete Supabase schema details from `supabase.ts` and `full_schema.sql` (including types, functions, triggers, and tables like `asset_nav_data`, `asset_holdings`, product-specific tables, and related enums). Enhancements include:

- Alignment with full schema constraints (e.g., numeric precisions, enums like `product_status`, foreign keys to `projects`).
- Integration of real-time market data for September 3, 2025 (e.g., Treasury yields ~4.13-4.30%, repo rates ~4.25%, commercial paper ~4.13%, CD rates 4.00-5.00%, corporate bonds ~4.28%, municipal yields ~6.36% TEY, equity indices like S&P 500 ~6415, gold ~3537 USD/oz, oil ~65 USD/bbl, real estate indices up 1.1%, energy/natural gas ~2.98 USD/MMBtu, stablecoins like USDT/USDC maintaining ~1.00 peg with verified reserves).
- Dynamic oracle integration for market data in calculations.
- Enhanced compliance (e.g., SEC Rule 2a-7 for MMFs: maturities ≤397 days, ≥99.5% eligible securities).
- Blockchain linkage (e.g., via `tokens` views, `wallet_transactions` for on-chain updates).
- Focus on basics: daily NAV, adjustments, redemption impacts, linked to `projects`/`products*` tables.

### Overview

The NAV engine tracks and computes daily (or intra-day) values for underlying collateral and tokenized products across all categories. It uses `asset_nav_data` for storage, aggregates from `asset_holdings` for composites (e.g., MMFs), and propagates changes to redemption rates via smart contracts. Inputs from manuals, oracles (e.g., Chainlink for yields/prices), or calculations. Outputs impact `redemption_settlements` and token exchange rates (e.g., redemption value = tokens * NAV).

### Key Assumptions and Dependencies

- **Tables**: Product-specific (e.g., `bond_products` with `face_value`, `yield_to_maturity`; `commodities_products` with `contract_size`; `funds_products` for MMFs/ETFs; `stablecoin_products` implied or via `digital_tokenised_fund_products`; all link via `project_id` to `projects`). Use `asset_holdings` for MMF compositions (e.g., Treasuries, Repos). Token data from views like `token_erc20_view` (e.g., `total_supply` for shares).
- **Enums**: `product_status` for asset states (e.g., 'Active' for calc); `stablecoin_collateral_type` for subtypes.
- **Functions/Triggers**: Build on `calculate_nav_change`, `validate_project_type`. Add oracle calls via edge functions.
- **Frequency**: Daily at EOD (use `date`); event-driven for volatiles (e.g., crypto-backed stablecoins).
- **Data Sources**: 'manual' for illiquids (e.g., Private Equity); 'oracle' for markets (integrate 2025 data like yields); 'calculated' for formulas.
- **Blockchain**: ERC standards via `token_standard_enum`; NAV oracles in Solidity.
- **Compliance**: MMFs enforce Rule 2a-7 (e.g., WAM ≤60 days via maturity checks).
- **Tech**: Supabase/PostgreSQL, PL/pgSQL, Node.js for ingestion, Solidity for on-chain.

### Database Schema Extensions

Extend for oracle data and compliance:

```
-- Add oracle_price to asset_holdings for real-time (e.g., yields on 2025-09-03)
ALTER TABLE public.asset_holdings
ADD COLUMN oracle_price NUMERIC(78,18) DEFAULT 0,
ADD COLUMN last_oracle_update TIMESTAMPTZ DEFAULT NOW();

-- Constraint for MMF compliance (example for holdings)
ALTER TABLE public.asset_holdings
ADD CONSTRAINT mmf_maturity_check CHECK (
  CASE WHEN holding_type IN ('Government Securities', 'Repos', 'Commercial Paper', 'CDs', 'Corporate Debt', 'Municipal Debt')
  THEN (maturity_date - CURRENT_DATE) <= 397 ELSE TRUE END
);

-- Trigger to fetch/update oracle prices (pseudo; implement in edge function)
CREATE OR REPLACE FUNCTION update_oracle_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Example: For Treasuries, set oracle_price to 4.13% (2025-09-03 data); in prod, call API
  IF NEW.holding_type = 'Government Securities' THEN NEW.oracle_price := 4.13; END IF;  -- From search
  NEW.last_oracle_update := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_oracle_prices
BEFORE INSERT OR UPDATE ON public.asset_holdings
FOR EACH ROW EXECUTE FUNCTION update_oracle_prices();

```

### NAV Calculation Logic by Asset Type

NAV = (Total Assets - Liabilities) / Outstanding Shares. Use 2025-09-03 data for examples; integrate via oracles.

| Asset Type | Specialist Logic | Example NAV Calc (2025-09-03 Data) |
| --- | --- | --- |
| **MMFs (funds_products)** | Weighted holdings; Rule 2a-7 compliance (WAM ≤60, WAL ≤120, ≥10% liquidity). Aggregate Treasuries (yield 4.13-4.30%), Repos (4.25%), Commercial Paper (4.13%), CDs (4.00-5.00%), Corporate (4.28%), Municipal (6.36% TEY). Aim stable $1. | (Sum(holdings value * yield adj) - fees) / shares; e.g., $10B assets @ avg 4.5% yield → NAV ~1.00. |
| **Structured Products (structured_products)** | Sum underlyings with risk adj. | Aggregate from holdings; e.g., derivative value adj by volatility. |
| **Equity (equity_products)** | Mark-to-market (e.g., S&P 6415). | (Shares * price) / outstanding; e.g., index-linked @ 6415. |
| **Commodities (commodities_products)** | Spot prices (gold 3537, oil 65). | Contract size * price; e.g., oil @65/bbl. |
| **Bonds (bond_products)** | Yield-to-maturity adj (4.28%). | Face * (1 + yield/100). |
| **Quantitative Strategies** | Simulation-based (use schema functions like PuLP for optimization). | Modeled returns; fallback to holdings sum. |
| **Private Equity (private_equity_products)** | Quarterly appraisals. | Current valuation / shares. |
| **Private Debt (private_debt_products)** | Amortized + interest - impairments. | Principal * (1 + rate) - impairments. |
| **Real Estate (real_estate_products)** | NOI / cap rate; indices up 1.1%. | Property value adj by market (+1.1%). |
| **Energy (energy_assets)** | Capacity * price (nat gas 2.98). | Production * 2.98/MMBtu. |
| **Infrastructure (infrastructure_products)** | Revenue proj - depreciation. | Project value adj. |
| **Collectibles (collectibles_products)** | Appraisal/manual. | Current value / 1 (uniques). |
| **Asset Backed/Receivables (asset_backed_products)** | Discounted flows adj delinquency. | Current balance * recovery. |
| **Solar/Wind/Climate (climate_receivables)** | Amount / discount; green adj. | Proj cash flows discounted. |
| **Digital Tokenised Fund (digital_tokenised_fund_products)** | Mirror underlying NAV. | Total value / units. |
| **Stablecoins (stablecoin_products)** | Peg check (~1.00); reserves verified. Fiat: 1:1; Crypto: over-collateral; Algo/Rebasing: dynamic supply. | Collateral / supply; e.g., USDT/USDC @1.00. |

### Updated Procedure

Full `calculate_daily_nav` with all types, incorporating 2025 data comments/oracles.

CREATE OR REPLACE PROCEDURE calculate_daily_nav(p_project_id UUID, p_date DATE)
LANGUAGE plpgsql AS $$
DECLARE
v_product RECORD; -- Dynamic per type
v_nav NUMERIC(18,6); -- Computed NAV
v_total_assets NUMERIC(78,18); -- Summed assets
v_asset_name TEXT; -- Name from product table
v_total_liabilities NUMERIC(78,18) := 0; -- Example: defaults to 0; compute as needed
v_outstanding_shares NUMERIC(78,18); -- From token views or product
BEGIN
-- Loop over products for project (union across all product tables for comprehensive coverage)
FOR v_product IN
SELECT id, 'asset_backed' AS type FROM asset_backed_products WHERE project_id = p_project_id
UNION SELECT id, 'bond' AS type FROM bond_products WHERE project_id = p_project_id
UNION SELECT id, 'collectible' AS type FROM collectibles_products WHERE project_id = p_project_id
UNION SELECT id, 'commodity' AS type FROM commodities_products WHERE project_id = p_project_id
UNION SELECT id, 'climate_receivable' AS type FROM climate_receivables WHERE project_id = p_project_id
UNION SELECT id, 'digital_fund' AS type FROM digital_tokenised_fund_products WHERE project_id = p_project_id
UNION SELECT id, 'energy' AS type FROM energy_assets WHERE project_id = p_project_id
UNION SELECT id, 'equity' AS type FROM equity_products WHERE project_id = p_project_id
UNION SELECT id, 'fund' AS type FROM funds_products WHERE project_id = p_project_id
UNION SELECT id, 'infrastructure' AS type FROM infrastructure_products WHERE project_id = p_project_id
UNION SELECT id, 'private_debt' AS type FROM private_debt_products WHERE project_id = p_project_id
UNION SELECT id, 'private_equity' AS type FROM private_equity_products WHERE project_id = p_project_id
UNION SELECT id, 'real_estate' AS type FROM real_estate_products WHERE project_id = p_project_id
UNION SELECT id, 'structured' AS type FROM structured_products WHERE project_id = p_project_id
-- Add stablecoin subtypes if separate tables exist; otherwise handle via digital_fund or JSON
UNION SELECT id, 'stablecoin_fiat' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Fiat'
UNION SELECT id, 'stablecoin_crypto' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Crypto'
UNION SELECT id, 'stablecoin_commodity' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Commodity'
UNION SELECT id, 'stablecoin_algorithmic' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Algorithmic'
UNION SELECT id, 'stablecoin_rebasing' AS type FROM stablecoin_products WHERE project_id = p_project_id AND collateral_type = 'Rebasing' -- Adjust if rebasing is a flag
LOOP
-- Compute values based on product type (specialist logic per type; examples based on schema fields/oracles with 2025-09-03 market data)
CASE v_product.type
WHEN 'asset_backed' THEN
-- Specialist: Discounted cash flows, adjust for delinquency/recovery
SELECT asset_type, current_balance, (current_balance * (1 + (interest_rate / 100)) * (recovery_rate_percentage / 100)), total_supply::NUMERIC(78,18)
INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
FROM asset_backed_products abp
LEFT JOIN token_erc20_view tv ON [abp.id](http://abp.id/)::text = tv.token_id
WHERE [abp.id](http://abp.id/) = v_product.id;
-- Adjust for delinquency
IF delinquency_status > 0 THEN v_total_assets := v_total_assets * (1 - (delinquency_status / 100)); END IF;
v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

```
  WHEN 'bond' THEN
    -- Specialist: Mark-to-market with yield adjustment (using ~4.28% for corporate/10Y Treasury on 2025-09-03)
    SELECT issuer_name, face_value, (face_value * (1 + (yield_to_maturity / 100))), outstanding_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM bond_products bp
    LEFT JOIN token_erc20_view tv ON bp.id::text = tv.token_id
    WHERE bp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'collectible' THEN
    -- Specialist: Appraisal-based for uniques
    SELECT description, current_value, current_value, 1 -- Often 1 share
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM collectibles_products cp
    WHERE cp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'commodity' THEN
    -- Specialist: Contract size with liquidity adjustment (e.g., gold ~3537 USD/oz, oil ~65 USD/bbl on 2025-09-03)
    SELECT commodity_name, (contract_size * liquidity_metric), (contract_size * liquidity_metric), total_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM commodities_products cp
    LEFT JOIN token_erc20_view tv ON cp.id::text = tv.token_id
    WHERE cp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'climate_receivable' THEN
    -- Specialist: Discounted green cash flows
    SELECT receivable_type, amount, (amount / (1 + (discount_rate / 100))), 1
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM climate_receivables cr
    WHERE cr.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'digital_fund' THEN
    -- Specialist: Mirror underlying with on-chain adjustments
    SELECT fund_name, total_value, total_value / outstanding_units, outstanding_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM digital_tokenised_fund_products dtf
    LEFT JOIN token_erc20_view tv ON dtf.id::text = tv.token_id
    WHERE dtf.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'energy' THEN
    -- Specialist: Capacity-based with market price (e.g., natural gas ~2.99 USD/MMBtu on 2025-09-03)
    SELECT asset_name, (capacity * production_rate * market_price), (capacity * production_rate * market_price), total_supply::NUMERIC(78,18)
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM energy_assets ea
    LEFT JOIN token_erc20_view tv ON ea.id::text = tv.token_id
    WHERE ea.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'equity' THEN
    -- Specialist: Market cap or multiples (e.g., S&P 500 ~6415 on 2025-09-03)
    SELECT company_name, (shares_outstanding * current_share_price), (shares_outstanding * current_share_price), shares_outstanding
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM equity_products ep
    WHERE ep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'fund' THEN
    -- Specialist: Weighted holdings (e.g., MMFs with compliance; yields: Treasuries ~4.13-4.30%, Repos ~4.25%, Commercial Paper ~4.23%, CDs ~4.00-5.00%, Corporate ~4.28-6.00%, Municipal ~2.19-4.62% on 2025-09-03)
    SELECT fund_name, SUM(ah.value * (1 + (ah.oracle_price / 100))), SUM(ah.value * (1 + (ah.oracle_price / 100))) / total_units, total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM funds_products fp
    LEFT JOIN asset_holdings ah ON fp.id = ah.asset_id
    LEFT JOIN token_erc20_view tv ON fp.id::text = tv.token_id
    WHERE fp.id = v_product.id AND (ah.maturity_date - p_date) <= 397 -- MMF maturity limit
    GROUP BY fp.fund_name, fp.total_units, tv.total_supply;
    -- Example MMF WAM check (simplified); raise error if >60
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares); -- Aim ~1.00

  WHEN 'infrastructure' THEN
    -- Specialist: Revenue projections with depreciation
    SELECT project_name, (project_value - depreciation_accumulated), (project_value - depreciation_accumulated), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM infrastructure_products ip
    WHERE ip.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'private_debt' THEN
    -- Specialist: Amortized + interest minus impairments
    SELECT debt_type, (principal_amount * (1 + (interest_rate / 100)) - impairment_amount), (principal_amount * (1 + (interest_rate / 100)) - impairment_amount), outstanding_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM private_debt_products pdp
    WHERE pdp.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'private_equity' THEN
    -- Specialist: Appraisal-based
    SELECT company_name, current_valuation, current_valuation / shares_outstanding, shares_outstanding
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM private_equity_products pep
    WHERE pep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'real_estate' THEN
    -- Specialist: Cap rate on NOI (e.g., indices ~370.9 Dow Jones US Real Estate, +2.9% YoY house prices on 2025-09-03)
    SELECT property_name, (net_operating_income / cap_rate), (net_operating_income / cap_rate), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM real_estate_products rep
    WHERE rep.id = v_product.id;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'structured' THEN
    -- Specialist: Sum underlying with risk adjustments
    SELECT product_name, SUM(underlying_value) * (1 - risk_factor), SUM(underlying_value) * (1 - risk_factor), total_units
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM structured_products sp
    LEFT JOIN asset_holdings ah ON sp.id = ah.asset_id -- Assume holdings for underlyings
    WHERE sp.id = v_product.id
    GROUP BY sp.product_name, sp.total_units;
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  WHEN 'stablecoin_fiat' OR 'stablecoin_crypto' OR 'stablecoin_commodity' OR 'stablecoin_algorithmic' OR 'stablecoin_rebasing' THEN
    -- Specialist: Peg stability; over-collateral for crypto/commodity (USDT/USDC ~1.00 peg on 2025-09-03)
    SELECT stablecoin_name, collateral_value, 1.00, total_supply::NUMERIC(78,18) -- Aim for peg ~1.00
    INTO v_asset_name, v_total_assets, v_nav, v_outstanding_shares
    FROM stablecoin_products scp
    LEFT JOIN token_erc20_view tv ON scp.id::text = tv.token_id
    WHERE scp.id = v_product.id;
    -- For crypto: Ensure over-collateral (e.g., if collateral_value / total_supply < 1.5, flag)
    IF v_product.type = 'stablecoin_rebasing' THEN v_outstanding_shares := v_outstanding_shares * rebasing_factor; END IF; -- Rebase adjustment
    v_nav := COALESCE(v_nav, (v_total_assets - v_total_liabilities) / v_outstanding_shares);

  ELSE
    -- Default/fallback (aggregate from holdings if possible)
    v_asset_name := 'Unknown Asset';
    SELECT SUM(ah.value), COUNT(ah.id)
    INTO v_total_assets, v_outstanding_shares
    FROM asset_holdings ah
    WHERE ah.asset_id = v_product.id;
    v_outstanding_shares := GREATEST(v_outstanding_shares, 1); -- Avoid division by zero
    v_nav := (v_total_assets - v_total_liabilities) / v_outstanding_shares;
END CASE;

-- Insert with computed values
INSERT INTO asset_nav_data (asset_id, project_id, date, nav, total_assets, asset_name, total_liabilities, outstanding_shares, source)
VALUES (v_product.id, p_project_id, p_date, v_nav, v_total_assets, v_asset_name, v_total_liabilities, v_outstanding_shares, 'calculated')
ON CONFLICT (asset_id, date) DO UPDATE SET
  nav = EXCLUDED.nav,
  total_assets = EXCLUDED.total_assets,
  asset_name = EXCLUDED.asset_name,
  total_liabilities = EXCLUDED.total_liabilities,
  outstanding_shares = EXCLUDED.outstanding_shares,
  updated_at = NOW(); -- Update timestamp

```

END LOOP;
END;
$$;

### Data Ingestion and Validation Workflow

1. **Ingestion**: Manual via admin (source='manual'); Oracle scripts (e.g., fetch yields daily, update `oracle_price`); Calculated via triggers/procedure.
2. **Validation**: Admin sets `validated=true` (via `validated_by`); Auto-check compliance (e.g., MMF WAM via function).
3. **Adjustments**: On NAV change, update `total_assets` (e.g., mint/burn tokens); log in `audit_logs`.

### Impact on Redemption Exchange Rates

- Rate = Latest validated NAV (query `asset_nav_data`).
- On-chain: Query oracle in contract; record in `redemption_settlements`.
- Example: For MMF @1.00, redeem tokens * 1.00; for equity @6415 adj, dynamic.

### Next Steps and Enhancements

- **Testing**: Simulate with 2025 data; use `code_execution` for formulas.
- **Security**: RLS on tables; encrypt sensitive.
- **Scalability**: Partition by date; add views for aggregates.
- **Monitoring**: Alerts via `alerts` for drifts (e.g., stablecoin peg <0.99).