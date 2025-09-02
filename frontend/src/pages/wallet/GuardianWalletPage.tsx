import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Shield, Wallet as WalletIcon, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { GuardianWalletCreation } from '@/components/wallet/components/guardian/GuardianWalletCreation';
import { GuardianWalletList } from '@/components/wallet/components/guardian/GuardianWalletList';
import { useUser } from '@/hooks/auth/user/useUser';
import { useToast } from '@/components/ui/use-toast';
import { GuardianWalletService } from '@/services/guardian/GuardianWalletService';
import type { Wallet } from '@/types/core/centralModels';
import type { GuardianWalletExtension } from '@/types/guardian/guardian';

const GuardianWalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [currentWallets, setCurrentWallets] = useState<(Wallet & GuardianWalletExtension)[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const maxWallets = 50;
  const guardianWalletService = new GuardianWalletService();

  useEffect(() => {
    loadCurrentWallets();
  }, [user]);

  const loadCurrentWallets = async () => {
    if (!user) return;
    
    try {
      setWalletsLoading(true);
      const wallets = await guardianWalletService.listWallets();
      // Filter by current user
      const userWallets = wallets.filter(wallet => wallet.userId === user.id);
      setCurrentWallets(userWallets);
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setWalletsLoading(false);
    }
  };

  const handleWalletCreated = (wallet: Wallet & GuardianWalletExtension) => {
    setCurrentWallets(prev => [...prev, wallet]);
    setShowCreateForm(false);
    
    toast({
      title: "Guardian Wallet Created",
      description: `${wallet.name} has been created successfully`,
    });
    
    // Refresh the wallet list to get latest data
    setTimeout(loadCurrentWallets, 1000);
  };

  const handleWalletSelect = (wallet: Wallet & GuardianWalletExtension) => {
    // Navigate to wallet details or dashboard
    navigate(`/wallet/dashboard?tab=wallets&selected=${wallet.id}`);
  };

  const handleBackToDashboard = () => {
    navigate('/wallet/dashboard');
  };

  const getFeatureList = () => [
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "Institutional Security",
      description: "Enterprise-grade security with advanced key management and policy controls"
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: "Compliance Ready",
      description: "Built-in compliance features for institutional and regulatory requirements"
    },
    {
      icon: <WalletIcon className="h-5 w-5 text-purple-600" />,
      title: "Multi-Network Support",
      description: "Support for multiple blockchains including Ethereum and Polygon"
    }
  ];

  const canCreateWallet = currentWallets.length < maxWallets;
  const isNearLimit = currentWallets.length >= (maxWallets * 0.8);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please sign in to create Guardian wallets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Guardian Wallets
          </h1>
          <p className="text-muted-foreground mt-1">
            Institutional-grade wallet management powered by Guardian
          </p>
        </div>
      </div>

      {/* Wallet Limit Alert */}
      {isNearLimit && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            You have {currentWallets.length} of {maxWallets} Guardian wallets. 
            {!canCreateWallet ? " You've reached the maximum limit." : " You're approaching the limit."}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Guardian wallets provide enterprise-grade security and compliance features. 
          Creation may take a few moments as wallets are processed asynchronously.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wallet Creation or List */}
        <div className="lg:col-span-2">
          {showCreateForm ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Create New Guardian Wallet</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
              <GuardianWalletCreation
                onWalletCreated={handleWalletCreated}
                onCancel={() => setShowCreateForm(false)}
                maxWallets={maxWallets}
                currentWalletCount={currentWallets.length}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Guardian Wallets</h2>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  disabled={!canCreateWallet}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Create Guardian Wallet
                </Button>
              </div>
              
              <GuardianWalletList
                onWalletSelect={handleWalletSelect}
                userId={user.id}
                maxWallets={maxWallets}
              />
            </div>
          )}
        </div>

        {/* Right Column - Features and Info */}
        <div className="space-y-6">
          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>Guardian Features</CardTitle>
              <CardDescription>
                Why choose Guardian for institutional wallet management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getFeatureList().map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  {feature.icon}
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Wallet Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Wallets</span>
                <span className="font-medium">{currentWallets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Slots</span>
                <span className="font-medium">{maxWallets - currentWallets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Wallets</span>
                <span className="font-medium">
                  {currentWallets.filter(w => w.guardianMetadata?.status === 'active' || w.guardianMetadata?.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium">
                  {currentWallets.filter(w => w.guardianMetadata?.status === 'pending').length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Guardian wallets are managed by institutional-grade infrastructure. 
                If you need assistance or have questions about your wallets, please contact support.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuardianWalletPage;
