# Prisma Regeneration Guide - Smart Contract Wallet Tables

**Date:** August 4, 2025  
**Status:** Migration Complete - Ready to Regenerate Prisma  
**New Tables:** webauthn_credentials, webauthn_challenges, wallet_guardians, user_operations  

## 🎯 Quick Summary

Your migration was successful! All 4 smart contract wallet tables are now in your database. Now we need to regenerate Prisma to pick up these new tables and generate the TypeScript types.

## 🚀 Option 1: Automated Script (Recommended)

I've created a comprehensive script that handles everything:

```bash
# Run the automated script
./scripts/regenerate-prisma.sh
```

## 🔧 Option 2: Manual Commands

If you prefer to run commands manually:

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Introspect Database (Pull Schema)
```bash
npx prisma db pull
```
*This updates your `schema.prisma` file with the new tables from the database*

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```
*This generates the TypeScript types and client code for the new tables*

### Step 4: Verify Generation
```bash
# Check if new models are in the schema
grep -E "model (webauthn_credentials|webauthn_challenges|wallet_guardians|user_operations)" prisma/schema.prisma

# Check TypeScript compilation
npm run type-check
```

## 📊 Expected Results

After running the regeneration, you should see:

### ✅ New Models in schema.prisma
```prisma
model webauthn_credentials {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wallet_id        String   @db.Uuid
  credential_id    String
  public_key_x     String
  public_key_y     String
  authenticator_data String?
  is_primary       Boolean? @default(false)
  device_name      String?
  platform         String?
  created_at       DateTime? @default(now()) @db.Timestamptz(6)
  updated_at       DateTime? @default(now()) @db.Timestamptz(6)
  wallets          wallets  @relation(fields: [wallet_id], references: [id], onDelete: Cascade)
  // ... indexes and schema info
}

model webauthn_challenges {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wallet_id      String   @db.Uuid
  challenge      String
  challenge_type String
  expires_at     DateTime @db.Timestamptz(6)
  is_used        Boolean? @default(false)
  created_at     DateTime? @default(now()) @db.Timestamptz(6)
  wallets        wallets  @relation(fields: [wallet_id], references: [id], onDelete: Cascade)
  // ... additional fields
}

model wallet_guardians {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wallet_id            String    @db.Uuid
  guardian_address     String
  guardian_name        String?
  status               String?   @default("pending_add")
  requested_at         DateTime? @default(now()) @db.Timestamptz(6)
  confirmed_at         DateTime? @db.Timestamptz(6)
  security_period_ends DateTime? @db.Timestamptz(6)
  created_at           DateTime? @default(now()) @db.Timestamptz(6)
  updated_at           DateTime? @default(now()) @db.Timestamptz(6)
  wallets              wallets   @relation(fields: [wallet_id], references: [id], onDelete: Cascade)
}

model user_operations {
  id                       String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  wallet_id                String    @db.Uuid
  user_op_hash             String    @unique
  sender_address           String
  nonce                    BigInt
  init_code                String?
  call_data                String
  call_gas_limit           BigInt
  verification_gas_limit   BigInt
  pre_verification_gas     BigInt
  max_fee_per_gas          BigInt
  max_priority_fee_per_gas BigInt
  paymaster_and_data       String?
  signature_data           String
  status                   String?   @default("pending")
  transaction_hash         String?
  block_number             BigInt?
  gas_used                 BigInt?
  created_at               DateTime? @default(now()) @db.Timestamptz(6)
  updated_at               DateTime? @default(now()) @db.Timestamptz(6)
  wallets                  wallets   @relation(fields: [wallet_id], references: [id], onDelete: Cascade)
}
```

### ✅ New TypeScript Types Generated
The Prisma client will now include types like:
- `webauthn_credentials`
- `webauthn_challenges`  
- `wallet_guardians`
- `user_operations`
- Plus all the related create/update/select types

### ✅ Updated Prisma Client
Your services can now use:
```typescript
// WebAuthn credentials
await this.prisma.webauthn_credentials.create({
  data: {
    wallet_id: walletId,
    credential_id: credentialId,
    public_key_x: publicKeyX,
    public_key_y: publicKeyY,
    device_name: deviceName,
    platform: platform
  }
})

// Guardian management  
await this.prisma.wallet_guardians.findMany({
  where: { wallet_id: walletId, status: 'active' }
})

// User operations (EIP-4337)
await this.prisma.user_operations.create({
  data: {
    wallet_id: walletId,
    user_op_hash: userOpHash,
    sender_address: senderAddress,
    // ... other fields
  }
})
```

## 🔍 Troubleshooting

### Issue: "Cannot find module '@prisma/client'"
**Solution:** Run `npm install` to ensure Prisma client is installed

### Issue: "Database connection failed"  
**Solution:** Check your `.env` file has correct `DATABASE_URL` and `DIRECT_DATABASE_URL`

### Issue: "New tables not appearing in schema"
**Solution:** Ensure you ran the migration script first, then try `npx prisma db push` followed by `npx prisma db pull`

### Issue: "TypeScript errors after regeneration"
**Solution:** 
1. Run `npm run type-check` to see specific errors
2. Update service placeholder code to use real Prisma queries
3. Check import statements in services

## 📋 Post-Regeneration Checklist

### ✅ Immediate Actions
- [ ] Run the regeneration script or manual commands
- [ ] Verify new models appear in `prisma/schema.prisma`
- [ ] Check TypeScript compilation with `npm run type-check`
- [ ] Verify Prisma client generated at `src/infrastructure/database/generated/`

### ✅ Service Updates (Next Step)
- [ ] Update `SmartContractWalletService.ts` to remove database placeholders
- [ ] Update `FacetRegistryService.ts` to remove placeholders  
- [ ] Create `WebAuthnService.ts` with real database operations
- [ ] Create `GuardianRecoveryService.ts` with real database operations

### ✅ Testing
- [ ] Run `npm run test:wallets` to test wallet services
- [ ] Test each new table with basic CRUD operations
- [ ] Verify foreign key relationships work correctly

## 🎯 Expected Timeline

- **Prisma Regeneration:** 2-3 minutes
- **Service Updates:** 2-3 hours  
- **Testing & Validation:** 1 hour
- **Total:** ~3-4 hours to complete integration

## 🚀 What This Enables

Once regeneration is complete, you'll be able to:

### **WebAuthn/Passkey Support**
- Register Touch ID, Face ID, Windows Hello credentials
- Store P-256 public keys for signature verification
- Track device information and manage multiple passkeys

### **Guardian Recovery System**  
- Add/remove guardian addresses with time delays
- Implement social recovery workflows
- Track guardian approval status and security periods

### **Account Abstraction (EIP-4337)**
- Submit UserOperations for gasless transactions
- Track transaction status and gas usage
- Implement paymaster-sponsored transactions

### **Smart Contract Wallet Management**
- Deploy EIP-2535 Diamond proxy wallets
- Manage modular facets and function selectors
- Track wallet deployment and upgrade history

---

**Ready to regenerate Prisma? Run the script or manual commands above! 🚀**
