-- =====================================================
-- SIDEBAR PERMISSION MAPPING FIX
-- Issue: Configuration uses non-existent permissions
-- Fix: Map to existing permissions in role_permissions table
-- =====================================================

-- Clear existing configuration
DELETE FROM sidebar_configurations WHERE name = 'Super Admin Default';

-- Insert corrected configuration with proper permissions
INSERT INTO sidebar_configurations (
    name,
    description,
    target_role_ids,
    target_profile_type_enums,
    min_role_priority,
    configuration_data,
    is_active,
    is_default
) VALUES (
    'Super Admin Corrected',
    'Super Admin configuration with correct permissions',
    ARRAY['1ec843d1-2044-4d52-a5b9-1fbd79ca98d6']::uuid[],
    '{"super admin"}',
    50,
    '{
        "sections": [
            {
                "id": "section-onboarding",
                "title": "ONBOARDING",
                "isActive": true,
                "sectionId": "onboarding",
                "description": "ONBOARDING section",
                "displayOrder": 10,
                "minRolePriority": 60,
                "requiredRoleIds": [],
                "requiredPermissions": ["compliance_kyc_kyb.view"],
                "items": [
                    {
                        "id": "item-investor-onboarding",
                        "href": "/compliance/investor-onboarding/registration",
                        "icon": "Layout",
                        "label": "Investor Onboarding",
                        "itemId": "investor-onboarding",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "onboarding",
                        "description": "Investor Onboarding navigation item",
                        "displayOrder": 0,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["compliance_kyc_kyb.view", "compliance_kyc_kyb.create", "investor.create"]
                    },
                    {
                        "id": "item-issuer-onboarding",
                        "href": "/compliance/issuer/onboarding/registration",
                        "icon": "Layout",
                        "label": "Issuer Onboarding",
                        "itemId": "issuer-onboarding",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "onboarding",
                        "description": "Issuer Onboarding navigation item",
                        "displayOrder": 1,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["compliance_kyc_kyb.view", "compliance_kyc_kyb.create", "user.create"]
                    }
                ]
            },
            {
                "id": "section-overview",
                "title": "OVERVIEW",
                "isActive": true,
                "sectionId": "overview",
                "description": "OVERVIEW section",
                "displayOrder": 20,
                "minRolePriority": 50,
                "requiredRoleIds": [],
                "requiredPermissions": [],
                "items": [
                    {
                        "id": "item-dashboard",
                        "href": "/dashboard",
                        "icon": "Layout",
                        "label": "Dashboard",
                        "itemId": "dashboard",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "overview",
                        "description": "Dashboard navigation item",
                        "displayOrder": 0,
                        "minRolePriority": 50,
                        "requiredRoleIds": [],
                        "requiredPermissions": []
                    },
                    {
                        "id": "item-projects",
                        "href": "/projects",
                        "icon": "Layout",
                        "label": "Projects",
                        "itemId": "projects",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "overview",
                        "description": "Projects navigation item",
                        "displayOrder": 1,
                        "minRolePriority": 50,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["projects.view", "project.view"]
                    }
                ]
            },
            {
                "id": "section-issuance",
                "title": "ISSUANCE",
                "isActive": true,
                "sectionId": "issuance",
                "description": "ISSUANCE section",
                "displayOrder": 30,
                "minRolePriority": 60,
                "requiredRoleIds": [],
                "requiredPermissions": ["token_design.view", "token_allocations.view"],
                "items": [
                    {
                        "id": "item-token-management",
                        "href": "/projects/{projectId}/tokens",
                        "icon": "Layout",
                        "label": "Token Management",
                        "itemId": "token-management",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "issuance",
                        "description": "Token Management navigation item",
                        "displayOrder": 0,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["token_design.view", "token_lifecycle.view"]
                    },
                    {
                        "id": "item-cap-table",
                        "href": "/projects/{projectId}/captable/investors",
                        "icon": "Layout",
                        "label": "Cap Table",
                        "itemId": "cap-table",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "issuance",
                        "description": "Cap Table navigation item",
                        "displayOrder": 1,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["token_allocations.view", "investor.view"]
                    },
                    {
                        "id": "item-redemptions",
                        "href": "/redemption",
                        "icon": "Layout",
                        "label": "Redemptions",
                        "itemId": "redemptions",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "issuance",
                        "description": "Redemptions navigation item",
                        "displayOrder": 2,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["redemptions.view", "redemptions.create"]
                    }
                ]
            },
            {
                "id": "section-factoring",
                "title": "FACTORING",
                "isActive": true,
                "sectionId": "factoring",
                "description": "FACTORING section",
                "displayOrder": 40,
                "minRolePriority": 50,
                "requiredRoleIds": [],
                "requiredPermissions": [],
                "items": [
                    {
                        "id": "item-factoring-dashboard",
                        "href": "/projects/{projectId}/factoring/dashboard",
                        "icon": "Layout",
                        "label": "Factoring Dashboard",
                        "itemId": "factoring-dashboard",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "factoring",
                        "description": "Factoring Dashboard navigation item",
                        "displayOrder": 0,
                        "requiredRoleIds": [],
                        "requiredPermissions": []
                    },
                    {
                        "id": "item-invoices",
                        "href": "/projects/{projectId}/factoring/invoices",
                        "icon": "Layout",
                        "label": "Invoices",
                        "itemId": "invoices",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "factoring",
                        "description": "Invoices navigation item",
                        "displayOrder": 1,
                        "requiredRoleIds": [],
                        "requiredPermissions": []
                    },
                    {
                        "id": "item-pools-tranches",
                        "href": "/projects/{projectId}/factoring/pools",
                        "icon": "Layout",
                        "label": "Pools & Tranches",
                        "itemId": "pools-tranches",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "factoring",
                        "description": "Pools & Tranches navigation item",
                        "displayOrder": 2,
                        "requiredRoleIds": [],
                        "requiredPermissions": []
                    },
                    {
                        "id": "item-tokenize-pools",
                        "href": "/projects/{projectId}/factoring/tokenization",
                        "icon": "Layout",
                        "label": "Tokenize Pools",
                        "itemId": "tokenize-pools",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "factoring",
                        "description": "Tokenize Pools navigation item",
                        "displayOrder": 3,
                        "requiredRoleIds": [],
                        "requiredPermissions": []
                    },
                    {
                        "id": "item-factoring-distribution",
                        "href": "/projects/{projectId}/factoring/distribution",
                        "icon": "Layout",
                        "label": "Distribution",
                        "itemId": "factoring-distribution",
                        "isActive": true,
                        "isVisible": true,
                        "sectionId": "factoring",
                        "description": "Distribution navigation item",
                        "displayOrder": 4,
                        "requiredRoleIds": [],
                        "requiredPermissions": ["transactions.bulk_distribute", "transactions.view"]
                    }
                ]
            }
        ]
    }',
    true,
    true
);

-- Verify the corrected configuration
SELECT name, description, is_active, is_default 
FROM sidebar_configurations 
WHERE name = 'Super Admin Corrected';
