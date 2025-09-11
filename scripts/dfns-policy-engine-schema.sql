-- DFNS Policy Engine Database Schema
-- Based on DFNS Policy Engine API: https://docs.dfns.co/d/api-docs/policy-engine

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main policies table
CREATE TABLE IF NOT EXISTS dfns_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dfns_policy_id TEXT UNIQUE NOT NULL, -- DFNS policy ID (plc-...)
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    activity_kind TEXT NOT NULL, -- Wallets:Sign, Permissions:Assign, etc.
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Policy rule (JSON structure)
    rule_kind TEXT NOT NULL, -- AlwaysTrigger, TransactionAmountLimit, etc.
    rule_configuration JSONB, -- Rule-specific configuration
    
    -- Policy action (JSON structure)  
    action_kind TEXT NOT NULL, -- Block, RequestApproval, NoAction
    action_configuration JSONB, -- Action-specific configuration
    
    -- Policy filters (JSON structure)
    filters JSONB, -- Wallet filters, permission filters, etc.
    
    -- Metadata
    metadata JSONB,
    
    -- Indexing
    CONSTRAINT valid_activity_kind CHECK (activity_kind IN (
        'Wallets:Sign', 
        'Wallets:IncomingTransaction',
        'Permissions:Assign', 
        'Permissions:Modify', 
        'Policies:Modify'
    )),
    CONSTRAINT valid_rule_kind CHECK (rule_kind IN (
        'AlwaysTrigger',
        'TransactionAmountLimit',
        'TransactionAmountVelocity', 
        'TransactionCountVelocity',
        'TransactionRecipientWhitelist',
        'ChainalysisTransactionPrescreening',
        'ChainalysisTransactionScreening'
    )),
    CONSTRAINT valid_action_kind CHECK (action_kind IN (
        'Block',
        'RequestApproval', 
        'NoAction'
    ))
);

-- Approval groups table (for RequestApproval action)
CREATE TABLE IF NOT EXISTS dfns_policy_approval_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES dfns_policies(id) ON DELETE CASCADE,
    dfns_policy_id TEXT NOT NULL, -- Reference to DFNS policy ID
    group_name TEXT, -- Optional group name
    quorum INTEGER NOT NULL DEFAULT 1, -- Required approvals in this group
    approvers JSONB NOT NULL, -- { userId: { in: [...] } } or {}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy evaluation history
CREATE TABLE IF NOT EXISTS dfns_policy_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dfns_policy_id TEXT NOT NULL,
    activity_id TEXT NOT NULL, -- DFNS activity ID
    trigger_status TEXT NOT NULL CHECK (trigger_status IN ('Triggered', 'Skipped')),
    reason TEXT, -- Human-readable reason
    evaluation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    activity_kind TEXT NOT NULL,
    activity_details JSONB, -- Full activity details
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing dfns_policy_approvals table (if needed)
-- Check if columns exist before adding them
DO $$ 
BEGIN
    -- Add dfns_policy_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dfns_policy_approvals' 
                   AND column_name = 'dfns_policy_id') THEN
        ALTER TABLE dfns_policy_approvals 
        ADD COLUMN dfns_policy_id TEXT;
    END IF;
    
    -- Add initiator_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dfns_policy_approvals' 
                   AND column_name = 'initiator_id') THEN
        ALTER TABLE dfns_policy_approvals 
        ADD COLUMN initiator_id TEXT;
    END IF;
    
    -- Add expiration_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dfns_policy_approvals' 
                   AND column_name = 'expiration_date') THEN
        ALTER TABLE dfns_policy_approvals 
        ADD COLUMN expiration_date TIMESTAMPTZ;
    END IF;
    
    -- Add activity_details if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dfns_policy_approvals' 
                   AND column_name = 'activity_details') THEN
        ALTER TABLE dfns_policy_approvals 
        ADD COLUMN activity_details JSONB;
    END IF;
    
    -- Add evaluated_policies if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dfns_policy_approvals' 
                   AND column_name = 'evaluated_policies') THEN
        ALTER TABLE dfns_policy_approvals 
        ADD COLUMN evaluated_policies JSONB;
    END IF;
    
    -- Update status constraint to include all DFNS approval statuses
    ALTER TABLE dfns_policy_approvals 
    DROP CONSTRAINT IF EXISTS dfns_policy_approvals_status_check;
    
    ALTER TABLE dfns_policy_approvals 
    ADD CONSTRAINT dfns_policy_approvals_status_check 
    CHECK (status IN ('Pending', 'Approved', 'Denied', 'AutoApproved', 'Expired'));
END $$;

-- Individual approval decisions table
CREATE TABLE IF NOT EXISTS dfns_policy_approval_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID REFERENCES dfns_policy_approvals(id) ON DELETE CASCADE,
    dfns_approval_id TEXT NOT NULL, -- DFNS approval ID (ap-...)
    user_id TEXT NOT NULL, -- DFNS user ID who made the decision
    decision_value TEXT NOT NULL CHECK (decision_value IN ('Approved', 'Denied')),
    reason TEXT, -- Optional reason for the decision
    date_actioned TIMESTAMPTZ DEFAULT NOW(),
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy change requests table (for policy modifications requiring approval)
CREATE TABLE IF NOT EXISTS dfns_policy_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dfns_change_request_id TEXT UNIQUE NOT NULL, -- DFNS change request ID (cr-...)
    kind TEXT NOT NULL DEFAULT 'Policy',
    operation_kind TEXT NOT NULL CHECK (operation_kind IN ('Update', 'Archive')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Denied', 'Executed')),
    requester_user_id TEXT NOT NULL,
    entity_id TEXT NOT NULL, -- The policy ID being modified
    dfns_approval_id TEXT, -- Associated approval ID if approval required
    request_body JSONB NOT NULL, -- The full request body
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dfns_policies_dfns_id ON dfns_policies(dfns_policy_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policies_status ON dfns_policies(status);
CREATE INDEX IF NOT EXISTS idx_dfns_policies_activity_kind ON dfns_policies(activity_kind);
CREATE INDEX IF NOT EXISTS idx_dfns_policies_org ON dfns_policies(organization_id);

CREATE INDEX IF NOT EXISTS idx_dfns_policy_approval_groups_policy ON dfns_policy_approval_groups(policy_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approval_groups_dfns_policy ON dfns_policy_approval_groups(dfns_policy_id);

CREATE INDEX IF NOT EXISTS idx_dfns_policy_evaluations_policy ON dfns_policy_evaluations(dfns_policy_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_evaluations_activity ON dfns_policy_evaluations(activity_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_evaluations_trigger_status ON dfns_policy_evaluations(trigger_status);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_evaluations_timestamp ON dfns_policy_evaluations(evaluation_timestamp);

CREATE INDEX IF NOT EXISTS idx_dfns_policy_approvals_dfns_id ON dfns_policy_approvals(dfns_approval_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approvals_status ON dfns_policy_approvals(status);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approvals_activity ON dfns_policy_approvals(activity_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approvals_org ON dfns_policy_approvals(organization_id);

CREATE INDEX IF NOT EXISTS idx_dfns_policy_approval_decisions_approval ON dfns_policy_approval_decisions(approval_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approval_decisions_dfns_approval ON dfns_policy_approval_decisions(dfns_approval_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_approval_decisions_user ON dfns_policy_approval_decisions(user_id);

CREATE INDEX IF NOT EXISTS idx_dfns_policy_change_requests_dfns_id ON dfns_policy_change_requests(dfns_change_request_id);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_change_requests_status ON dfns_policy_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_dfns_policy_change_requests_entity ON dfns_policy_change_requests(entity_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_dfns_policies_updated_at 
    BEFORE UPDATE ON dfns_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dfns_policy_approval_groups_updated_at 
    BEFORE UPDATE ON dfns_policy_approval_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dfns_policy_approvals_updated_at 
    BEFORE UPDATE ON dfns_policy_approvals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dfns_policy_change_requests_updated_at 
    BEFORE UPDATE ON dfns_policy_change_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE dfns_policies IS 'DFNS Policy Engine policies with rules, actions, and filters';
COMMENT ON TABLE dfns_policy_approval_groups IS 'Approval groups for RequestApproval policy actions';
COMMENT ON TABLE dfns_policy_evaluations IS 'History of policy evaluations and triggers';
COMMENT ON TABLE dfns_policy_approvals IS 'DFNS approval processes (enhanced from existing table)';
COMMENT ON TABLE dfns_policy_approval_decisions IS 'Individual approval/denial decisions by users';
COMMENT ON TABLE dfns_policy_change_requests IS 'Policy modification requests requiring approval';

-- Grant permissions (adjust as needed)
-- GRANT ALL ON dfns_policies TO authenticated;
-- GRANT ALL ON dfns_policy_approval_groups TO authenticated;
-- GRANT ALL ON dfns_policy_evaluations TO authenticated;
-- GRANT ALL ON dfns_policy_approvals TO authenticated;
-- GRANT ALL ON dfns_policy_approval_decisions TO authenticated;
-- GRANT ALL ON dfns_policy_change_requests TO authenticated;