import React, { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Edit,
  Calculator,
  Download,
  FileText,
  TrendingUp,
  Calendar,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useBond } from '@/hooks/bonds/useBondData'
import { CouponPaymentBuilder } from '../data-input/coupon-payment-builder'
import { MarketPriceManager } from '../data-input/market-price-manager'

interface BondDetailViewProps {
  bondId: string
  onBack?: () => void
  onEdit?: (bondId: string) => void
  onCalculate?: (bondId: string) => void
}

export function BondDetailView({
  bondId,
  onBack,
  onEdit,
  onCalculate,
}: BondDetailViewProps) {
  const { data: bondResponse, isLoading } = useBond(bondId)
  const [activeTab, setActiveTab] = useState('overview')

  if (isLoading) {
    return <div className="p-8">Loading bond details...</div>
  }

  if (!bondResponse?.data) {
    return <div className="p-8">Bond not found</div>
  }

  const bond = bondResponse.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {bond.asset_name || bond.isin || bond.cusip}
            </h1>
            <p className="text-sm text-muted-foreground">{bond.issuer_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit?.(bondId)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={() => onCalculate?.(bondId)}>
            <Calculator className="mr-2 h-4 w-4" />
            Calculate NAV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bond Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bond Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bond Type</span>
              <span className="font-medium capitalize">{bond.bond_type}</span>
            </div>
            {bond.isin && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ISIN</span>
                <span className="font-mono">{bond.isin}</span>
              </div>
            )}
            {bond.cusip && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CUSIP</span>
                <span className="font-mono">{bond.cusip}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Par Value</span>
              <span className="font-medium">
                {bond.currency} {(bond.par_value || bond.face_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coupon Rate</span>
              <span className="font-medium">{(bond.coupon_rate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Frequency</span>
              <span className="font-medium">{bond.coupon_frequency}x/year</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{format(new Date(bond.issue_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Maturity Date</span>
              <span>{format(new Date(bond.maturity_date), 'MMM dd, yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Classification & Features Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classification & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accounting Treatment</span>
              <Badge
                variant={
                  bond.accounting_treatment === 'held_to_maturity'
                    ? 'default'
                    : bond.accounting_treatment === 'available_for_sale'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {bond.accounting_treatment === 'held_to_maturity' && 'Held to Maturity'}
                {bond.accounting_treatment === 'available_for_sale' && 'Available for Sale'}
                {bond.accounting_treatment === 'trading' && 'Trading'}
              </Badge>
            </div>
            {bond.seniority && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seniority</span>
                <span className="capitalize">{bond.seniority.replace('_', ' ')}</span>
              </div>
            )}
            {bond.credit_rating && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credit Rating</span>
                <Badge variant="outline">{bond.credit_rating}</Badge>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium">Features</div>
              <div className="flex flex-wrap gap-2">
                {bond.callable && (
                  <Badge variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    Callable
                  </Badge>
                )}
                {bond.puttable && (
                  <Badge variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    Puttable
                  </Badge>
                )}
                {bond.convertible && (
                  <Badge variant="secondary">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Convertible
                  </Badge>
                )}
                {!bond.callable && !bond.puttable && !bond.convertible && (
                  <span className="text-sm text-muted-foreground">Standard Features</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Day Count Convention</span>
              <span className="font-medium">{bond.day_count_convention}</span>
            </div>
            {bond.purchase_price && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span className="font-medium">
                    {bond.currency} {bond.purchase_price.toLocaleString()}
                  </span>
                </div>
                {bond.purchase_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchase Date</span>
                    <span>{format(new Date(bond.purchase_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </>
            )}
            {bond.current_price && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-medium">
                  {bond.currency} {bond.current_price.toLocaleString()}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(bond.created_at), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{format(new Date(bond.updated_at), 'MMM dd, yyyy')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Supporting Data */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">
                <FileText className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="coupon-payments">
                <Calendar className="mr-2 h-4 w-4" />
                Coupon Payments
              </TabsTrigger>
              <TabsTrigger value="market-prices">
                <TrendingUp className="mr-2 h-4 w-4" />
                Market Prices
              </TabsTrigger>
              <TabsTrigger value="call-put">
                <Shield className="mr-2 h-4 w-4" />
                Call/Put Schedule
              </TabsTrigger>
              <TabsTrigger value="events">
                <AlertCircle className="mr-2 h-4 w-4" />
                Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Complete Bond Information</CardTitle>
                  <CardDescription>
                    All fields and metadata for this bond
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Identifiers</h3>
                      {bond.isin && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ISIN</span>
                          <span className="font-mono">{bond.isin}</span>
                        </div>
                      )}
                      {bond.cusip && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CUSIP</span>
                          <span className="font-mono">{bond.cusip}</span>
                        </div>
                      )}
                      {bond.sedol && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SEDOL</span>
                          <span className="font-mono">{bond.sedol}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Additional Information</h3>
                      {bond.issuer_type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Issuer Type</span>
                          <span className="capitalize">{bond.issuer_type.replace('_', ' ')}</span>
                        </div>
                      )}
                      {bond.seniority && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Seniority Level</span>
                          <span className="capitalize">{bond.seniority.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupon-payments">
              <CouponPaymentBuilder
                bondId={bondId}
                characteristics={{
                  faceValue: bond.par_value,
                  couponRate: bond.coupon_rate,
                  paymentFrequency: parseInt(bond.coupon_frequency || '2') as 2 | 4 | 12,
                  issueDate: new Date(bond.issue_date),
                  maturityDate: new Date(bond.maturity_date),
                }}
              />
            </TabsContent>

            <TabsContent value="market-prices">
              <MarketPriceManager bondId={bondId} />
            </TabsContent>

            <TabsContent value="call-put">
              <Card>
                <CardHeader>
                  <CardTitle>Call/Put Schedule</CardTitle>
                  <CardDescription>
                    Call and put option schedules for this bond
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground text-center py-8">
                    {bond.callable || bond.puttable
                      ? 'Call/Put schedule management coming soon'
                      : 'This bond has no call or put options'}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>Bond Events</CardTitle>
                  <CardDescription>
                    Corporate actions and material events affecting this bond
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No events recorded for this bond
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
