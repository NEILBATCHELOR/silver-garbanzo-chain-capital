# HOODI VERIFICATION - QUICK COMMAND REFERENCE

## 🚨 Problem
```bash
pnpm contracts:update
# Returns: ⚠️  No ABI found: NOTOK
```

## ✅ Solution (25 minutes total)

### 1. Verify Masters (~10 min)
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital
./scripts/verify-all-hoodi-contracts.sh
```

### 2. Verify Beacons (~10 min)
```bash
./scripts/verify-hoodi-beacons.sh
```

### 3. Link Proxies (~5 min)
Visit and manually link on Etherscan:

1. https://hoodi.etherscan.io/address/0x781d9B85c989d9CA691955E4352a666D7D4aC85c#code
   - Type: UUPS | Impl: `0x2cadbf5f3ed600239a3dbff5f38a6bc73eb19902`

2. https://hoodi.etherscan.io/address/0xC77b041FCBCefd8267e6739A0c0c565f958aA358#code
   - Type: UUPS | Impl: `0x073ad28f1e8a4a3c17cb11242832cb952a5d26a6`

3. https://hoodi.etherscan.io/address/0x1D049d5450348D1194cF0bf53C6fF1C6E5ADe31B#code
   - Type: UUPS | Impl: `0xdfa3a3ba810c6d7c1cab5afb28cc86367afed9f0`

4. https://hoodi.etherscan.io/address/0xbbd3e140A6031c59FC45d27270D82a7aB7256779#code
   - Type: UUPS | Impl: `0x9e5c7835edf608eb5a6102369b6c8a8dc68753c4`

### 4. Update Database
```bash
pnpm contracts:update
# Should now show: ✅ Fetched ABI (125 functions)
```

## 📚 Full Docs
- Complete Guide: `docs/HOODI-VERIFICATION-FIX.md`
- Resolution: `docs/HOODI-VERIFICATION-RESOLUTION.md`

---
**Total Time**: 25 minutes | **Created**: Oct 19, 2025
