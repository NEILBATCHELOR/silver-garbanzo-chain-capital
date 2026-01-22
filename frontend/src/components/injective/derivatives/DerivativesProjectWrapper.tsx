/**
 * Derivatives Project Wrapper
 * Integrates Derivatives functionality with Chain Capital's project/organization hierarchy
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Derivatives components
import { DerivativesDashboard } from './DerivativesDashboard';
import { PositionManager } from './PositionManager';
import { MarketLaunchForm } from './MarketLaunchForm';
import { OrdersTab } from './OrdersTab';
import { HistoryTab } from './HistoryTab';

// Shared components
import { DerivativesNavigation, DerivativesDashboardHeader } from './shared';

interface Project {
  id: string;
  name: string;
  organization_id?: string;
}

export function DerivativesProjectWrapper() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'mainnet' | 'testnet' | 'devnet'>('testnet');
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (projectId && projectId !== 'undefined') {
        const project = await fetchProject(projectId);
        if (project) {
          setCurrentProject(project);
        } else {
          setError('Project not found');
          toast({
            title: 'Project Not Found',
            description: 'The requested project could not be found',
            variant: 'destructive',
          });
        }
      } else {
        const project = await getPrimaryOrFirstProject();
        if (project) {
          setCurrentProject(project as Project);
          navigate(`/projects/${project.id}/injective/derivatives`, { replace: true });
        } else {
          setError('No projects available');
          toast({
            title: 'No Projects',
            description: 'Please create a project to use Derivatives features',
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      console.error('Error loading project:', err);
      setError(err.message || 'Failed to load project');
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProject = async (id: string): Promise<Project | null> => {
    const { supabase } = await import('@/infrastructure/database/client');

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }

    return data;
  };

  const handleRefresh = () => {
    loadProject();
  };

  const handleNetworkChange = (newNetwork: 'mainnet' | 'testnet' | 'devnet') => {
    setNetwork(newNetwork);
    toast({
      title: 'Network Changed',
      description: `Switched to ${newNetwork}`,
    });
  };

  const handleLaunchMarket = () => {
    navigate(`/projects/${projectId}/injective/derivatives/launch`);
  };

  const handleOpenPosition = () => {
    navigate(`/projects/${projectId}/injective/derivatives/position`);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mb-4 mx-auto text-primary" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-destructive" />
              Unable to Load Derivatives
            </CardTitle>
            <CardDescription>{error || 'No project selected'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Project Required</AlertTitle>
              <AlertDescription>
                Derivatives features require a project context. Please select a project or
                create one to continue.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => navigate('/projects')} variant="default">
                Go to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4">
        <DerivativesDashboardHeader
          projectId={currentProject.id}
          projectName={currentProject.name}
          network={network}
          onNetworkChange={handleNetworkChange}
          walletAddress={walletAddress}
          onRefresh={handleRefresh}
          onLaunchMarket={handleLaunchMarket}
          onOpenPosition={handleOpenPosition}
          refreshing={isLoading}
        />
      </div>

      {/* Horizontal Navigation */}
      <DerivativesNavigation
        projectId={currentProject.id}
        walletConnected={!!walletAddress}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route
            index
            element={<DerivativesDashboard projectId={currentProject.id} />}
          />
          <Route
            path="launch"
            element={
              <MarketLaunchForm
                projectId={currentProject.id}
                onSuccess={() =>
                  navigate(`/projects/${currentProject.id}/injective/derivatives`)
                }
              />
            }
          />
          <Route
            path="position"
            element={
              <PositionManager
                projectId={currentProject.id}
                onSuccess={() =>
                  navigate(`/projects/${currentProject.id}/injective/derivatives`)
                }
              />
            }
          />
          <Route
            path="orders"
            element={
              <OrdersTab
                projectId={currentProject.id}
                userAddress={walletAddress || ''}
              />
            }
          />
          <Route
            path="history"
            element={
              <HistoryTab
                projectId={currentProject.id}
                userAddress={walletAddress || ''}
              />
            }
          />
          <Route
            path="analytics"
            element={
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>
                    Performance analytics and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Analytics dashboard coming soon...
                  </p>
                </CardContent>
              </Card>
            }
          />
          <Route
            path="settings"
            element={
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Trading preferences and configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Settings page coming soon...
                  </p>
                </CardContent>
              </Card>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default DerivativesProjectWrapper;
