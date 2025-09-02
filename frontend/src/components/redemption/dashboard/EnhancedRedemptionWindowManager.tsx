/**
 * Enhanced Redemption Window Manager
 * Supports both fixed dates and relative dates tied to token issuance/distribution
 * Date: August 26, 2025
 * FIXED: Eye and Edit icon functionality, transaction_start_date integration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Calendar,
  Clock,
  Edit,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Settings,
  Timer,
  ArrowLeft,
  Users,
  DollarSign
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Import enhanced types
import type { RedemptionWindow, SubmissionDateMode, ProcessingDateMode } from '../types/redemption';

interface WindowFormData {
  name: string;
  
  // Date Configuration
  submission_date_mode: SubmissionDateMode;
  processing_date_mode: ProcessingDateMode;
  
  // Relative Date Settings
  lockup_days: number;
  processing_offset_days: number;
  
  // Fixed Date Settings
  submission_start_date: string;
  submission_end_date: string;
  start_date: string;
  end_date: string;
  
  // Financial Settings (Enhanced)
  nav: number;
  nav_source: string;
  max_redemption_amount: number;
  min_redemption_amount: number;
  
  // Enhanced Processing Options
  enable_pro_rata_distribution: boolean;
  auto_process: boolean;
  is_active: boolean;
  pro_rata_factor: number;
  processing_fee_percentage: number;
  early_redemption_penalty: number;
  
  // Status Settings  
  submission_status: 'not_started' | 'open' | 'closed' | 'extended' | 'cancelled';
  processing_status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  notes: string;
}

interface Props {
  projectId: string;
  onWindowCreated?: (window: RedemptionWindow) => void;
  onWindowUpdated?: (window: RedemptionWindow) => void;
}

interface ProjectInfo {
  id: string;
  name: string;
  transaction_start_date: string | null;
}

export const EnhancedRedemptionWindowManager: React.FC<Props> = ({
  projectId,
  onWindowCreated,
  onWindowUpdated
}) => {
  const [windows, setWindows] = useState<RedemptionWindow[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingWindow, setEditingWindow] = useState<RedemptionWindow | null>(null);
  const [viewingWindow, setViewingWindow] = useState<RedemptionWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const [formData, setFormData] = useState<WindowFormData>({
    name: '',
    submission_date_mode: 'fixed',
    processing_date_mode: 'offset',
    lockup_days: 90,
    processing_offset_days: 1,
    submission_start_date: '',
    submission_end_date: '',
    start_date: '',
    end_date: '',
    // Financial Settings (Enhanced)
    nav: 0,
    nav_source: 'manual',
    max_redemption_amount: 0,
    min_redemption_amount: 0,
    // Enhanced Processing Options
    enable_pro_rata_distribution: true,
    auto_process: false,
    is_active: true,
    pro_rata_factor: 1.0,
    processing_fee_percentage: 0.0,
    early_redemption_penalty: 0.0,
    // Status Settings
    submission_status: 'not_started',
    processing_status: 'pending',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadProjectInfo(),
        loadWindows()
      ]);
    } catch (error) {
      let errorMessage = 'Failed to load redemption data';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      setError(errorMessage);
      console.error('Error loading redemption data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectInfo = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, transaction_start_date')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error loading project info:', error);
        return;
      }

      setProjectInfo(data);
    } catch (error) {
      console.error('Error loading project info:', error);
    }
  };

  const loadWindows = async () => {
    try {
      // Import enhanced redemption service
      const { enhancedRedemptionService } = await import('../services/enhancedRedemptionService');
      
      const result = await enhancedRedemptionService.getRedemptionWindows({
        projectId: projectId
      });
      
      if (result.success && result.data) {
        // Debug: Log what the service returned
        console.log('Raw redemption window data from service:', result.data);
        
        // Map the data to match component interface with safe defaults
        const mappedWindows = result.data.map(window => ({
          ...window,
          project_id: projectId,
          submission_date_mode: window.submission_date_mode || 'fixed',
          processing_date_mode: window.processing_date_mode || 'offset',
          lockup_days: window.lockup_days || 0,
          processing_offset_days: window.processing_offset_days || 1,
          // Use the statistics fields directly from the service (don't re-map)
          total_requests: window.total_requests || 0,
          processed_requests: window.processed_requests || 0,
          total_request_value: window.total_request_value || 0,
          // Enhanced options with safe defaults
          enable_pro_rata_distribution: window.enable_pro_rata_distribution ?? true,
          auto_process: window.auto_process ?? false
        }));
        
        // Debug: Log the final mapped data
        console.log('Mapped redemption windows for display:', mappedWindows);
        console.log('Window statistics:', mappedWindows.map(w => ({
          name: w.name,
          total_requests: w.total_requests,
          processed_requests: w.processed_requests,
          total_value: w.total_request_value
        })));
        
        setWindows(mappedWindows);
      } else {
        const errorMessage = result.error || 'Unknown error loading windows';
        console.warn('Failed to load redemption windows:', errorMessage);
        setError(`Failed to load redemption windows: ${errorMessage}`);
        setWindows([]);
      }
    } catch (error) {
      let errorMessage = 'Failed to load windows';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      console.error('Error loading windows:', error);
      setError(`Error loading windows: ${errorMessage}`);
      setWindows([]);
    }
  };

  // NEW: Populate form data when editing a window
  const handleEditWindow = (window: RedemptionWindow) => {
    // Calculate dates for form population
    const submissionStartDate = window.submission_start_date 
      ? new Date(window.submission_start_date).toISOString().slice(0, 16)
      : '';
    const submissionEndDate = window.submission_end_date
      ? new Date(window.submission_end_date).toISOString().slice(0, 16)
      : '';
    const startDate = window.start_date
      ? new Date(window.start_date).toISOString().slice(0, 16)
      : '';
    const endDate = window.end_date
      ? new Date(window.end_date).toISOString().slice(0, 16)
      : '';

    // Populate form with existing window data
    setFormData({
      name: window.name || '',
      submission_date_mode: window.submission_date_mode || 'fixed',
      processing_date_mode: window.processing_date_mode || 'offset',
      lockup_days: window.lockup_days || 90,
      processing_offset_days: window.processing_offset_days || 1,
      submission_start_date: submissionStartDate,
      submission_end_date: submissionEndDate,
      start_date: startDate,
      end_date: endDate,
      nav: window.nav ? Number(window.nav) : 0,
      nav_source: window.nav_source || 'manual',
      max_redemption_amount: window.max_redemption_amount ? Number(window.max_redemption_amount) : 0,
      min_redemption_amount: window.min_redemption_amount ? Number(window.min_redemption_amount) : 0,
      // Enhanced Processing Options
      enable_pro_rata_distribution: window.enable_pro_rata_distribution ?? true,
      auto_process: window.auto_process ?? false,
      is_active: window.is_active ?? true,
      pro_rata_factor: window.pro_rata_factor ? Number(window.pro_rata_factor) : 1.0,
      processing_fee_percentage: window.processing_fee_percentage ? Number(window.processing_fee_percentage) : 0.0,
      early_redemption_penalty: window.early_redemption_penalty ? Number(window.early_redemption_penalty) : 0.0,
      // Status Settings
      submission_status: window.submission_status || 'not_started',
      processing_status: window.processing_status || 'pending',
      notes: window.notes || ''
    });

    setEditingWindow(window);
  };

  // NEW: View window details
  const handleViewWindow = (window: RedemptionWindow) => {
    setViewingWindow(window);
    setShowViewDialog(true);
  };

  const handleCreateOrUpdateWindow = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!formData.name) {
        setError('Please provide a window name');
        return;
      }

      // Validate based on date mode
      if (formData.submission_date_mode === 'fixed') {
        if (!formData.submission_start_date || !formData.submission_end_date) {
          setError('Please provide submission start and end dates');
          return;
        }

        const submissionStart = new Date(formData.submission_start_date);
        const submissionEnd = new Date(formData.submission_end_date);

        if (submissionEnd <= submissionStart) {
          setError('Submission end date must be after start date');
          return;
        }
      }

      if (formData.processing_date_mode === 'fixed') {
        if (!formData.start_date || !formData.end_date) {
          setError('Please provide processing start and end dates');
          return;
        }

        const windowStart = new Date(formData.start_date);
        const windowEnd = new Date(formData.end_date);

        if (windowEnd <= windowStart) {
          setError('Processing end date must be after start date');
          return;
        }
      }

      // Validate relative date settings
      if (formData.submission_date_mode === 'relative' && formData.lockup_days < 0) {
        setError('Lockup days cannot be negative');
        return;
      }

      if (formData.processing_date_mode === 'offset' && formData.processing_offset_days < 0) {
        setError('Processing offset days cannot be negative');
        return;
      }

      // Import enhanced redemption service
      const { enhancedRedemptionService } = await import('../services/enhancedRedemptionService');
      
      let result;
      
      if (editingWindow) {
        // Update existing window
        result = await enhancedRedemptionService.updateRedemptionWindow(editingWindow.id, {
          name: formData.name,
          submission_date_mode: formData.submission_date_mode,
          processing_date_mode: formData.processing_date_mode,
          lockup_days: formData.lockup_days,
          processing_offset_days: formData.processing_offset_days,
          submission_start_date: formData.submission_start_date || new Date().toISOString(),
          submission_end_date: formData.submission_end_date || new Date().toISOString(),
          start_date: formData.start_date || new Date().toISOString(),
          end_date: formData.end_date || new Date().toISOString(),
          nav: formData.nav || undefined,
          max_redemption_amount: formData.max_redemption_amount || undefined,
          min_redemption_amount: formData.min_redemption_amount || undefined,
          // Enhanced Processing Options
          enable_pro_rata_distribution: formData.enable_pro_rata_distribution,
          auto_process: formData.auto_process,
          is_active: formData.is_active,
          pro_rata_factor: formData.pro_rata_factor,
          processing_fee_percentage: formData.processing_fee_percentage,
          early_redemption_penalty: formData.early_redemption_penalty,
          // Status Settings
          submission_status: formData.submission_status,
          processing_status: formData.processing_status
        });
      } else {
        // Create new window
        result = await enhancedRedemptionService.createRedemptionWindow({
          project_id: projectId,
          name: formData.name,
          submission_date_mode: formData.submission_date_mode,
          processing_date_mode: formData.processing_date_mode,
          lockup_days: formData.lockup_days,
          processing_offset_days: formData.processing_offset_days,
          submission_start_date: formData.submission_start_date || new Date().toISOString(),
          submission_end_date: formData.submission_end_date || new Date().toISOString(),
          start_date: formData.start_date || new Date().toISOString(),
          end_date: formData.end_date || new Date().toISOString(),
          nav: formData.nav || undefined,
          max_redemption_amount: formData.max_redemption_amount || undefined,
          min_redemption_amount: formData.min_redemption_amount || undefined,
          // Enhanced Processing Options
          enable_pro_rata_distribution: formData.enable_pro_rata_distribution,
          auto_process: formData.auto_process,
          is_active: formData.is_active,
          pro_rata_factor: formData.pro_rata_factor,
          processing_fee_percentage: formData.processing_fee_percentage,
          early_redemption_penalty: formData.early_redemption_penalty,
          // Status Settings
          submission_status: formData.submission_status,
          processing_status: formData.processing_status
        });
      }

      if (result.success && result.data) {
        const mappedWindow = {
          ...result.data,
          project_id: projectId,
          name: formData.name,
          submission_date_mode: formData.submission_date_mode,
          processing_date_mode: formData.processing_date_mode,
          lockup_days: formData.lockup_days,
          processing_offset_days: formData.processing_offset_days,
          // Handle missing database columns
          total_requests: result.data.current_requests || 0,
          processed_requests: result.data.approved_requests || 0,
          enable_pro_rata_distribution: formData.enable_pro_rata_distribution,
          auto_process: formData.auto_process
        };

        if (editingWindow) {
          // Update existing window in list
          setWindows(prev => prev.map(w => w.id === editingWindow.id ? mappedWindow : w));
          onWindowUpdated?.(mappedWindow);
        } else {
          // Add new window to list
          setWindows(prev => [...prev, mappedWindow]);
          onWindowCreated?.(mappedWindow);
        }
        
        // Reset form and close dialog
        resetForm();
        setShowCreateDialog(false);
      } else {
        setError(result.error || 'Failed to save redemption window');
      }
    } catch (error) {
      let errorMessage = 'Failed to save window';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      setError(errorMessage);
      console.error('Error saving enhanced redemption window:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      submission_date_mode: 'fixed',
      processing_date_mode: 'offset',
      lockup_days: 90,
      processing_offset_days: 1,
      submission_start_date: '',
      submission_end_date: '',
      start_date: '',
      end_date: '',
      // Financial Settings (Enhanced)
      nav: 0,
      nav_source: 'manual',
      max_redemption_amount: 0,
      min_redemption_amount: 0,
      // Enhanced Processing Options
      enable_pro_rata_distribution: true,
      auto_process: false,
      is_active: true,
      pro_rata_factor: 1.0,
      processing_fee_percentage: 0.0,
      early_redemption_penalty: 0.0,
      // Status Settings
      submission_status: 'not_started',
      processing_status: 'pending',
      notes: ''
    });
    setEditingWindow(null);
    setError(null);
  };

  const getStatusBadge = (window: RedemptionWindow) => {
    const now = new Date();
    
    // Calculate actual window dates based on date modes and project transaction start
    const actualDates = calculateWindowStatus(window, projectInfo?.transaction_start_date || null);
    
    let status: 'upcoming' | 'present' | 'past' | 'cancelled';
    let displayText: string;
    
    if (window.status === 'cancelled') {
      status = 'cancelled';
      displayText = 'Cancelled';
    } else if (actualDates.processingEnd && now > actualDates.processingEnd) {
      status = 'past';
      displayText = 'Past';
    } else if (actualDates.submissionStart && now >= actualDates.submissionStart && actualDates.processingEnd && now <= actualDates.processingEnd) {
      status = 'present';
      displayText = 'Present';
    } else {
      status = 'upcoming';
      displayText = 'Upcoming';
    }

    const variants = {
      upcoming: 'secondary' as const,
      present: 'default' as const,
      past: 'outline' as const,
      cancelled: 'destructive' as const
    };

    const colors = {
      upcoming: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
      present: 'text-white bg-green-600 hover:bg-green-700', 
      past: 'text-gray-600 bg-gray-50 hover:bg-gray-100',
      cancelled: 'text-white bg-red-600 hover:bg-red-700'
    };

    return (
      <Badge variant="outline" className={colors[status]}>
        {displayText}
      </Badge>
    );
  };

  // Helper function to calculate window status based on current date and window dates
  const calculateWindowStatus = (window: RedemptionWindow, transactionStartDate: string | null) => {
    let submissionStart: Date, submissionEnd: Date, processingStart: Date, processingEnd: Date;

    if (window.submission_date_mode === 'relative' && transactionStartDate) {
      const txStartDate = new Date(transactionStartDate);
      submissionStart = new Date(txStartDate);
      submissionStart.setDate(txStartDate.getDate() + (window.lockup_days || 0));
      
      // For relative mode, we need to determine submission period duration
      // Use a default of 7 days if not specified
      const submissionDurationDays = 7;
      submissionEnd = new Date(submissionStart);
      submissionEnd.setDate(submissionStart.getDate() + submissionDurationDays);
    } else {
      submissionStart = window.submission_start_date ? new Date(window.submission_start_date) : new Date();
      submissionEnd = window.submission_end_date ? new Date(window.submission_end_date) : new Date();
    }

    if (window.processing_date_mode === 'same_day') {
      processingStart = new Date(submissionEnd);
      processingEnd = new Date(submissionEnd);
      processingEnd.setHours(processingEnd.getHours() + 1); // 1 hour processing window
    } else if (window.processing_date_mode === 'offset') {
      processingStart = new Date(submissionEnd);
      processingStart.setDate(processingStart.getDate() + (window.processing_offset_days || 1));
      processingEnd = new Date(processingStart);
      processingEnd.setHours(processingEnd.getHours() + 4); // 4 hour processing window
    } else {
      processingStart = window.start_date ? new Date(window.start_date) : new Date();
      processingEnd = window.end_date ? new Date(window.end_date) : new Date();
    }

    return {
      submissionStart,
      submissionEnd,
      processingStart,
      processingEnd
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // UPDATED: Enhanced date mode description with transaction_start_date context
  const getDateModeDescription = (window: RedemptionWindow) => {
    let description = '';
    
    if (window.submission_date_mode === 'relative') {
      if (window.lockup_days === 0) {
        description += 'Same-day redemptions after token issuance';
      } else {
        description += `${window.lockup_days}-day lockup from token issuance date`;
      }
      
      // Add transaction start date context if available
      if (projectInfo?.transaction_start_date) {
        const startDate = new Date(projectInfo.transaction_start_date);
        const redemptionDate = new Date(startDate);
        redemptionDate.setDate(startDate.getDate() + (window.lockup_days || 0));
        description += ` (${redemptionDate.toLocaleDateString()})`;
      }
    } else {
      description += 'Fixed submission dates';
    }
    
    description += ' • ';
    
    if (window.processing_date_mode === 'same_day') {
      description += 'Same-day processing';
    } else if (window.processing_date_mode === 'offset') {
      description += `Process +${window.processing_offset_days || 1} day${(window.processing_offset_days || 1) > 1 ? 's' : ''}`;
    } else {
      description += 'Fixed processing dates';
    }
    
    return description;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/redemption')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Redemption Dashboard
        </Button>
        {projectInfo && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{projectInfo.name}</span>
            {projectInfo.transaction_start_date && (
              <span className="ml-2">
                • Token Issuance: {formatDate(projectInfo.transaction_start_date)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Header with Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Redemption Windows</h2>
          <p className="text-gray-600">Configure redemption periods with flexible date options</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/redemption/calendar${projectId ? `?project=${projectId}` : ''}`)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendar View
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Window
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Setup Guide */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Flexible Date Configuration</AlertTitle>
        <AlertDescription>
          Create redemption windows with <strong>fixed dates</strong> or <strong>relative to token issuance</strong>. 
          Set lockup periods (e.g., 90 days after distribution) or immediate redemption options.
          {projectInfo?.transaction_start_date && (
            <> Token issuance date: <strong>{formatDate(projectInfo.transaction_start_date)}</strong></>
          )}
        </AlertDescription>
      </Alert>

      {/* Windows List */}
      <div className="grid gap-4">
        {windows.map((window) => (
          <Card key={window.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{window.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(window)}
                    <span className="text-sm text-gray-500">
                      {getDateModeDescription(window)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 mt-1">
                    Created {formatDate(window.created_at.toISOString())}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewWindow(window)}
                    title="View Details"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditWindow(window)}
                    title="Edit Redemption Window"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Configuration */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Submission Mode:</span>
                      <div className="capitalize">
                        {window.submission_date_mode === 'relative' 
                          ? `${window.lockup_days} days after issuance` 
                          : 'Fixed dates'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Processing Mode:</span>
                      <div className="capitalize">
                        {window.processing_date_mode === 'same_day' 
                          ? 'Same day' 
                          : window.processing_date_mode === 'offset' 
                            ? `+${window.processing_offset_days} day${(window.processing_offset_days || 1) > 1 ? 's' : ''}`
                            : 'Fixed dates'}
                      </div>
                    </div>
                    {(window.submission_date_mode === 'fixed' || window.processing_date_mode === 'fixed') && (
                      <div>
                        <span className="text-gray-500">Timeline:</span>
                        <div>{formatDate(window.submission_start_date.toISOString())} - {formatDate(window.end_date.toISOString())}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Activity
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-lg font-semibold text-blue-600">{window.total_requests}</div>
                      <div className="text-gray-500">Total Requests</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">{window.processed_requests}</div>
                      <div className="text-gray-500">Processed</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-lg font-semibold text-purple-600">
                        ${(window.total_request_value || 0).toLocaleString()}
                      </div>
                      <div className="text-gray-500">Total Value</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex gap-4 text-sm">
                  {window.enable_pro_rata_distribution && (
                    <Badge variant="outline">Pro-rata Distribution</Badge>
                  )}
                  {window.auto_process && (
                    <Badge variant="outline">Auto-process</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {window.submission_date_mode === 'relative' ? 'Relative Dates' : 'Fixed Dates'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {windows.length === 0 && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No redemption windows configured</p>
                <p className="text-sm">Create your first redemption window with flexible date options</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* NEW: View Window Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Redemption Window Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of {viewingWindow?.name} configuration and activity
            </DialogDescription>
          </DialogHeader>

          {viewingWindow && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Window Configuration
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="font-medium">{viewingWindow.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      {getStatusBadge(viewingWindow)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submission Mode:</span>
                      <span className="capitalize">
                        {viewingWindow.submission_date_mode === 'relative' 
                          ? `${viewingWindow.lockup_days} days after issuance` 
                          : 'Fixed dates'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Processing Mode:</span>
                      <span className="capitalize">
                        {viewingWindow.processing_date_mode === 'same_day' 
                          ? 'Same day' 
                          : viewingWindow.processing_date_mode === 'offset' 
                            ? `+${viewingWindow.processing_offset_days} day${(viewingWindow.processing_offset_days || 1) > 1 ? 's' : ''}`
                            : 'Fixed dates'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span>{formatDate(viewingWindow.created_at.toISOString())}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Settings
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">NAV:</span>
                      <span className="font-medium">
                        {viewingWindow.nav ? `$${Number(viewingWindow.nav).toFixed(2)}` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Redemption:</span>
                      <span className="font-medium">
                        {viewingWindow.max_redemption_amount 
                          ? `$${Number(viewingWindow.max_redemption_amount).toLocaleString()}` 
                          : 'No limit'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pro-rata Distribution:</span>
                      <Badge variant={viewingWindow.enable_pro_rata_distribution ? 'default' : 'outline'}>
                        {viewingWindow.enable_pro_rata_distribution ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Auto Process:</span>
                      <Badge variant={viewingWindow.auto_process ? 'default' : 'outline'}>
                        {viewingWindow.auto_process ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Details */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Submission Dates</h4>
                    {viewingWindow.submission_date_mode === 'relative' ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Timer className="h-3 w-3 text-blue-500" />
                          <span>{viewingWindow.lockup_days} days after token issuance</span>
                        </div>
                        {projectInfo?.transaction_start_date && (
                          <div className="text-xs text-gray-500 ml-5">
                            Token issued: {formatDate(projectInfo.transaction_start_date)}
                            <br />
                            Available from: {new Date(new Date(projectInfo.transaction_start_date).getTime() + (viewingWindow.lockup_days || 0) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <div>Start: {formatDate(viewingWindow.submission_start_date.toISOString())}</div>
                        <div>End: {formatDate(viewingWindow.submission_end_date.toISOString())}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Processing Dates</h4>
                    {viewingWindow.processing_date_mode === 'same_day' ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-green-500" />
                          <span>Same day as submission</span>
                        </div>
                      </div>
                    ) : viewingWindow.processing_date_mode === 'offset' ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-yellow-500" />
                          <span>{viewingWindow.processing_offset_days} day(s) after submission closes</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm space-y-1">
                        <div>Start: {formatDate(viewingWindow.start_date.toISOString())}</div>
                        <div>End: {formatDate(viewingWindow.end_date.toISOString())}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Activity Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{viewingWindow.total_requests}</div>
                    <div className="text-xs text-blue-700">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{viewingWindow.processed_requests}</div>
                    <div className="text-xs text-green-700">Processed</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${(viewingWindow.total_request_value || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-purple-700">Total Value</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {viewingWindow.total_requests > 0 
                        ? Math.round((viewingWindow.processed_requests / viewingWindow.total_requests) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-700">Completion Rate</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingWindow.notes && (
                <div className="space-y-3">
                  <h3 className="font-medium">Notes</h3>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {viewingWindow.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Create/Edit Window Dialog */}
      <Dialog open={showCreateDialog || editingWindow !== null} onOpenChange={(open) => {
        if (!open) {
          resetForm();
          setShowCreateDialog(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {editingWindow ? 'Edit Redemption Window' : 'Create New Redemption Window'}
            </DialogTitle>
            <DialogDescription>
              Configure redemption window settings including submission dates, processing dates, and distribution options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Window Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Q4 2024 Redemption Window"
                />
              </div>
            </div>

            {/* Submission Date Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Submission Date Configuration
                {projectInfo?.transaction_start_date && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Token issued: {formatDate(projectInfo.transaction_start_date)})
                  </span>
                )}
              </h3>
              
              <RadioGroup 
                value={formData.submission_date_mode} 
                onValueChange={(value: SubmissionDateMode) => 
                  setFormData({...formData, submission_date_mode: value})
                }
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Fixed Dates Option */}
                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="fixed" id="fixed-submission" />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="fixed-submission" className="font-medium">
                      Fixed Dates
                    </Label>
                    <p className="text-sm text-gray-600">
                      Set specific calendar dates for submission period
                    </p>
                    {formData.submission_date_mode === 'fixed' && (
                      <div className="grid gap-2 mt-3">
                        <div>
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="datetime-local"
                            value={formData.submission_start_date}
                            onChange={(e) => setFormData({...formData, submission_start_date: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="datetime-local"
                            value={formData.submission_end_date}
                            onChange={(e) => setFormData({...formData, submission_end_date: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Relative Dates Option */}
                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="relative" id="relative-submission" />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="relative-submission" className="font-medium">
                      Days After Issuance
                    </Label>
                    <p className="text-sm text-gray-600">
                      Set redemption availability relative to token distribution
                      {projectInfo?.transaction_start_date && (
                        <span className="block text-xs text-blue-600 mt-1">
                          Based on issuance date: {formatDate(projectInfo.transaction_start_date)}
                        </span>
                      )}
                    </p>
                    {formData.submission_date_mode === 'relative' && (
                      <div className="mt-3">
                        <Label className="text-xs">Lockup Days</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            min="0"
                            value={formData.lockup_days}
                            onChange={(e) => setFormData({...formData, lockup_days: parseInt(e.target.value) || 0})}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-600">
                            days after token issuance (0 = same day)
                          </span>
                        </div>
                        {projectInfo?.transaction_start_date && formData.lockup_days >= 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            Redemptions available from: {
                              new Date(new Date(projectInfo.transaction_start_date).getTime() + formData.lockup_days * 24 * 60 * 60 * 1000).toLocaleDateString()
                            }
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Examples: 0 (immediate), 30 (30-day lockup), 90 (quarterly lockup)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Processing Date Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Processing Date Configuration
              </h3>
              
              <RadioGroup 
                value={formData.processing_date_mode} 
                onValueChange={(value: ProcessingDateMode) => 
                  setFormData({...formData, processing_date_mode: value})
                }
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {/* Same Day Processing */}
                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="same_day" id="same-day-processing" />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="same-day-processing" className="font-medium">
                      Same Day
                    </Label>
                    <p className="text-sm text-gray-600">
                      Process redemptions on the submission date
                    </p>
                  </div>
                </div>

                {/* Offset Processing */}
                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="offset" id="offset-processing" />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="offset-processing" className="font-medium">
                      Offset Days
                    </Label>
                    <p className="text-sm text-gray-600">
                      Process after submission period
                    </p>
                    {formData.processing_date_mode === 'offset' && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={formData.processing_offset_days}
                            onChange={(e) => setFormData({...formData, processing_offset_days: parseInt(e.target.value) || 1})}
                            className="w-16"
                          />
                          <span className="text-sm text-gray-600">
                            day(s) later
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Processing Dates */}
                <div className="flex items-start space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="fixed" id="fixed-processing" />
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="fixed-processing" className="font-medium">
                      Fixed Dates
                    </Label>
                    <p className="text-sm text-gray-600">
                      Set specific processing period
                    </p>
                    {formData.processing_date_mode === 'fixed' && (
                      <div className="grid gap-2 mt-3">
                        <div>
                          <Label className="text-xs">Start</Label>
                          <Input
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End</Label>
                          <Input
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Financial Settings (Enhanced) */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Financial Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NAV */}
                <div>
                  <Label htmlFor="nav">Net Asset Value (NAV)</Label>
                  <Input
                    id="nav"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.nav}
                    onChange={(e) => setFormData({...formData, nav: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 1.05"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Current NAV per token/share
                  </p>
                </div>

                {/* NAV Source */}
                <div>
                  <Label htmlFor="nav-source">NAV Source</Label>
                  <Select 
                    value={formData.nav_source} 
                    onValueChange={(value) => setFormData({...formData, nav_source: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select NAV source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="oracle">Price Oracle</SelectItem>
                      <SelectItem value="calculated">Calculated Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Maximum Redemption Amount */}
                <div>
                  <Label htmlFor="max-redemption">Maximum Redemption Amount</Label>
                  <Input
                    id="max-redemption"
                    type="number"
                    min="0"
                    value={formData.max_redemption_amount}
                    onChange={(e) => setFormData({...formData, max_redemption_amount: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 1000000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Maximum total amount that can be redeemed in this window (0 = no limit)
                  </p>
                </div>

                {/* Minimum Redemption Amount */}
                <div>
                  <Label htmlFor="min-redemption">Minimum Redemption Amount</Label>
                  <Input
                    id="min-redemption"
                    type="number"
                    min="0"
                    value={formData.min_redemption_amount}
                    onChange={(e) => setFormData({...formData, min_redemption_amount: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 1000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Minimum amount required per redemption request
                  </p>
                </div>

                {/* Pro-rata Factor */}
                <div>
                  <Label htmlFor="pro-rata-factor">Pro-rata Factor</Label>
                  <Input
                    id="pro-rata-factor"
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={formData.pro_rata_factor}
                    onChange={(e) => setFormData({...formData, pro_rata_factor: parseFloat(e.target.value) || 1.0})}
                    placeholder="1.0000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Factor for proportional distribution (1.0 = full allocation)
                  </p>
                </div>

                {/* Processing Fee Percentage */}
                <div>
                  <Label htmlFor="processing-fee">Processing Fee (%)</Label>
                  <Input
                    id="processing-fee"
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    value={formData.processing_fee_percentage}
                    onChange={(e) => setFormData({...formData, processing_fee_percentage: parseFloat(e.target.value) || 0})}
                    placeholder="0.0000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Processing fee as percentage of redemption amount
                  </p>
                </div>

                {/* Early Redemption Penalty */}
                <div>
                  <Label htmlFor="early-penalty">Early Redemption Penalty (%)</Label>
                  <Input
                    id="early-penalty"
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    value={formData.early_redemption_penalty}
                    onChange={(e) => setFormData({...formData, early_redemption_penalty: parseFloat(e.target.value) || 0})}
                    placeholder="0.0000"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Penalty for early redemption before lockup expiry
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Status Tracking */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Status Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Submission Status */}
                <div>
                  <Label htmlFor="submission-status">Submission Status</Label>
                  <Select 
                    value={formData.submission_status} 
                    onValueChange={(value: 'not_started' | 'open' | 'closed' | 'extended' | 'cancelled') => 
                      setFormData({...formData, submission_status: value})
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select submission status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Processing Status */}
                <div>
                  <Label htmlFor="processing-status">Processing Status</Label>
                  <Select 
                    value={formData.processing_status} 
                    onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled') => 
                      setFormData({...formData, processing_status: value})
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select processing status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Processing Options */}
            <div className="space-y-4">
              <h3 className="font-medium">Processing Options</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.enable_pro_rata_distribution}
                    onCheckedChange={(checked) => setFormData({...formData, enable_pro_rata_distribution: checked})}
                  />
                  <Label>Enable Pro-rata Distribution</Label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  If total requests exceed maximum amount, distribute proportionally
                </p>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.auto_process}
                    onCheckedChange={(checked) => setFormData({...formData, auto_process: checked})}
                  />
                  <Label>Auto Process</Label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Automatically begin settlement process when processing period starts
                </p>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label>Active Window</Label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Window is active and accepting redemption requests
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this redemption window..."
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-3">
              <div className="text-sm text-gray-600 p-2">
                {formData.submission_date_mode === 'relative' ? (
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Redemption dates will be calculated based on token distribution dates</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Using fixed calendar dates for redemption schedule</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setShowCreateDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateOrUpdateWindow}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingWindow ? 'Update Window' : 'Create Window'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { EnhancedRedemptionWindowManager as default };
