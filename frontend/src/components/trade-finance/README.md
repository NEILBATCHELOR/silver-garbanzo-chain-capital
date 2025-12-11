# Trade Finance UI Components

## Overview

React components for the Commodity Trade Finance platform frontend interface. Built with React, TypeScript, and Shadcn/UI.

## 📁 Directory Structure

```
📁 trade-finance/
   ├── supply/              # Supply/withdraw collateral
   ├── borrow/              # Borrow/repay operations
   ├── positions/           # User position management
   ├── liquidation/         # Liquidation interface
   └── admin/               # Admin controls
```

## 🎨 Component Categories

### 1. Supply Components

**Purpose**: Manage commodity collateral deposits and withdrawals

**Components**:
- `SupplyModal.tsx` - Modal for supplying commodity tokens
- `SupplySummary.tsx` - Display supplied collateral summary
- `WithdrawModal.tsx` - Modal for withdrawing collateral

**Features**:
- Token selection
- Amount input with max button
- Gas estimation
- Transaction confirmation
- Success/error handling

### 2. Borrow Components

**Purpose**: Manage borrowing against commodity collateral

**Components**:
- `BorrowModal.tsx` - Modal for borrowing stablecoins
- `BorrowSummary.tsx` - Display borrowed amounts
- `RepayModal.tsx` - Modal for repaying debt
- `HealthFactorDisplay.tsx` - Real-time health factor indicator

**Features**:
- Available borrowing power calculation
- Interest rate display
- Health factor warnings
- Repayment scheduling

### 3. Position Components

**Purpose**: View and manage user positions

**Components**:
- `PositionsList.tsx` - Table of all user positions
- `PositionDetails.tsx` - Detailed view of single position
- `LiquidationWarning.tsx` - Alert for positions at risk

**Features**:
- Real-time position tracking
- Health factor monitoring
- Collateral/debt ratios
- Action buttons (add collateral, repay)

### 4. Liquidation Components

**Purpose**: Liquidator interface for closing underwater positions

**Components**:
- `LiquidatablePositions.tsx` - List of positions available for liquidation
- `LiquidateModal.tsx` - Modal for executing liquidations

**Features**:
- Sort by profitability
- Health factor filters
- Liquidation bonus calculation
- Multi-position liquidation

### 5. Admin Components

**Purpose**: Protocol administration and risk management

**Components**:
- `RiskParameterControl.tsx` - Adjust LTV, liquidation thresholds
- `AssetListing.tsx` - Add new commodity types
- `EmergencyControls.tsx` - Pause, unpause, circuit breakers

**Features**:
- Role-based access control
- Parameter validation
- Multi-sig integration
- Event logging

## 🔧 Component Architecture

### Shared Patterns

All components follow consistent patterns:

1. **Service Integration**
   ```typescript
   import { CommodityPoolService } from '@/services/trade-finance';
   const poolService = createCommodityPoolService(config);
   ```

2. **State Management**
   ```typescript
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

3. **Form Validation**
   - Zod schemas for type-safe validation
   - Real-time error display
   - Disabled submit on invalid input

4. **Transaction Flow**
   - Show loading spinner
   - Display gas estimate
   - Confirm transaction
   - Show success/error toast
   - Refresh data

### Example Component Structure

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommodityPoolService } from '@/services/trade-finance';

interface SupplyModalProps {
  open: boolean;
  onClose: () => void;
  poolAddress: string;
  userAddress: string;
}

export function SupplyModal({ open, onClose, poolAddress, userAddress }: SupplyModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSupply = async () => {
    setLoading(true);
    try {
      // Use service
      const result = await poolService.supply({
        userAddress,
        commodityToken: selectedToken,
        amount,
        privateKey // TODO: Get from wallet service
      });
      
      // Success
      toast.success(`Supplied ${amount} tokens`);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supply Collateral</DialogTitle>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

## 📊 Data Flow

```
User Interaction
       ↓
React Component
       ↓
Trade Finance Service (CommodityPoolService)
       ↓
Transaction Builder (existing)
       ↓
Smart Contract (CommodityLendingPool.sol)
       ↓
Blockchain
       ↓
Success/Error
       ↓
Update UI State
```

## 🎨 UI/UX Guidelines

### Design Principles

1. **Clarity**: Display all relevant information upfront
2. **Safety**: Multiple confirmations for irreversible actions
3. **Feedback**: Clear success/error messages
4. **Responsiveness**: Mobile-friendly layouts

### Color Coding

- 🟢 **Green**: Healthy positions (HF > 1.1)
- 🟡 **Yellow**: Warning (HF 1.0 - 1.1)
- 🟠 **Orange**: Urgent (HF 0.95 - 1.0)
- 🔴 **Red**: Critical / Liquidatable (HF < 0.95)

### Component Library

**Using Shadcn/UI:**
- Dialog for modals
- Table for lists
- Card for summaries
- Badge for status
- Alert for warnings
- Button for actions
- Input/Select for forms

## 🔐 Security Patterns

### Private Key Handling

```typescript
// NEVER store private keys in component state
// ALWAYS use wallet service
import { evmWalletService } from '@/services/wallet/evm/EVMWalletService';

// Decrypt when needed
const decrypted = await evmWalletService.decryptWallet(
  encryptedWallet,
  userPassword
);

// Use immediately
await poolService.supply({ 
  ...params, 
  privateKey: decrypted.privateKey 
});

// Clear from memory
decrypted.privateKey = '';
```

### Input Validation

```typescript
import { z } from 'zod';

const supplySchema = z.object({
  amount: z.string()
    .min(1, 'Amount required')
    .refine(val => parseFloat(val) > 0, 'Must be positive')
    .refine(val => parseFloat(val) <= maxAmount, 'Exceeds balance')
});
```

## 📱 Responsive Design

All components must be responsive:

```typescript
// Mobile: Stack vertically
// Desktop: Side-by-side layout

<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">
    {/* Left column */}
  </div>
  <div className="w-full md:w-1/2">
    {/* Right column */}
  </div>
</div>
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SupplyModal } from './SupplyModal';

test('validates amount input', () => {
  render(<SupplyModal {...props} />);
  
  const input = screen.getByLabelText('Amount');
  fireEvent.change(input, { target: { value: '-1' } });
  
  expect(screen.getByText('Must be positive')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
test('supply flow end-to-end', async () => {
  // 1. Open modal
  // 2. Enter amount
  // 3. Confirm transaction
  // 4. Verify success toast
  // 5. Verify UI updates
});
```

## 🚀 Development Workflow

### Creating New Components

1. Create component file in appropriate directory
2. Add exports to `index.ts`
3. Implement with TypeScript + Zod validation
4. Add unit tests
5. Test in Storybook (optional)
6. Document in this README

### Component Checklist

- [ ] TypeScript types defined
- [ ] Props interface documented
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Success feedback provided
- [ ] Mobile responsive
- [ ] Accessibility (ARIA labels)
- [ ] Unit tests written
- [ ] Integration tested

## 📚 Component API Reference

### SupplyModal

```typescript
interface SupplyModalProps {
  open: boolean;
  onClose: () => void;
  poolAddress: string;
  userAddress: string;
  availableTokens: Array<{ address: string; symbol: string; balance: string }>;
  onSuccess?: (txHash: string) => void;
}
```

### BorrowModal

```typescript
interface BorrowModalProps {
  open: boolean;
  onClose: () => void;
  poolAddress: string;
  userAddress: string;
  availableBorrowPower: string;
  healthFactor: number;
  onSuccess?: (txHash: string) => void;
}
```

### PositionsList

```typescript
interface PositionsListProps {
  userAddress: string;
  poolAddress: string;
  onPositionClick?: (positionId: string) => void;
}
```

## 🎯 Next Steps

### Week 4-5: Core Components
- [ ] SupplyModal
- [ ] WithdrawModal
- [ ] BorrowModal
- [ ] RepayModal
- [ ] HealthFactorDisplay

### Week 6-7: Advanced Components
- [ ] PositionsList
- [ ] PositionDetails
- [ ] LiquidationWarning
- [ ] LiquidatablePositions
- [ ] LiquidateModal

### Week 8: Admin & Polish
- [ ] RiskParameterControl
- [ ] AssetListing
- [ ] EmergencyControls
- [ ] Comprehensive testing
- [ ] Performance optimization

---

**Status**: Directory structure created ✅  
**Next**: Implement core supply/borrow components  
**Updated**: December 11, 2024
