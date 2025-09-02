-- Test Data for Organization Management System
-- Run this script in your Supabase SQL editor to add sample organizations

INSERT INTO organizations (
  name,
  legal_name,
  registration_number,
  tax_id,
  jurisdiction,
  business_type,
  status,
  contact_email,
  contact_phone,
  website,
  address,
  legal_representatives,
  compliance_status,
  onboarding_completed
) VALUES 
  (
    'Acme Capital SPV',
    'Acme Capital Special Purpose Vehicle LLC',
    'LLC-2024-001234',
    '87-1234567',
    'us',
    'llc',
    'active',
    'contact@acmecapital.com',
    '+1-555-123-4567',
    'https://www.acmecapital.com',
    '{"street": "123 Wall Street", "city": "New York", "state": "NY", "postal_code": "10005", "country": "US"}'::jsonb,
    '[{"name": "John Smith", "role": "Managing Director", "email": "j.smith@acmecapital.com"}]'::jsonb,
    'compliant',
    true
  ),
  (
    'TechFund Investment Trust',
    'TechFund Investment Trust',
    'TRUST-2024-567890',
    '12-3456789',
    'us',
    'trust',
    'pending',
    'admin@techfund.com',
    '+1-555-987-6543',
    'https://www.techfund.com',
    '{"street": "456 Tech Avenue", "city": "San Francisco", "state": "CA", "postal_code": "94105", "country": "US"}'::jsonb,
    '[{"name": "Sarah Johnson", "role": "Trustee", "email": "s.johnson@techfund.com"}, {"name": "Mike Davis", "role": "Investment Manager", "email": "m.davis@techfund.com"}]'::jsonb,
    'pending_review',
    false
  ),
  (
    'Global Real Estate Holdings',
    'Global Real Estate Holdings Corporation',
    'CORP-2024-789012',
    '98-7654321',
    'uk',
    'corporation',
    'active',
    'info@globalre.co.uk',
    '+44-20-1234-5678',
    'https://www.globalre.co.uk',
    '{"street": "789 Financial District", "city": "London", "state": null, "postal_code": "EC2V 8RF", "country": "GB"}'::jsonb,
    '[{"name": "Emma Thompson", "role": "CEO", "email": "e.thompson@globalre.co.uk"}, {"name": "James Wilson", "role": "CFO", "email": "j.wilson@globalre.co.uk"}]'::jsonb,
    'compliant',
    true
  ),
  (
    'FinanceFirst Asset Management',
    'FinanceFirst Asset Management LLC',
    'LLC-2024-345678',
    '55-9876543',
    'us',
    'llc',
    'active',
    'operations@financefirst.com',
    '+1-555-444-3333',
    'https://www.financefirst.com',
    '{"street": "100 Park Avenue", "city": "New York", "state": "NY", "postal_code": "10017", "country": "US"}'::jsonb,
    '[{"name": "Robert Chen", "role": "Managing Partner", "email": "r.chen@financefirst.com"}]'::jsonb,
    'compliant',
    true
  ),
  (
    'European Growth Fund',
    'European Growth Fund S.A.',
    'SA-2024-111222',
    'LU12345678',
    'lu',
    'corporation',
    'pending',
    'contact@eugrowth.com',
    '+352-26-12-34-56',
    'https://www.eugrowth.com',
    '{"street": "12 Avenue John F. Kennedy", "city": "Luxembourg", "state": null, "postal_code": "L-1855", "country": "LU"}'::jsonb,
    '[{"name": "Marie Dubois", "role": "Fund Manager", "email": "m.dubois@eugrowth.com"}]'::jsonb,
    'under_review',
    false
  );

-- Also insert some sample documents for the organizations
-- First, get the organization IDs
DO $$
DECLARE
    acme_id UUID;
    techfund_id UUID;
    global_re_id UUID;
BEGIN
    -- Get organization IDs
    SELECT id INTO acme_id FROM organizations WHERE name = 'Acme Capital SPV' LIMIT 1;
    SELECT id INTO techfund_id FROM organizations WHERE name = 'TechFund Investment Trust' LIMIT 1;
    SELECT id INTO global_re_id FROM organizations WHERE name = 'Global Real Estate Holdings' LIMIT 1;
    
    -- Insert sample documents for Acme Capital SPV
    IF acme_id IS NOT NULL THEN
        INSERT INTO issuer_documents (
            issuer_id, 
            document_name, 
            document_type, 
            status, 
            file_size,
            is_public
        ) VALUES 
            (acme_id, 'Certificate of Incorporation.pdf', 'certificate_incorporation', 'active', 245760, false),
            (acme_id, 'Commercial Register Extract.pdf', 'commercial_register', 'active', 156432, false),
            (acme_id, 'Board of Directors List.pdf', 'director_list', 'active', 98304, false),
            (acme_id, 'Financial Statements 2024.pdf', 'financial_statements', 'active', 512000, false);
    END IF;
    
    -- Insert sample documents for TechFund
    IF techfund_id IS NOT NULL THEN
        INSERT INTO issuer_documents (
            issuer_id, 
            document_name, 
            document_type, 
            status, 
            file_size,
            is_public
        ) VALUES 
            (techfund_id, 'Trust Agreement.pdf', 'memorandum_articles', 'active', 387296, false),
            (techfund_id, 'Trustee Appointment Letter.pdf', 'director_list', 'active', 124352, false);
    END IF;
    
    -- Insert sample documents for Global Real Estate Holdings
    IF global_re_id IS NOT NULL THEN
        INSERT INTO issuer_documents (
            issuer_id, 
            document_name, 
            document_type, 
            status, 
            file_size,
            is_public
        ) VALUES 
            (global_re_id, 'Articles of Association.pdf', 'memorandum_articles', 'active', 298765, false),
            (global_re_id, 'UK Companies House Certificate.pdf', 'certificate_incorporation', 'active', 187432, false),
            (global_re_id, 'Audited Accounts 2024.pdf', 'financial_statements', 'active', 654321, false),
            (global_re_id, 'Regulatory Status Confirmation.pdf', 'regulatory_status', 'active', 145698, false);
    END IF;
END $$;
