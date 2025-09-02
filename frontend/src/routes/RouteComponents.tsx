// src/routes/RouteComponents.tsx
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '../components/ui/loading-spinner'

// Lazy load existing pages
const WalletDemoPage = lazy(() => import('../pages/WalletDemoPage'))
const OfferingsPage = lazy(() => import('../pages/OfferingsPage'))
const ApproverPortalPage = lazy(() => import('../pages/ApproverPortalPage'))
const NotificationSettingsPage = lazy(() => import('../pages/NotificationSettingsPage'))

// Loading wrapper component
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
)

// Export wrapped components for existing pages
export const LazyWalletDemoPage = () => (
  <PageWrapper>
    <WalletDemoPage />
  </PageWrapper>
)

export const LazyOfferingsPage = () => (
  <PageWrapper>
    <OfferingsPage />
  </PageWrapper>
)

export const LazyApproverPortalPage = () => (
  <PageWrapper>
    <ApproverPortalPage onBack={() => window.history.back()} />
  </PageWrapper>
)

export const LazyNotificationSettingsPage = () => (
  <PageWrapper>
    <NotificationSettingsPage onBack={() => window.history.back()} />
  </PageWrapper>
)

// Placeholder components for missing pages (to prevent TypeScript errors)
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600">This page is under development</p>
    </div>
  </div>
)

export const LazyInvestorsPage = () => (
  <PageWrapper>
    <PlaceholderPage title="Investors" />
  </PageWrapper>
)

export const LazyTokensPage = () => (
  <PageWrapper>
    <PlaceholderPage title="Tokens" />
  </PageWrapper>
)

export const LazyCompliancePage = () => (
  <PageWrapper>
    <PlaceholderPage title="Compliance" />
  </PageWrapper>
)

export const LazyCapTablePage = () => (
  <PageWrapper>
    <PlaceholderPage title="Cap Table" />
  </PageWrapper>
)

export const LazyReportsPage = () => (
  <PageWrapper>
    <PlaceholderPage title="Reports" />
  </PageWrapper>
)

export const LazyRulesPage = () => (
  <PageWrapper>
    <PlaceholderPage title="Rules" />
  </PageWrapper>
)

export const LazyDashboardPage = () => (
  <PageWrapper>
    <PlaceholderPage title="Dashboard" />
  </PageWrapper>
)
