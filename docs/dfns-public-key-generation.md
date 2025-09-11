# DFNS Public Key Generation Guide

## 🎯 **Quick Answer: 3 Ways to Generate Public Keys**

For DFNS Personal Access Tokens (PATs) and Service Accounts, you need a public/private key pair. Here are your options:

---

## **Method 1: Generate New Keys (Recommended) 🔧**

### **Option A: Using Bash Script**
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital
./scripts/generate-dfns-keypair.sh
```

### **Option B: Using Node.js Script**  
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital
node scripts/generate-dfns-keypair.mjs
```

### **Option C: Manual OpenSSL Commands**
```bash
# Ed25519 (RECOMMENDED by DFNS)
openssl genpkey -algorithm Ed25519 -out dfns-private.pem
openssl pkey -in dfns-private.pem -pubout -out dfns-public.pem

# View the public key to copy
cat dfns-public.pem
```

---

## **Method 2: Extract from Existing WebAuthn Credentials** 

If you already have WebAuthn credentials registered with DFNS, you can use those:

1. **Check your existing credentials** in DFNS Dashboard
2. **Use the same WebAuthn credential** that you use for User Action Signing
3. **No new key generation needed** - DFNS will handle authentication using your existing passkey

---

## **Method 3: Use Browser WebAuthn API (Advanced)**

For web applications that need to generate keys dynamically:

```javascript
// This would be integrated into your web app for on-demand key generation
const credential = await navigator.credentials.create({
  publicKey: {
    rp: { name: "Your App" },
    user: { id: new Uint8Array(16), name: "user@example.com", displayName: "User" },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    challenge: new Uint8Array(32)
  }
});
```

---

## **🚀 Complete PAT Creation Process**

### **Step 1: Generate Your Public Key**
```bash
# Use either script above, or manual OpenSSL
cd /Users/neilbatchelor/silver-garbanzo-chain-capital
./scripts/generate-dfns-keypair.sh
```

### **Step 2: Copy the Public Key**
The output will show something like:
```
-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEZQt0YI2hdsFNmKJesSkAHldyPLIV
FLIM/AhQ5eGasA7jU8tEXOb6nGvxRaTIXrgZ2NPdk78O8zMqz5u9AekH8jA==
-----END PUBLIC KEY-----
```

### **Step 3: Create PAT via DFNS API**

#### **Using cURL:**
```bash
curl -X POST https://api.dfns.io/auth/pats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CURRENT_TOKEN" \
  -H "X-DFNS-USERACTION: USER_ACTION_TOKEN" \
  -d '{
    "name": "My New PAT",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_HERE\n-----END PUBLIC KEY-----",
    "daysValid": 365,
    "permissionId": "pm-4jr4k-dk1mo-9g2ag2k852hbpt2q"
  }'
```

#### **Using DFNS Dashboard (Easier):**
1. **Login to DFNS Dashboard**: https://dashboard.dfns.io
2. **Navigate to**: Authentication → Personal Access Tokens  
3. **Create New Token**:
   - **Name**: `"New PAT for Chain Capital"`
   - **Public Key**: Paste the public key from Step 2
   - **Days Valid**: `365`
   - **Permission**: Select your permission (pm-4jr4k-dk1mo-9g2ag2k852hbpt2q)
4. **Complete User Action Signing** with your WebAuthn credential
5. **Copy the returned JWT token** (only shown once!)

### **Step 4: Update Environment Variables**
```bash
# Update your .env file
VITE_DFNS_PERSONAL_ACCESS_TOKEN=eyJ0eXAi...your_new_jwt_token_here
```

### **Step 5: Test Your New PAT**
```bash
cd /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend
npx ts-node test-working-client.ts
```

---

## **🔒 Security Best Practices**

### **Private Key Storage**
- ✅ **Store private keys securely** (password managers, encrypted storage)
- ✅ **Never commit private keys to git**
- ✅ **Use different keys for different environments** (dev/staging/prod)
- ❌ **Never share private keys** via email, Slack, etc.

### **Public Key Usage**
- ✅ **Safe to share public keys** with DFNS  
- ✅ **Can store public keys in configuration files**
- ✅ **Use the same public key for multiple tokens** if needed

### **Token Management**
- ✅ **Set appropriate expiry times** (365 days max)
- ✅ **Rotate tokens before expiry**
- ✅ **Revoke unused tokens**
- ✅ **Monitor token usage** in DFNS Dashboard

---

## **🎯 Your Specific Situation**

**Your Permission ID**: `pm-4jr4k-dk1mo-9g2ag2k852hbpt2q`  
**Current PAT Expiry**: September 9, 2025  
**Recommended Action**: Generate new key pair and create fresh PAT

### **Quick Start Commands**
```bash
# 1. Generate keys
cd /Users/neilbatchelor/silver-garbanzo-chain-capital
./scripts/generate-dfns-keypair.sh

# 2. Copy the Ed25519 public key output

# 3. Create PAT in DFNS Dashboard with:
#    - Public key from step 2
#    - Permission: pm-4jr4k-dk1mo-9g2ag2k852hbpt2q
#    - Name: "Chain Capital New PAT"

# 4. Update environment with new JWT token
# 5. Test the connection
```

---

## **📚 Reference Links**

- **DFNS Key Generation Docs**: https://docs.dfns.co/d/advanced-topics/authentication/credentials/generate-a-key-pair
- **DFNS PAT Creation Docs**: https://docs.dfns.co/d/api-docs/authentication/personal-access-token-management/createpersonalaccesstoken  
- **DFNS Dashboard**: https://dashboard.dfns.io
- **WebAuthn Guide**: https://webauthn.guide

---

**Status**: ✅ Ready to generate keys and create new PAT  
**Next Action**: Run `./scripts/generate-dfns-keypair.sh` to get started