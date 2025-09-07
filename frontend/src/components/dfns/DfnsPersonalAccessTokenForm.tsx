/**
 * DFNS Personal Access Token Form Component
 * 
 * Form for creating and editing Personal Access Tokens
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DfnsPersonalAccessTokenManager
} from '@/infrastructure/dfns';
import { 
  Key, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import type {
  PersonalAccessTokenResponse,
  CreatePersonalAccessTokenRequest,
  UpdatePersonalAccessTokenRequest,
  PatKeyPair
} from '@/types/dfns/personal-access-token';

export interface DfnsPersonalAccessTokenFormProps {
  token?: PersonalAccessTokenResponse; // For editing existing token
  onComplete: () => void;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  expirationDays: number;
  permissionId: string;
  externalId: string;
}

interface FormState {
  data: FormData;
  errors: Partial<FormData>;
  generating: boolean;
  submitting: boolean;
  keyPair: PatKeyPair | null;
  showPrivateKey: boolean;
  createdToken: string | null;
  privateKeyCopied: boolean;
  tokenCopied: boolean;
}

/**
 * Personal Access Token Creation/Edit Form
 */
export default function DfnsPersonalAccessTokenForm({
  token,
  onComplete,
  onCancel,
  loading = false
}: DfnsPersonalAccessTokenFormProps) {
  // ===== State Management =====
  const [state, setState] = useState<FormState>({
    data: {
      name: token?.name || '',
      description: '',
      expirationDays: 90,
      permissionId: '',
      externalId: ''
    },
    errors: {},
    generating: false,
    submitting: false,
    keyPair: null,
    showPrivateKey: false,
    createdToken: null,
    privateKeyCopied: false,
    tokenCopied: false
  });

  const [patManager] = useState(() => new DfnsPersonalAccessTokenManager());
  const isEditing = !!token;

  // ===== Form Handlers =====
  const updateFormData = (field: keyof FormData, value: string | number) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value },
      errors: { ...prev.errors, [field]: undefined }
    }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!state.data.name.trim()) {
      errors.name = 'Token name is required';
    }

    if (state.data.name.length > 100) {
      errors.name = 'Token name must be 100 characters or less';
    }

    if (!isEditing) {
      if (!state.keyPair) {
        alert('Please generate a key pair first');
        return false;
      }
    }

    setState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  // ===== Key Generation =====
  const generateKeyPair = async () => {
    setState(prev => ({ ...prev, generating: true }));
    
    try {
      const keyPair = await patManager.generateKeyPair();
      setState(prev => ({ 
        ...prev, 
        keyPair, 
        generating: false,
        privateKeyCopied: false
      }));
    } catch (error) {
      console.error('Error generating key pair:', error);
      alert('Failed to generate key pair. Please try again.');
      setState(prev => ({ ...prev, generating: false }));
    }
  };

  // ===== Form Submission =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setState(prev => ({ ...prev, submitting: true }));

    try {
      if (isEditing && token) {
        // Update existing token
        const updateRequest: UpdatePersonalAccessTokenRequest = {
          name: state.data.name.trim(),
          externalId: state.data.externalId.trim() || undefined
        };

        await patManager.updatePersonalAccessToken(token.tokenId, updateRequest);
        onComplete();
      } else {
        // Create new token
        if (!state.keyPair) {
          throw new Error('Key pair is required for token creation');
        }

        const createRequest: CreatePersonalAccessTokenRequest = {
          name: state.data.name.trim(),
          publicKey: state.keyPair.publicKey,
          daysValid: state.data.expirationDays,
          permissionId: state.data.permissionId || undefined,
          externalId: state.data.externalId.trim() || undefined
        };

        const response = await patManager.createPersonalAccessToken(createRequest);
        
        setState(prev => ({ 
          ...prev, 
          submitting: false,
          createdToken: response.accessToken
        }));
        
        // Don't call onComplete yet - user needs to copy the token
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error instanceof Error ? error.message : 'Failed to save token');
      setState(prev => ({ ...prev, submitting: false }));
    }
  };

  // ===== Copy Handlers =====
  const copyToClipboard = async (text: string, type: 'privateKey' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setState(prev => ({ 
        ...prev, 
        [type === 'privateKey' ? 'privateKeyCopied' : 'tokenCopied']: true 
      }));
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          [type === 'privateKey' ? 'privateKeyCopied' : 'tokenCopied']: false 
        }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // ===== Success State =====
  if (state.createdToken) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Token Created Successfully!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your Personal Access Token has been created. Please copy and store these securely - 
            you won't be able to see them again.
          </AlertDescription>
        </Alert>

        {/* Private Key */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Private Key</CardTitle>
            <CardDescription>
              Store this private key securely. You'll need it for API authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Private Key</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, showPrivateKey: !prev.showPrivateKey }))}
                  >
                    {state.showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(state.keyPair!.privateKey, 'privateKey')}
                  >
                    {state.privateKeyCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {state.privateKeyCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <Textarea
                value={state.showPrivateKey ? state.keyPair!.privateKey : '••••••••••••••••••••••••••••••••'}
                readOnly
                className="font-mono text-xs min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Access Token */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Access Token</CardTitle>
            <CardDescription>
              Use this token in your API requests for authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Access Token</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(state.createdToken!, 'token')}
                >
                  {state.tokenCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {state.tokenCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Input
                value={state.createdToken}
                readOnly
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="secure-storage"
            className="data-[state=checked]:bg-green-600"
          />
          <Label htmlFor="secure-storage" className="text-sm">
            I have securely stored both the private key and access token
          </Label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Create Another
          </Button>
          <Button onClick={onComplete}>
            Continue to Token List
          </Button>
        </div>
      </div>
    );
  }

  // ===== Form Render =====
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Token Name *</Label>
          <Input
            id="name"
            type="text"
            value={state.data.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="e.g., Production API Token"
            className={state.errors.name ? 'border-red-500' : ''}
            disabled={loading || state.submitting}
          />
          {state.errors.name && (
            <p className="text-sm text-red-600">{state.errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={state.data.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Optional description for this token"
            className="min-h-[80px]"
            disabled={loading || state.submitting}
          />
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="expiration">Expiration</Label>
            <Select
              value={state.data.expirationDays.toString()}
              onValueChange={(value) => updateFormData('expirationDays', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expiration period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="externalId">External ID</Label>
          <Input
            id="externalId"
            type="text"
            value={state.data.externalId}
            onChange={(e) => updateFormData('externalId', e.target.value)}
            placeholder="Optional external identifier"
            disabled={loading || state.submitting}
          />
        </div>
      </div>

      {/* Key Generation (Create only) */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cryptographic Key Pair</CardTitle>
            <CardDescription>
              Generate a secure key pair for this token. The private key will be used for API authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!state.keyPair ? (
              <Button
                type="button"
                onClick={generateKeyPair}
                disabled={state.generating || loading}
                className="w-full"
              >
                {state.generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Key Pair...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Generate Key Pair
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Key Pair Generated</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Cryptographic key pair has been generated successfully.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label>Public Key Preview</Label>
                  <Textarea
                    value={state.keyPair.publicKey.substring(0, 100) + '...'}
                    readOnly
                    className="font-mono text-xs min-h-[60px]"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateKeyPair}
                  disabled={state.generating || loading}
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={state.submitting || loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={state.submitting || loading || (!isEditing && !state.keyPair)}
        >
          {state.submitting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Update Token' : 'Create Token'
          )}
        </Button>
      </div>
    </form>
  );
}
