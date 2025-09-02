import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User,
  Mail,
  Building,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';
import { cn } from '@/utils/shared/utils';

interface InvestorInfo {
  id: string;
  name: string;
  email: string;
  company?: string;
  walletAddress: string;
  kycStatus: 'approved' | 'pending' | 'rejected';
  accreditationStatus: 'verified' | 'pending' | 'unverified';
  investorType: 'individual' | 'institutional';
  joinDate: string;
  totalInvestment: number;
  availableTokens: number;
  investmentHistory: Array<{
    subscriptionId: string;
    amount: number;
    date: string;
    status: 'active' | 'redeemed';
  }>;
}

interface RedemptionRequestDetailsInvestorProps {
  investor: InvestorInfo;
  redemptionAmount: number;
  tokenSymbol: string;
  redemptionValue: number;
  onContactInvestor?: () => void;
  onViewInvestorProfile?: () => void;
  className?: string;
}

export const RedemptionRequestDetailsInvestor: React.FC<RedemptionRequestDetailsInvestorProps> = ({
  investor,
  redemptionAmount,
  tokenSymbol,
  redemptionValue,
  onContactInvestor,
  onViewInvestorProfile,
  className
}) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status color and icon
  const getKycStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      case 'pending':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
      case 'rejected':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Shield };
    }
  };

  const getAccreditationStatusDisplay = (status: string) => {
    switch (status) {
      case 'verified':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      case 'pending':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
      case 'unverified':
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Shield };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Shield };
    }
  };

  const kycDisplay = getKycStatusDisplay(investor.kycStatus);
  const accreditationDisplay = getAccreditationStatusDisplay(investor.accreditationStatus);
  const KycIcon = kycDisplay.icon;
  const AccreditationIcon = accreditationDisplay.icon;

  // Calculate redemption percentage
  const redemptionPercentage = investor.availableTokens > 0 
    ? Math.round((redemptionAmount / investor.availableTokens) * 100) 
    : 0;

  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Investor Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">{investor.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {investor.investorType === 'individual' ? 'Individual Investor' : 'Institutional Investor'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{investor.email}</span>
            </div>
            
            {investor.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{investor.company}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Investor since {new Date(investor.joinDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Wallet Address</p>
                <p className="text-sm font-mono">
                  {investor.walletAddress.slice(0, 6)}...{investor.walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <KycIcon className={cn("h-4 w-4", kycDisplay.color)} />
              <div>
                <p className="text-xs text-muted-foreground">KYC Status</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", kycDisplay.color, kycDisplay.bg)}
                >
                  {investor.kycStatus.charAt(0).toUpperCase() + investor.kycStatus.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AccreditationIcon className={cn("h-4 w-4", accreditationDisplay.color)} />
              <div>
                <p className="text-xs text-muted-foreground">Accreditation</p>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", accreditationDisplay.color, accreditationDisplay.bg)}
                >
                  {investor.accreditationStatus.charAt(0).toUpperCase() + investor.accreditationStatus.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Summary */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Investment Summary
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold text-primary">
                {formatCurrency(investor.totalInvestment)}
              </div>
              <div className="text-xs text-muted-foreground">Total Invested</div>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold">
                {investor.availableTokens.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Available Tokens</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {redemptionAmount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Redeeming</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {redemptionPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">of Holdings</div>
            </div>
          </div>
        </div>

        {/* Redemption Details */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Redemption Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Tokens to Redeem</p>
              <p className="text-lg font-semibold">
                {redemptionAmount.toLocaleString()} {tokenSymbol}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">USDC Value</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(redemptionValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Investment History Preview */}
        {investor.investmentHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Investments
            </h4>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {investor.investmentHistory.slice(0, 3).map((investment) => (
                <div key={investment.subscriptionId} className="flex justify-between items-center p-2 bg-muted/20 rounded">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(investment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(investment.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    variant={investment.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {investment.status}
                  </Badge>
                </div>
              ))}
              
              {investor.investmentHistory.length > 3 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{investor.investmentHistory.length - 3} more investments
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4 flex gap-3">
          {onViewInvestorProfile && (
            <Button variant="outline" className="flex-1" onClick={onViewInvestorProfile}>
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          )}
          
          {onContactInvestor && (
            <Button variant="outline" className="flex-1" onClick={onContactInvestor}>
              <Mail className="h-4 w-4 mr-2" />
              Contact
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RedemptionRequestDetailsInvestor;