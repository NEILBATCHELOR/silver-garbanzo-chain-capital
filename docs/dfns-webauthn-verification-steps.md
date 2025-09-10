# DFNS WebAuthn Setup - Verification Steps

## ✅ Route Access Test

1. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to DFNS Authentication:**
   - URL: `http://localhost:3000/wallet/dfns/auth`
   - Should show "DFNS Authentication Setup" page
   - Should display WebAuthn credential setup interface

3. **Verify Navigation:**
   - Click "Authentication" tab in DFNS horizontal navigation
   - Should navigate to credential setup page
   - Browser console should show no routing errors

## 🧪 WebAuthn Functionality Test

1. **Browser Compatibility:**
   - Use Chrome, Firefox, Safari, or Edge
   - WebAuthn must be supported (shown as green checkmark)

2. **Credential Creation:**
   - Enter credential name (e.g., "My MacBook Touch ID")
   - Click "Create WebAuthn Credential" 
   - Follow browser prompts (Touch ID, Windows Hello, etc.)
   - Should show success message and list new credential

3. **DFNS Service Connection:**
   - Console should show "DFNS Service initialized successfully"
   - No authentication errors in browser console
   - Should load existing credentials if any

## 🔍 Troubleshooting

### If Route Doesn't Work:
- Check browser console for routing errors
- Verify DfnsWalletDashboard is properly imported
- Ensure no TypeScript compilation errors

### If WebAuthn Fails:
- Check DFNS environment variables are set
- Verify DFNS service authentication status
- Ensure browser supports WebAuthn

### If Database Errors:
- Check Supabase connection
- Verify dfns_credentials table exists
- Check user permissions for DFNS tables

## 📊 Expected Results

✅ **Working Setup Should Show:**
- Authentication page loads without errors
- WebAuthn support detected (green checkmark)
- Existing credentials list (may be empty)
- Credential creation form functional
- Success/error messages display properly

❌ **Issues to Fix:**
- Route 404 errors → Check routing configuration
- WebAuthn not supported → Use compatible browser
- DFNS authentication errors → Check environment variables
- Database errors → Verify table permissions

---

**Status**: Route should be accessible at `/wallet/dfns/auth`
**Next Action**: Test credential creation with real WebAuthn device
