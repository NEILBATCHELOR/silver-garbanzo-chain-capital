import {
  BarChart3,
  Users,
  Layers,
  Home,
  PieChart,
  ShieldCheck,
  UserRoundCog,
  Scale,
  WalletCards,
  FileStackIcon,
  UserRoundPlus,
  Landmark,
  Activity,
  Wallet,
  KeyRound,
  Coins,
  LayoutDashboard,
  Fingerprint,
  CreditCard,
  Shield,
  FileText,
  Plus,
  CheckCircle,
  LogOut,
  FileCog,
  Building,
  Layout,
  CheckSquare,
  ShieldAlert,
  History,
  Settings,
  BarChart,
  Menu,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  DollarSign,
  UserCircle,
  Grid2x2Check,
  Combine,
  Blocks,
  User,
  ChartCandlestick,
  Factory,
  Zap,
  Gauge,
  Trophy,
  Leaf,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import type { SidebarSection } from '@/types/sidebar';

export const SIDEBAR_CONFIGURATION: SidebarSection[] = [
  // ONBOARDING SECTION
  {
    id: 'onboarding',
    title: 'ONBOARDING',
    permissions: ['compliance_kyc_kyb.view'],
    roles: ['Compliance Officer', 'Compliance Manager', 'Operations', 'Owner', 'Super Admin'],
    minRolePriority: 60,
    items: [
      {
        id: 'investor-onboarding',
        label: 'Investor Onboarding',
        href: '/compliance/investor-onboarding/registration',
        icon: UserRoundPlus,
        permissions: ['compliance_kyc_kyb.view', 'compliance_kyc_kyb.create', 'investor.create'],
        roles: ['Compliance Officer', 'Compliance Manager', 'Operations', 'Owner', 'Super Admin']
      },
      {
        id: 'issuer-onboarding',
        label: 'Issuer Onboarding',
        href: '/compliance/issuer/onboarding/registration',
        icon: Landmark,
        permissions: ['compliance_kyc_kyb.view', 'compliance_kyc_kyb.create', 'user.create'],
        roles: ['Compliance Officer', 'Compliance Manager', 'Operations', 'Owner', 'Super Admin']
      }
    ]
  },

  // OVERVIEW SECTION
  {
    id: 'overview',
    title: 'OVERVIEW',
    minRolePriority: 50, // Accessible to all roles
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        minRolePriority: 50
      },
      {
        id: 'projects',
        label: 'Projects',
        href: '/projects',
        icon: Layers,
        permissions: ['projects.view', 'project.view'],
        minRolePriority: 50
      }
    ]
  },

  // ISSUANCE SECTION
  {
    id: 'issuance',
    title: 'ISSUANCE',
    permissions: ['token_design.view', 'token_allocations.view'],
    roles: ['Agent', 'Operations', 'Owner', 'Super Admin'],
    minRolePriority: 60,
    items: [
      {
        id: 'token-management',
        label: 'Token Management',
        href: '/projects/{projectId}/tokens',
        icon: Blocks,
        permissions: ['token_design.view', 'token_lifecycle.view']
      },
      {
        id: 'cap-table',
        label: 'Cap Table',
        href: '/projects/{projectId}/captable/investors',
        icon: Grid2x2Check,
        permissions: ['token_allocations.view', 'investor.view']
      },
      {
        id: 'redemptions',
        label: 'Redemptions',
        href: '/redemption',
        icon: WalletCards,
        permissions: ['redemptions.view', 'redemptions.create']
      }
    ]
  },

  // FACTORING SECTION
  {
    id: 'factoring',
    title: 'FACTORING',
    permissions: ['invoice.view', 'tokenization.view'],
    roles: ['Operations', 'Owner', 'Super Admin'],
    minRolePriority: 70,
    items: [
      {
        id: 'factoring-dashboard',
        label: 'Factoring Dashboard',
        href: '/projects/{projectId}/factoring/dashboard',
        icon: LayoutDashboard,
        permissions: ['invoice.view', 'dashboard.view']
      },
      {
        id: 'invoices',
        label: 'Invoices',
        href: '/projects/{projectId}/factoring/invoices',
        icon: FileText,
        permissions: ['invoice.view', 'invoice.create']
      },
      {
        id: 'pools-tranches',
        label: 'Pools & Tranches',
        href: '/projects/{projectId}/factoring/pools',
        icon: Package,
        permissions: ['pool.view', 'tranche.view']
      },
      {
        id: 'tokenize-pools',
        label: 'Tokenize Pools',
        href: '/projects/{projectId}/factoring/tokenization',
        icon: Combine,
        permissions: ['tokenization.create', 'tokenization.view']
      },
      {
        id: 'factoring-distribution',
        label: 'Distribution',
        href: '/projects/{projectId}/factoring/distribution',
        icon: Users,
        permissions: ['distribution.view', 'transactions.bulk_distribute']
      }
    ]
  },

  // CLIMATE RECEIVABLES SECTION
  {
    id: 'climate-receivables',
    title: 'CLIMATE RECEIVABLES',
    permissions: ['energy_assets.view', 'carbon_offsets.view'],
    roles: ['Operations', 'Owner', 'Super Admin'],
    minRolePriority: 70,
    items: [
      {
        id: 'climate-dashboard',
        label: 'Climate Dashboard',
        href: '/projects/{projectId}/climate-receivables/dashboard',
        icon: LayoutDashboard,
        permissions: ['energy_assets.view', 'dashboard.view']
      },
      {
        id: 'energy-assets',
        label: 'Energy Assets',
        href: '/projects/{projectId}/climate-receivables/assets',
        icon: Factory,
        permissions: ['energy_assets.view', 'energy_assets.create']
      },
      {
        id: 'production-data',
        label: 'Production Data',
        href: '/projects/{projectId}/climate-receivables/production',
        icon: Zap,
        permissions: ['production_data.view']
      },
      {
        id: 'receivables',
        label: 'Receivables',
        href: '/projects/{projectId}/climate-receivables/receivables',
        icon: FileText,
        permissions: ['receivables.view', 'receivables.create']
      },
      {
        id: 'tokenization-pools',
        label: 'Tokenization Pools',
        href: '/projects/{projectId}/climate-receivables/pools',
        icon: Package,
        permissions: ['pool.view', 'tokenization.view']
      },
      {
        id: 'incentives',
        label: 'Incentives',
        href: '/projects/{projectId}/climate-receivables/incentives',
        icon: Trophy,
        permissions: ['incentives.view']
      },
      {
        id: 'carbon-offsets',
        label: 'Carbon Offsets',
        href: '/projects/{projectId}/climate-receivables/carbon-offsets',
        icon: Leaf,
        permissions: ['carbon_offsets.view']
      },
      {
        id: 'recs',
        label: 'RECs',
        href: '/projects/{projectId}/climate-receivables/recs',
        icon: Gauge,
        permissions: ['recs.view']
      },
      {
        id: 'climate-tokenization',
        label: 'Tokenization',
        href: '/projects/{projectId}/climate-receivables/tokenization',
        icon: Combine,
        permissions: ['tokenization.create', 'tokenization.view']
      },
      {
        id: 'climate-distribution',
        label: 'Distribution',
        href: '/projects/{projectId}/climate-receivables/distribution',
        icon: Users,
        permissions: ['distribution.view', 'transactions.bulk_distribute']
      },
      {
        id: 'climate-analytics',
        label: 'Analytics',
        href: '/projects/{projectId}/climate-receivables/visualizations',
        icon: TrendingUp,
        permissions: ['analytics.view', 'reports.view']
      }
    ]
  }
];

// Additional sections continued in next chunk...
