# Trade Finance API Routes

Backend API routes for commodity trade finance platform - haircut calculations, position monitoring, and oracle price feeds.

---

## 📚 Overview

The trade-finance module provides three main route groups:

1. **Haircut Routes** - Statistical risk analysis and haircut recommendations
2. **Position Routes** - User position monitoring and health factors
3. **Oracle Routes** - Commodity price feeds and oracle health

---

## 🔧 Routes

### Haircut Routes (`/api/trade-finance/haircut`)

#### Calculate Haircut Metrics
```http
POST /api/trade-finance/haircut/calculate
Content-Type: application/json

{
  "prices": [
    { "timestamp": 1704067200, "price": 2063.50, "volume": 123456 },
    { "timestamp": 1704153600, "price": 2071.30, "volume": 145678 }
  ],
  "commodityType": "gold"
}
```

**Response:**
```json
{
  "data": {
    "metrics": {
      "volatility": 12.45,
      "maxDrawdown": 8.23,
      "sharpeRatio": 0.73,
      "liquidityScore": 9500
    },
    "recommendation": {
      "totalHaircut": 1370,
      "confidence": 90
    }
  }
}
```

#### Get Current Metrics
```http
GET /api/trade-finance/haircut/metrics/:commodity?project_id={uuid}
```

#### Submit Metrics On-Chain
```http
POST /api/trade-finance/haircut/submit-onchain
Content-Type: application/json

{
  "commodityType": "gold",
  "metrics": { ... },
  "projectId": "uuid"
}
```

#### Get Historical Metrics
```http
GET /api/trade-finance/haircut/history/:commodity?project_id={uuid}
```

---

### Position Routes (`/api/trade-finance/positions`)

#### Get User Health Factor
```http
GET /api/trade-finance/positions/health-factor/:user?project_id={uuid}
```

**Response:**
```json
{
  "data": {
    "user": "0x123...",
    "healthFactor": 1.15,
    "status": "healthy",
    "totalCollateralValue": 10000,
    "totalDebt": 8000
  }
}
```

#### Get Liquidatable Positions
```http
GET /api/trade-finance/positions/liquidatable?project_id={uuid}&threshold=1.0
```

**Response:**
```json
{
  "data": {
    "count": 5,
    "positions": [
      {
        "walletAddress": "0x123...",
        "healthFactor": 0.95,
        "totalCollateralValue": 10000,
        "totalDebt": 9000
      }
    ]
  }
}
```

#### Get Position Details
```http
GET /api/trade-finance/positions/details/:user?project_id={uuid}
```

---

### Oracle Routes (`/api/trade-finance/oracles`)

#### Get Current Price
```http
GET /api/trade-finance/oracles/prices/:commodity?project_id={uuid}
```

**Response:**
```json
{
  "data": {
    "commodity": "gold",
    "price": 2063.50,
    "confidence": 95,
    "source": "chainlink",
    "isStale": false
  }
}
```

#### Get Price History
```http
GET /api/trade-finance/oracles/price-history/:commodity?project_id={uuid}&from=2024-01-01&to=2024-12-31&interval=daily
```

#### Check Oracle Health
```http
GET /api/trade-finance/oracles/health?project_id={uuid}
```

**Response:**
```json
{
  "data": {
    "systemHealth": {
      "status": "healthy",
      "percentage": 85,
      "healthyFeeds": 17,
      "totalFeeds": 20
    },
    "feeds": [
      {
        "commodity": "gold",
        "status": "healthy",
        "ageMinutes": 5
      }
    ]
  }
}
```

#### Update Price (Admin)
```http
POST /api/trade-finance/oracles/update-price
Content-Type: application/json

{
  "commodity_type": "gold",
  "price_usd": 2063.50,
  "project_id": "uuid",
  "oracle_source": "manual"
}
```

---

## 🔐 Authentication

All routes require:
- Valid project access (checked via RLS)
- `project_id` query parameter

Admin routes additionally require:
- Risk Admin role

---

## 📊 Database Schema

### Tables Created
1. `commodity_risk_metrics` - Haircut calculation results
2. `commodity_prices` - Oracle price feeds
3. `commodity_positions` - User lending positions
4. `commodity_collateral` - Collateral details
5. `commodity_debt` - Debt tracking
6. `commodity_pool_config` - Risk parameters

### Relationships
```
commodity_positions (1) → (many) commodity_collateral
commodity_positions (1) → (many) commodity_debt
projects (1) → (many) commodity_risk_metrics
projects (1) → (many) commodity_prices
```

---

## 🧪 Testing Examples

### Calculate Haircut for Gold
```bash
curl -X POST http://localhost:3001/api/trade-finance/haircut/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      {"timestamp": 1704067200, "price": 2063.50},
      {"timestamp": 1704153600, "price": 2071.30},
      {"timestamp": 1704240000, "price": 2065.80}
    ],
    "commodityType": "gold"
  }'
```

### Check User Health Factor
```bash
curl http://localhost:3001/api/trade-finance/positions/health-factor/0x123?project_id=uuid
```

### Get Current Gold Price
```bash
curl http://localhost:3001/api/trade-finance/oracles/prices/gold?project_id=uuid
```

---

## 🚀 Deployment

### Migration
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/backend
supabase db push
```

### Start Server
```bash
npm run dev
```

### Verify Routes
```bash
curl http://localhost:3001/debug/routes | grep trade-finance
```

---

## 📝 Error Handling

All routes return errors in this format:
```json
{
  "error": {
    "message": "Error description"
  }
}
```

Common error codes:
- `400` - Bad request (missing parameters)
- `404` - Not found (no data for commodity/user)
- `500` - Internal server error

---

## 🔄 Next Steps

1. ✅ Backend routes complete
2. ✅ Database schema created
3. ⏳ Frontend integration (in progress)
4. ⏳ Unit tests
5. ⏳ Integration tests

---

**Last Updated**: January 8, 2025  
**Maintainer**: Chain Capital Engineering Team
