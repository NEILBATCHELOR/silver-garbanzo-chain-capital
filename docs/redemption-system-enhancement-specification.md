# Redemption System Enhancement - Data Specification & Implementation Plan

## 🎯 Core Business Principles

### 1. Redemption Availability Control
- **Principle**: Redemptions can only occur when redemptions are "open"
- **Implementation**: `redemption_rules.is_redemption_open` + `redemption_windows` active periods
- **Logic**: Check both global rules AND active window existence

### 2. Flexible Opening Mechanisms
- **After Date**: `redemption_rules.open_after_date` (single date trigger)
- **Date Range**: `redemption_windows.start_date` to `redemption_windows.end_date`
- **Continuous**: `redemption_rules.allow_continuous_redemption = true`

### 3. Distribution-Based Limitations
- **Percentage Limit**: `redemption_rules.max_redemption_percentage` of `distributions.token_amount`
- **Eligibility**: Must have active `distributions` record
- **Tracking**: `distributions.remaining_amount` decreases with redemptions

## 📊 Enhanced Database Schema

### Core Enhancement: Project/Product Linking

```sql
-- Enhanced redemption_rules table
ALTER TABLE redemption_rules 
ADD COLUMN IF NOT EXISTS product_type TEXT, -- 'fund', 'equity', 'bond', etc.
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES fund_products(id), -- Polymorphic reference
ADD COLUMN IF NOT EXISTS is_redemption_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS open_after_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS allow_continuous_redemption BOOLEAN DEFAULT false,
ADD CONSTRAINT redemption_rules_project_product_unique UNIQUE(project_id, product_id, redemption_type);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_redemption_rules_project_product ON redemption_rules(project_id, product_id);
CREATE INDEX IF NOT EXISTS idx_redemption_rules_open_status ON redemption_rules(is_redemption_open, open_after_date);
```

### New: Redemption Eligibility View

```sql
-- Create comprehensive eligibility checking view
CREATE OR REPLACE VIEW redemption_eligibility AS
SELECT 
    d.id as distribution_id,
    d.investor_id,
    d.project_id,
    d.token_amount as total_distributed,
    d.remaining_amount,
    d.fully_redeemed,
    rr.id as rule_id,
    rr.is_redemption_open,
    rr.open_after_date,
    rr.allow_continuous_redemption,
    rr.max_redemption_percentage,
    rr.lock_up_period,
    rw.id as active_window_id,
    rw.start_date as window_start,
    rw.end_date as window_end,
    rw.submission_start_date,
    rw.submission_end_date,
    rw.status as window_status,
    -- Calculated eligibility fields
    CASE 
        WHEN d.fully_redeemed THEN false
        WHEN rr.is_redemption_open = false THEN false
        WHEN rr.open_after_date IS NOT NULL AND rr.open_after_date > NOW() THEN false
        WHEN rr.allow_continuous_redemption = true THEN true
        WHEN rw.id IS NOT NULL AND rw.status = 'active' 
             AND NOW() BETWEEN rw.submission_start_date AND rw.submission_end_date THEN true
        ELSE false
    END as is_eligible_now,
    -- Maximum redeemable amount
    CASE 
        WHEN rr.max_redemption_percentage IS NOT NULL 
        THEN LEAST(d.remaining_amount, d.token_amount * rr.max_redemption_percentage / 100)
        ELSE d.remaining_amount
    END as max_redeemable_amount
FROM distributions d
LEFT JOIN redemption_rules rr ON rr.project_id = d.project_id 
LEFT JOIN redemption_windows rw ON rw.config_id IN (
    SELECT rwc.id FROM redemption_window_configs rwc 
    WHERE rwc.project_id = d.project_id AND rwc.active = true
) AND rw.status = 'active' AND NOW() BETWEEN rw.start_date AND rw.end_date
WHERE d.remaining_amount > 0;
```

## 🏗️ Implementation Architecture

### Phase 1: Database Schema Enhancement (2-3 hours)

#### 1.1 Table Modifications
```sql
-- Add project/product linking to redemption_rules
ALTER TABLE redemption_rules 
ADD COLUMN product_type TEXT,
ADD COLUMN product_id UUID,
ADD COLUMN is_redemption_open BOOLEAN DEFAULT false,
ADD COLUMN open_after_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN allow_continuous_redemption BOOLEAN DEFAULT false;

-- Add redemption tracking to distributions
ALTER TABLE distributions
ADD COLUMN redemption_percentage_used NUMERIC DEFAULT 0,
ADD COLUMN max_redemption_percentage NUMERIC;

-- Enhance redemption_requests with validation
ALTER TABLE redemption_requests
ADD COLUMN eligibility_check_id UUID,
ADD COLUMN window_id UUID REFERENCES redemption_windows(id),
ADD COLUMN distribution_ids UUID[] DEFAULT '{}';
```

#### 1.2 Create Business Logic Functions
```sql
-- Function to check redemption eligibility
CREATE OR REPLACE FUNCTION check_redemption_eligibility(
    p_investor_id UUID,
    p_project_id UUID,
    p_requested_amount NUMERIC
) RETURNS TABLE(
    eligible BOOLEAN,
    reason TEXT,
    max_amount NUMERIC,
    window_id UUID
) AS $$
BEGIN
    -- Implementation of three core principles
    -- Returns eligibility status with detailed reasoning
END;
$$ LANGUAGE plpgsql;

-- Function to validate redemption request
CREATE OR REPLACE FUNCTION validate_redemption_request(
    p_request_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Validates request against all business rules
    -- Updates redemption_requests.status based on validation
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Service Layer Enhancement (3-4 hours)

#### 2.1 Enhanced Eligibility Service
```typescript
// Enhanced eligibilityService.ts
export class EnhancedEligibilityService {
  // Principle 1: Check if redemptions are open
  async isRedemptionOpen(projectId: string, productId?: string): Promise<boolean> {
    const rules = await this.getRedemptionRules(projectId, productId);
    const activeWindows = await this.getActiveRedemptionWindows(projectId);
    
    return rules.is_redemption_open && (
      rules.allow_continuous_redemption || 
      activeWindows.length > 0
    );
  }

  // Principle 2: Check date/window eligibility
  async checkDateEligibility(projectId: string): Promise<EligibilityResult> {
    const rules = await this.getRedemptionRules(projectId);
    const now = new Date();
    
    // Check open_after_date
    if (rules.open_after_date && now < new Date(rules.open_after_date)) {
      return { eligible: false, reason: 'Redemption period not yet open' };
    }
    
    // Check active windows
    const activeWindows = await this.getActiveRedemptionWindows(projectId);
    if (!rules.allow_continuous_redemption && activeWindows.length === 0) {
      return { eligible: false, reason: 'No active redemption window' };
    }
    
    return { eligible: true };
  }

  // Principle 3: Check distribution percentage limits
  async checkDistributionLimits(
    investorId: string, 
    projectId: string, 
    requestedAmount: number
  ): Promise<EligibilityResult> {
    const distributions = await this.getInvestorDistributions(investorId, projectId);
    const rules = await this.getRedemptionRules(projectId);
    
    for (const distribution of distributions) {
      const maxRedeemable = rules.max_redemption_percentage 
        ? distribution.token_amount * (rules.max_redemption_percentage / 100)
        : distribution.remaining_amount;
        
      if (requestedAmount > maxRedeemable) {
        return { 
          eligible: false, 
          reason: `Amount exceeds ${rules.max_redemption_percentage}% limit`,
          maxAmount: maxRedeemable
        };
      }
    }
    
    return { eligible: true };
  }

  // Combined eligibility check
  async validateRedemptionRequest(request: RedemptionRequest): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.isRedemptionOpen(request.project_id, request.product_id),
      this.checkDateEligibility(request.project_id),
      this.checkDistributionLimits(request.investor_id, request.project_id, request.token_amount)
    ]);
    
    const failedChecks = checks.filter(check => !check.eligible);
    
    return {
      valid: failedChecks.length === 0,
      errors: failedChecks.map(check => check.reason),
      maxAmount: Math.min(...checks.map(check => check.maxAmount || Infinity))
    };
  }
}
```

#### 2.2 Enhanced Redemption Service
```typescript
// Enhanced redemptionService.ts
export class EnhancedRedemptionService {
  private eligibilityService = new EnhancedEligibilityService();
  
  async createRedemptionRequest(request: CreateRedemptionRequest): Promise<RedemptionRequest> {
    // Step 1: Validate eligibility
    const validation = await this.eligibilityService.validateRedemptionRequest(request);
    if (!validation.valid) {
      throw new RedemptionError(`Redemption not eligible: ${validation.errors.join(', ')}`);
    }
    
    // Step 2: Check distribution requirements
    const distributions = await this.getRequiredDistributions(request.investor_id, request.project_id);
    if (distributions.length === 0) {
      throw new RedemptionError('No distributions found for investor in this project');
    }
    
    // Step 3: Create request with eligibility tracking
    const redemptionRequest = await this.db.redemption_requests.insert({
      ...request,
      distribution_ids: distributions.map(d => d.id),
      eligibility_check_id: validation.checkId,
      status: 'pending_approval'
    });
    
    // Step 4: Reserve redemption amounts
    await this.reserveRedemptionAmounts(distributions, request.token_amount);
    
    return redemptionRequest;
  }
  
  private async reserveRedemptionAmounts(
    distributions: Distribution[], 
    totalAmount: number
  ): Promise<void> {
    let remaining = totalAmount;
    
    for (const distribution of distributions) {
      if (remaining <= 0) break;
      
      const reserveAmount = Math.min(remaining, distribution.remaining_amount);
      
      await this.db.distributions.update(distribution.id, {
        remaining_amount: distribution.remaining_amount - reserveAmount,
        redemption_percentage_used: 
          ((distribution.token_amount - distribution.remaining_amount + reserveAmount) / distribution.token_amount) * 100
      });
      
      remaining -= reserveAmount;
    }
  }
}
```

### Phase 3: Frontend Component Enhancement (2-3 hours)

#### 3.1 Enhanced Redemption Form
```typescript
// Enhanced RedemptionRequestForm.tsx
export const EnhancedRedemptionRequestForm: React.FC<Props> = ({ projectId, investorId }) => {
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [maxRedeemableAmount, setMaxRedeemableAmount] = useState<number>(0);
  const [activeWindows, setActiveWindows] = useState<RedemptionWindow[]>([]);
  
  // Real-time eligibility checking
  useEffect(() => {
    const checkEligibility = async () => {
      const result = await eligibilityService.validateRedemptionRequest({
        investor_id: investorId,
        project_id: projectId,
        token_amount: formData.amount
      });
      
      setEligibility(result);
      setMaxRedeemableAmount(result.maxAmount);
    };
    
    if (formData.amount > 0) {
      checkEligibility();
    }
  }, [formData.amount, projectId, investorId]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Redemption</CardTitle>
        {eligibility && (
          <EligibilityIndicator 
            status={eligibility.valid}
            reasons={eligibility.errors}
            maxAmount={maxRedeemableAmount}
          />
        )}
      </CardHeader>
      
      <CardContent>
        {/* Enhanced form with real-time validation */}
        <RedemptionWindowSelector 
          projectId={projectId}
          activeWindows={activeWindows}
          onWindowSelect={handleWindowSelect}
        />
        
        <AmountInput 
          value={formData.amount}
          maxAmount={maxRedeemableAmount}
          onChange={handleAmountChange}
          eligibilityStatus={eligibility?.valid}
        />
        
        <DistributionBreakdown 
          investorId={investorId}
          projectId={projectId}
          requestedAmount={formData.amount}
        />
      </CardContent>
    </Card>
  );
};
```

#### 3.2 Real-time Eligibility Indicator
```typescript
// EligibilityIndicator.tsx
export const EligibilityIndicator: React.FC<Props> = ({ status, reasons, maxAmount }) => {
  if (status === null) return null;
  
  return (
    <Alert variant={status ? "default" : "destructive"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {status ? "✅ Eligible for Redemption" : "❌ Not Eligible"}
      </AlertTitle>
      <AlertDescription>
        {status ? (
          <span>Maximum redeemable amount: <strong>${maxAmount?.toLocaleString()}</strong></span>
        ) : (
          <ul>
            {reasons?.map((reason, idx) => (
              <li key={idx}>• {reason}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
};
```

### Phase 4: Business Rules Configuration (1-2 hours)

#### 4.1 Product-Specific Redemption Rules
```typescript
// RedemptionRulesManager.tsx
export const RedemptionRulesManager: React.FC<Props> = ({ projectId }) => {
  const [rules, setRules] = useState<RedemptionRules[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Redemption Rules Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global">
            <TabsList>
              <TabsTrigger value="global">Global Rules</TabsTrigger>
              <TabsTrigger value="product">Product-Specific</TabsTrigger>
              <TabsTrigger value="windows">Redemption Windows</TabsTrigger>
            </TabsList>
            
            <TabsContent value="global">
              <GlobalRedemptionRules projectId={projectId} />
            </TabsContent>
            
            <TabsContent value="product">
              <ProductSpecificRules 
                projectId={projectId}
                products={products}
              />
            </TabsContent>
            
            <TabsContent value="windows">
              <RedemptionWindowManager projectId={projectId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
```

## 🚀 Implementation Timeline

### Week 1: Database Foundation
- **Day 1-2**: Schema modifications and business logic functions
- **Day 3-4**: Data migration and validation
- **Day 5**: Testing and performance optimization

### Week 2: Service Layer
- **Day 1-2**: Enhanced eligibility service implementation
- **Day 3-4**: Enhanced redemption service with validation
- **Day 5**: API integration and testing

### Week 3: Frontend Integration
- **Day 1-2**: Enhanced form components with real-time validation
- **Day 3-4**: Configuration management interface
- **Day 5**: End-to-end testing and refinement

## 🔧 Testing Strategy

### Unit Tests
- Eligibility checking functions
- Business rule validation
- Amount calculation logic

### Integration Tests
- Database function testing
- Service layer integration
- Frontend form validation

### End-to-End Tests
- Complete redemption workflow
- Multiple investor scenarios
- Edge cases and error handling

## 📈 Success Metrics

- **Compliance**: 100% adherence to three core principles
- **Performance**: <500ms eligibility checking
- **User Experience**: Real-time validation feedback
- **Business Impact**: Reduced manual approval overhead

## 🛡️ Risk Mitigation

### Data Integrity
- Comprehensive validation functions
- Rollback procedures for failed transactions
- Audit trails for all rule changes

### Performance
- Indexed queries for eligibility checking
- Cached redemption rules
- Async validation for large requests

### User Experience
- Progressive form validation
- Clear error messaging
- Fallback options for edge cases

---

This specification provides a comprehensive framework for implementing your three core redemption principles while maintaining the existing system's functionality and adding robust business rule enforcement.
