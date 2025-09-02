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
  Settings
} from 'lucide-react';
import type { SidebarSection } from '@/types/sidebar';

export const ADDITIONAL_SIDEBAR_SECTIONS: SidebarSection[] = [
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
        href: '/wallet/dashboard',
        icon: LayoutDashboard,
        permissions: ['wallet.view']
      },
      {
        id: 'new-wallet',
        label: 'New Wallet',
        href: '/wallet/new',
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
        href: '/compliance/operations/investor/wallets',
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
        id: 'sidebar-configuration',
        label: 'Sidebar Configuration',
        href: '/admin/sidebar-configuration',
        icon: Settings,
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
