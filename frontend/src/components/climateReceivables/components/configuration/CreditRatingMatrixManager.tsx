import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CreditCard, RefreshCw, Save, Plus, Trash2, Download, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ClimateConfigurationService, 
  CreditRating 
} from '../../services/climateConfigurationService';

interface CreditRatingMatrixManagerProps {
  onConfigurationChange?: () => void;
}

export const CreditRatingMatrixManager: React.FC<CreditRatingMatrixManagerProps> = ({
  onConfigurationChange
}) => {
  // State management
  const [ratings, setRatings] = useState<CreditRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingRating, setEditingRating] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load ratings on mount
  useEffect(() => {
    loadRatings();
  }, []);

  /**
   * Load credit rating matrix from database
   */
  const loadRatings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const ratingsData = await ClimateConfigurationService.getCreditRatingMatrix();
      setRatings(ratingsData);
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit ratings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save credit rating matrix to database
   */
  const saveRatings = async () => {
    setSaving(true);
    setError(null);

    try {
      await ClimateConfigurationService.updateCreditRatingMatrix(ratings);
      setHasChanges(false);
      setLastSaved(new Date());
      onConfigurationChange?.();
      
      // Show success briefly
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credit ratings');
      setSaving(false);
    }
  };

  /**
   * Update a specific rating
   */
  const updateRating = (ratingCode: string, field: keyof CreditRating, value: any) => {
    setRatings(prev => prev.map(rating => 
      rating.rating === ratingCode 
        ? { ...rating, [field]: value }
        : rating
    ));
    setHasChanges(true);
  };

  /**
   * Add a new credit rating
   */
  const addNewRating = () => {
    const newRating: CreditRating = {
      rating: 'NEW',
      defaultRate: 0.10,
      spreadBps: 150,
      investmentGrade: true,
      riskTier: 'Investment Grade'
    };
    
    setRatings(prev => [...prev, newRating]);
    setEditingRating('NEW');
    setHasChanges(true);
  };

  /**
   * Remove a credit rating
   */
  const removeRating = (ratingCode: string) => {
    if (!confirm(`Remove ${ratingCode} rating? This cannot be undone.`)) {
      return;
    }
    
    setRatings(prev => prev.filter(rating => rating.rating !== ratingCode));
    setHasChanges(true);
  };

  /**
   * Export ratings to CSV
   */
  const exportToCsv = () => {
    const headers = ['Rating', 'Default Rate (%)', 'Spread (bps)', 'Investment Grade', 'Risk Tier'];
    const csvData = [
      headers.join(','),
      ...ratings.map(rating => [
        rating.rating,
        rating.defaultRate.toFixed(2),
        rating.spreadBps.toString(),
        rating.investmentGrade.toString(),
        rating.riskTier
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credit-ratings-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Computed values
  const investmentGradeCount = ratings.filter(r => r.investmentGrade).length;
  const speculativeGradeCount = ratings.filter(r => !r.investmentGrade).length;

  // Risk tier options
  const riskTierOptions = ['Prime', 'Investment Grade', 'Speculative', 'High Risk', 'Default Risk'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading credit rating matrix...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Credit Rating Matrix</h2>
          {hasChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
        </div>
        <div className="flex items-center space-x-2">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCsv}
            disabled={ratings.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadRatings}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addNewRating}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Rating
          </Button>
          <Button 
            onClick={saveRatings}
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{ratings.length}</div>
            <p className="text-sm text-muted-foreground">Total Ratings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{investmentGradeCount}</div>
            <p className="text-sm text-muted-foreground">Investment Grade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{speculativeGradeCount}</div>
            <p className="text-sm text-muted-foreground">Speculative Grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Rating Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Rating Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure credit ratings with default rates, spreads, and risk classifications. 
            Click on cells to edit values.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Default Rate (%)</TableHead>
                <TableHead className="text-right">Spread (bps)</TableHead>
                <TableHead className="text-center">Investment Grade</TableHead>
                <TableHead>Risk Tier</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.map((rating) => (
                <TableRow key={rating.rating}>
                  {/* Rating Code */}
                  <TableCell className="font-medium">
                    {editingRating === rating.rating ? (
                      <Input
                        value={rating.rating}
                        onChange={(e) => updateRating(rating.rating, 'rating', e.target.value)}
                        onBlur={() => setEditingRating(null)}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingRating(null)}
                        className="w-20"
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setEditingRating(rating.rating)}
                        className="cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                      >
                        {rating.rating}
                      </span>
                    )}
                  </TableCell>

                  {/* Default Rate */}
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={rating.defaultRate.toFixed(2)}
                      onChange={(e) => updateRating(rating.rating, 'defaultRate', parseFloat(e.target.value))}
                      className="w-24 text-right"
                    />
                  </TableCell>

                  {/* Spread (bps) */}
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      max="5000"
                      step="5"
                      value={rating.spreadBps.toString()}
                      onChange={(e) => updateRating(rating.rating, 'spreadBps', parseInt(e.target.value))}
                      className="w-24 text-right"
                    />
                  </TableCell>

                  {/* Investment Grade Toggle */}
                  <TableCell className="text-center">
                    <Switch
                      checked={rating.investmentGrade}
                      onCheckedChange={(checked) => updateRating(rating.rating, 'investmentGrade', checked)}
                    />
                  </TableCell>

                  {/* Risk Tier */}
                  <TableCell>
                    <Select
                      value={rating.riskTier}
                      onValueChange={(value) => updateRating(rating.rating, 'riskTier', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {riskTierOptions.map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            {tier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRating(rating.rating)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {ratings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No credit ratings configured. Click "Add Rating" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Summary */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700">You have unsaved changes to the credit rating matrix</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={loadRatings}>
                  Discard Changes
                </Button>
                <Button size="sm" onClick={saveRatings} disabled={saving}>
                  Save Matrix
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};