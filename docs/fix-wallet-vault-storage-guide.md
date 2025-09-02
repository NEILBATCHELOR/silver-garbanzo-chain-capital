# Fix Wallet Vault Storage Script Documentation

## Issues Encountered

When trying to run the script directly with ts-node, we encountered module resolution issues:

```
Error: Cannot find module './Chain'
```

This happens because the script uses import paths like `@/infrastructure/database/client` which are defined in your project's tsconfig.json and won't resolve correctly when run directly with ts-node outside the project context.

## Solutions

### Option 1: Add to package.json Scripts

The best way to run this script is to add it to your package.json scripts:

```json
{
  "scripts": {
    "fix-wallet-vault": "ts-node -r tsconfig-paths/register scripts/fix-wallet-vault-storage.ts"
  }
}
```

Then run:

```bash
npm run fix-wallet-vault
```

### Option 2: Create a Temporary Fix in the Dashboard

You can create a temporary fix by adding a button to your admin dashboard that calls the fixMissingVaultStorage function directly. This would be a quick way to run the fix without needing to set up the command line script.

Here's how you could add this to an admin page:

```tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { fixMissingVaultStorage } from '@/scripts/fix-wallet-vault-storage';
import { useToast } from "@/components/ui/use-toast";

export const AdminTools: React.FC = () => {
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);

  const handleFixWalletStorage = async () => {
    setIsFixing(true);
    try {
      await fixMissingVaultStorage();
      toast({
        title: "Success",
        description: "Wallet vault storage fix completed",
      });
    } catch (error) {
      console.error("Error fixing wallet storage:", error);
      toast({
        title: "Error",
        description: "Failed to fix wallet storage",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button 
        onClick={handleFixWalletStorage}
        disabled={isFixing}
      >
        {isFixing ? "Fixing..." : "Fix Wallet Vault Storage"}
      </Button>
    </div>
  );
};
```

### Option 3: Fix in the Browser Console

If you have access to the browser console on your development environment, you can also paste and run the fix code directly. This is a quick but temporary solution.

## Current Status

The improvements to the wallet generation code have been implemented:

1. Private key encryption has been fixed
2. Vault storage detection and updating has been improved
3. Better error handling and logging has been added

These changes should prevent new wallets from having the same issues, but existing wallets will still need to be fixed using one of the methods above.

## Next Steps

1. Choose one of the options above to run the fix script
2. Test generating a new wallet to ensure it's stored correctly
3. Verify that wallet data is properly displayed in the project details page
