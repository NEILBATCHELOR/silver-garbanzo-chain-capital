# DFNS Environment Setup Validation

## Critical Issues Identified

Your DFNS integration has **placeholder credentials** in `.env.local` that need to be replaced with actual DFNS credentials.

## Required Actions

### 1. Get Real DFNS Credentials

#### Create DFNS Application:
1. Go to [DFNS Console](https://console.dfns.ninja) 
2. Create a new Application
3. Copy the **App ID** (starts with `ap-`)

#### Create Service Account:
1. In DFNS Console → Service Accounts
2. Create a new Service Account  
3. Copy the **Service Account ID** (starts with `sa-`)
4. Download the **Private Key** file

### 2. Update Environment Variables

Replace these placeholder values in `/frontend/.env.local`:

```bash
# REPLACE THESE PLACEHOLDER VALUES:
VITE_DFNS_APP_ID=ap-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_DFNS_SERVICE_ACCOUNT_ID=sa-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX  
VITE_DFNS_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----

# WITH YOUR ACTUAL VALUES:
VITE_DFNS_APP_ID=ap-39a8f7e2-1234-5678-9abc-def123456789  # Your real App ID
VITE_DFNS_SERVICE_ACCOUNT_ID=sa-b8c9d0e1-2345-6789-abcd-ef0123456789  # Your real Service Account ID
VITE_DFNS_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----  # Your real private key
```

### 3. Verify Service Account Permissions

Ensure your service account has these permissions in DFNS Console:
- `Wallets:Create`
- `Wallets:Read` 
- `Wallets:TransferAsset`
- `Keys:Create`
- `Keys:Read`
- `Keys:GenerateSignature`
- `Policies:Read`
- `Users:Read`

### 4. Test Integration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Add the test component to your app:
   ```tsx
   // In App.tsx or a test page
   import { DfnsTestComponent } from '@/components/dfns/DfnsTestComponent';
   
   function App() {
     return (
       <div>
         {/* Add this component to test DFNS */}
         <DfnsTestComponent />
       </div>
     );
   }
   ```

3. Run the health check test to verify connectivity

## Configuration Status

- ✅ **Code Integration**: DFNS SDK properly integrated
- ✅ **Service Layer**: Real API calls implemented (no more mocks)
- ✅ **Error Handling**: TypeScript errors resolved
- ❌ **Credentials**: Placeholder values need replacement
- ❌ **Testing**: Cannot test until credentials are set

## Next Steps

1. **Get credentials** from DFNS Console
2. **Update .env.local** with real values
3. **Test integration** using the test component
4. **Start building** your wallet functionality

## Expected Results After Setup

Once you provide real credentials, you should be able to:
- ✅ Connect to DFNS API
- ✅ Create real wallets on testnets
- ✅ Get real wallet balances  
- ✅ Perform real transfers
- ✅ Manage policies and keys
- ✅ See real transaction history

## Troubleshooting

### Common Issues:

**"Invalid credentials" error**:
- Verify App ID and Service Account ID are correct
- Ensure private key is properly formatted (includes headers/footers)
- Check service account has required permissions

**"Network error"**:  
- Verify `VITE_DFNS_BASE_URL=https://api.dfns.ninja` (sandbox)
- For production: `VITE_DFNS_BASE_URL=https://api.dfns.co`

**"Method not found"**:
- Ensure you're using `@dfns/sdk` v0.6.12 or later
- Restart dev server after credential changes

## Support

- [DFNS Documentation](https://docs.dfns.co)
- [DFNS Console](https://console.dfns.ninja)
- Use the test component to diagnose specific issues