-- Climate Receivables Sample Data Script
-- This script creates sample data for testing climate receivables CRUD functionality

-- Insert sample climate payers
INSERT INTO climate_payers (payer_id, name, credit_rating, financial_health_score, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Pacific Electric Utility', 'A+', 92, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Green Power Cooperative', 'A', 85, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Metro Energy Solutions', 'B+', 78, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Regional Power Corp', 'B', 72, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Industrial Energy Partners', 'A-', 88, NOW(), NOW());

-- Insert sample payment history data
UPDATE climate_payers SET payment_history = '{"average_payment_days": 28, "payment_reliability": "excellent", "late_payments_last_12m": 0}'::jsonb 
WHERE name = 'Pacific Electric Utility';

UPDATE climate_payers SET payment_history = '{"average_payment_days": 32, "payment_reliability": "good", "late_payments_last_12m": 2}'::jsonb 
WHERE name = 'Green Power Cooperative';

UPDATE climate_payers SET payment_history = '{"average_payment_days": 45, "payment_reliability": "fair", "late_payments_last_12m": 5}'::jsonb 
WHERE name = 'Metro Energy Solutions';

UPDATE climate_payers SET payment_history = '{"average_payment_days": 52, "payment_reliability": "acceptable", "late_payments_last_12m": 8}'::jsonb 
WHERE name = 'Regional Power Corp';

UPDATE climate_payers SET payment_history = '{"average_payment_days": 30, "payment_reliability": "very good", "late_payments_last_12m": 1}'::jsonb 
WHERE name = 'Industrial Energy Partners';

-- Insert sample climate receivables
INSERT INTO climate_receivables (receivable_id, asset_id, payer_id, amount, due_date, risk_score, discount_rate, created_at, updated_at) VALUES
(gen_random_uuid(), '62de9202-95f6-4d29-bb59-4c77cdfbbd62', '550e8400-e29b-41d4-a716-446655440001', 150000.00, '2024-12-15', 8, 2.5, NOW(), NOW()),
(gen_random_uuid(), 'b2050329-31b1-46cd-b3da-a56e5fc2731d', '550e8400-e29b-41d4-a716-446655440002', 275000.50, '2025-01-20', 15, 3.2, NOW(), NOW()),
(gen_random_uuid(), 'e6bab7b5-cb6e-410a-a995-e077dd2ed880', '550e8400-e29b-41d4-a716-446655440003', 125000.75, '2024-11-30', 22, 4.1, NOW(), NOW()),
(gen_random_uuid(), '62de9202-95f6-4d29-bb59-4c77cdfbbd62', '550e8400-e29b-41d4-a716-446655440004', 95000.00, '2025-02-10', 28, 4.8, NOW(), NOW()),
(gen_random_uuid(), 'b2050329-31b1-46cd-b3da-a56e5fc2731d', '550e8400-e29b-41d4-a716-446655440005', 185000.25, '2024-12-28', 12, 3.0, NOW(), NOW());

-- Verify the data was inserted correctly
SELECT 'Climate Payers Count' as table_name, COUNT(*) as count FROM climate_payers
UNION ALL
SELECT 'Climate Receivables Count' as table_name, COUNT(*) as count FROM climate_receivables
UNION ALL
SELECT 'Energy Assets Count' as table_name, COUNT(*) as count FROM energy_assets;

-- Show sample receivables with related data
SELECT 
    cr.receivable_id,
    ea.name as asset_name,
    ea.type as asset_type,
    cp.name as payer_name,
    cp.credit_rating,
    cr.amount,
    cr.due_date,
    cr.risk_score,
    cr.discount_rate
FROM climate_receivables cr
JOIN energy_assets ea ON cr.asset_id = ea.asset_id
JOIN climate_payers cp ON cr.payer_id = cp.payer_id
ORDER BY cr.created_at DESC
LIMIT 10;
