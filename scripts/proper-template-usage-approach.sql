-- TEMPLATE APPROACH: Use redemption_window_configs as intended
-- Create meaningful templates for standardized redemption policies

-- Example: Create actual fund-specific redemption policies
INSERT INTO redemption_window_configs (
  name,
  fund_id, 
  project_id,
  frequency,
  submission_window_days,
  lock_up_period,
  max_redemption_percentage,
  enable_pro_rata_distribution,
  auto_process
) VALUES 
-- Real Estate Fund: Quarterly redemptions, 90-day lockup, 25% max
('Real Estate Fund Standard Policy', 
 '12345678-1234-1234-1234-123456789012',
 '12345678-1234-1234-1234-123456789012', 
 'quarterly', 14, 90, 25.00, true, false),

-- Growth Fund: Monthly redemptions, 30-day lockup, 10% max  
('Growth Fund Standard Policy',
 '87654321-4321-4321-4321-210987654321',
 '87654321-4321-4321-4321-210987654321',
 'monthly', 7, 30, 10.00, true, false),

-- Liquid Fund: Monthly redemptions, no lockup, 50% max
('Liquid Fund Standard Policy',
 '11111111-2222-3333-4444-555555555555', 
 '11111111-2222-3333-4444-555555555555',
 'monthly', 5, 0, 50.00, false, true);

-- Then windows can reference these meaningful templates
-- instead of creating dummy "Default Redemption Config"
