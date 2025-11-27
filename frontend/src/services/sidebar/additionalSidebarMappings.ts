import {
  LayoutDashboard,
  Plus,
  Shield,
  Building,
  Users,
  FileCog,
  User,
  Wallet,
  Scale,
  ChartCandlestick,
  UserCircle,
  FileText,
  UserRoundCog,
  Activity,
  Settings,
  Table,
  Hash,
  Equal,
  BarChart3,
  FileSpreadsheet,
  PanelLeft,
  Key,
  Webhook,
  Building2,
  CreditCard,
  TrendingUp,
  ArrowLeftRight,
  DollarSign,
  Factory,
  ReceiptText,
  Percent
} from 'lucide-react';
import type { SidebarSection } from '@/types/sidebar';

export const ADDITIONAL_SIDEBAR_SECTIONS: SidebarSection[] = [
  // PSP (PAYMENT SERVICE PROVIDER) SECTION
  {
    id: 'psp',
    title: 'PAYMENT HUB (WARP)',
    permissions: ['psp.view'],
    roles: ['Operations', 'Owner', 'Super Admin'],
    minRolePriority: 70,
    items: [
      {
        id: 'psp-dashboard',
        label: 'Dashboard',
        href: '/psp/dashboard',
        icon: LayoutDashboard,
        permissions: ['psp.view']
      },
      {
        id: 'psp-api-keys',
        label: 'API Keys',
        href: '/psp/api-keys',
        icon: Key,
        permissions: ['psp.api_keys.view']
      },
      {
        id: 'psp-webhooks',
        label: 'Webhooks',
        href: '/psp/webhooks',
        icon: Webhook,
        permissions: ['psp.webhooks.view']
      },
      {
        id: 'psp-identity',
        label: 'Identity Verification',
        href: '/psp/identity',
        icon: Building2,
        permissions: ['psp.identity.view']
      },
      {
        id: 'psp-accounts',
        label: 'Connected Accounts',
        href: '/psp/accounts',
        icon: CreditCard,
        permissions: ['psp.accounts.view']
      },
      {
        id: 'psp-payments',
        label: 'Payments',
        href: '/psp/payments',
        icon: ArrowLeftRight,
        permissions: ['psp.payments.view']
      },
      {
        id: 'psp-trades',
        label: 'Trades',
        href: '/psp/trades',
        icon: TrendingUp,
        permissions: ['psp.trades.view']
      },
      {
        id: 'psp-balances',
        label: 'Balances',
        href: '/psp/balances',
        icon: DollarSign,
        permissions: ['psp.balances.view']
      },
      {
        id: 'psp-spreads',
        label: 'Spreads Configuration',
        href: '/psp/spreads',
        icon: Percent,
        permissions: ['psp.settings.manage']
      },
      {
        id: 'psp-transactions',
        label: 'Transaction History',
        href: '/psp/transactions',
        icon: FileText,
        permissions: ['psp.transactions.view']
      },
      {
        id: 'psp-quotes',
        label: 'Quotes',
        href: '/psp/quotes',
        icon: FileSpreadsheet,
        permissions: ['psp.quotes.view']
      },
      {
        id: 'psp-reports',
        label: 'Reports',
        href: '/psp/reports',
        icon: BarChart3,
        permissions: ['psp.reports.view']
      },
      {
        id: 'psp-settings',
        label: 'Settings',
        href: '/psp/settings',
        icon: Settings,
        permissions: ['psp.settings.manage']
      }
    ]
  },

  // WALLET MANAGEMENT SECTION
  {
    id: 'wallet-management',
    title: 'WALLET MANAGEMENT',
    permissions: ['wallet.view'],
    roles: ['Agent', 'Operations', 'Owner', 'Super Admin'],
    minRolePriority: 60,
    items: [
      {
        id: 'wallet-dashboard',
        label: 'Wallet Dashboard',
        href: '/wallet/Internal',
        icon: LayoutDashboard,
        permissions: ['wallet.view']
      },
      {
        id: 'new-wallet',
        label: 'New Wallet',
        href: '/wallet/{projectId}/new',
        icon: Plus,
        permissions: ['wallet.create']
      },
      {
        id: 'dfns-custody',
        label: 'DFNS Custody',
        href: '/wallet/dfns',
        icon: Shield,
        permissions: ['wallet.view', 'custody.view']
      }
    ]
  },

  // COMPLIANCE SECTION
  {
    id: 'compliance',
    title: 'COMPLIANCE',
    permissions: ['compliance_kyc_kyb.view'],
    roles: ['Compliance Officer', 'Compliance Manager', 'Operations', 'Owner', 'Super Admin'],
    minRolePriority: 60,
    items: [
      {
        id: 'organization-management',
        label: 'Organization Management',
        href: '/compliance/management',
        icon: Building,
        permissions: ['user.view', 'user.edit', 'compliance_kyc_kyb.view']
      },
      {
        id: 'investor-management',
        label: 'Investor Management',
        href: '/compliance/management/investors',
        icon: Users,
        permissions: ['investor.view', 'investor.edit', 'compliance_kyc_kyb.view']
      },
      {
        id: 'upload-organizations',
        label: 'Upload Organizations',
        href: '/compliance/upload/issuer',
        icon: FileCog,
        permissions: ['user.bulk', 'user.create']
      },
      {
        id: 'upload-investors',
        label: 'Upload Investors',
        href: '/compliance/upload/investor',
        icon: User,
        permissions: ['investor.bulk', 'investor.create']
      },
      {
        id: 'wallet-operations',
        label: 'Wallet Operations',
        href: '/compliance/operations/investor/{projectId}/wallets',
        icon: Wallet,
        permissions: ['wallet.view', 'wallet.bulk', 'investor.view']
      },
      {
        id: 'compliance-rules',
        label: 'Compliance Rules',
        href: '/compliance/rules',
        icon: Scale,
        permissions: ['policy_rules.view', 'policy_rules.create']
      },
      {
        id: 'restrictions',
        label: 'Restrictions',
        href: '/compliance/restrictions',
        icon: Shield,
        permissions: ['policy_rules.view']
      }
    ]
  },

  // INVESTOR PORTAL SECTION
  {
    id: 'investor-portal',
    title: 'INVESTOR PORTAL',
    profileTypes: ['investor', 'service_provider'],
    roles: ['Investor', 'Service Provider'],
    permissions: ['investor_portal.view'],
    items: [
      {
        id: 'offerings',
        label: 'Offerings',
        href: '/offerings',
        icon: ChartCandlestick,
        permissions: ['offerings.view'],
        profileTypes: ['investor']
      },
      {
        id: 'investor-profile',
        label: 'Profile',
        href: '/compliance/portal/profile',
        icon: UserCircle,
        permissions: ['investor_portal.view', 'profile.view']
      },
      {
        id: 'investor-documents',
        label: 'Documents',
        href: '/compliance/portal/documents',
        icon: FileText,
        permissions: ['investor_portal.view', 'documents.view']
      }
    ]
  },

  // NAV ENGINE SECTION
  {
    id: 'nav-engine',
    title: 'NAV ENGINE',
    permissions: ['nav:view_dashboard'],
    roles: ['Operations', 'Owner', 'Super Admin', 'Compliance Manager'],
    minRolePriority: 70,
    items: [
      {
        id: 'nav-dashboard',
        label: 'Nav Dashboard',
        href: '/nav',
        icon: Table,
        permissions: ['nav:view_dashboard']
      }
    ]
  },

  // ADMINISTRATION SECTION
  {
    id: 'administration',
    title: 'ADMINISTRATION',
    roles: ['Owner', 'Super Admin'],
    minRolePriority: 90,
    permissions: ['system.audit', 'user.view'],
    items: [
      {
        id: 'roles',
        label: 'Roles',
        href: '/role-management',
        icon: UserRoundCog,
        permissions: ['user.assign_role', 'user.view'],
        roles: ['Owner', 'Super Admin']
      },
      {
        id: 'factory-templates',
        label: 'Factory Templates',
        href: 'admin/templates',
        icon: ReceiptText,
        permissions: ['system.configure'],
        roles: ['Super Admin'],
        minRolePriority: 100
      },
      {
        id: 'factory-config',
        label: 'Factory Contract Configuration',
        href: 'admin/factory-config',
        icon: Factory,
        permissions: ['system.configure'],
        roles: ['Super Admin'],
        minRolePriority: 100
      },
      {
        id: 'sidebar-configuration',
        label: 'Sidebar Configuration',
        href: '/admin/sidebar-configuration',
        icon: PanelLeft,
        permissions: ['system.configure'],
        roles: ['Super Admin'],
        minRolePriority: 100
      },
      {
        id: 'activity-monitor',
        label: 'Activity Monitor',
        href: '/activity',
        icon: Activity,
        permissions: ['system.audit'],
        roles: ['Owner', 'Super Admin']
      }
    ]
  }
];

// Combine all sections
export const COMPLETE_SIDEBAR_CONFIGURATION: SidebarSection[] = [
  ...ADDITIONAL_SIDEBAR_SECTIONS
];
