# DFNS API Compliance - Phase 3: Enhanced Cross-Device UI & Final Integration

## Enhanced Cross-Device Credential Creation UI

### Update DfnsDelegatedAuthentication.tsx

Add comprehensive cross-device flow UI:

```typescript
// Add state management for cross-device flow
const [oneTimeCode, setOneTimeCode] = useState<string>('');
const [showCodeDialog, setShowCodeDialog] = useState(false);
const [codeExpiration, setCodeExpiration] = useState<string>('');
const [isGeneratingCode, setIsGeneratingCode] = useState(false);

// Enhanced cross-device credential creation handler
const handleCrossDeviceCredentialCreation = async (credentialKind: DfnsCredentialKind) => {
  try {
    setIsGeneratingCode(true);
    setError('');

    // Step 1: Create one-time code (max 1 minute expiration per DFNS spec)
    const expirationTime = new Date(Date.now() + 60000).toISOString();
    const codeResponse = await credentialManager.createCredentialCode(expirationTime);

    // Step 2: Display code to user for cross-device input
    setOneTimeCode(codeResponse.code);
    setCodeExpiration(codeResponse.expiration);
    setShowCodeDialog(true);

    // Auto-close dialog after expiration
    setTimeout(() => {
      setShowCodeDialog(false);
      setOneTimeCode('');
    }, 60000); // 1 minute

  } catch (error) {
    setError(`Cross-device credential creation failed: ${(error as Error).message}`);
  } finally {
    setIsGeneratingCode(false);
  }
};

// Cross-device code input handler (for target device)
const handleCrossDeviceCodeInput = async (
  code: string, 
  credentialName: string,
  credentialKind: DfnsCredentialKind,
  options?: { password?: string; curve?: DfnsSignatureType }
) => {
  try {
    setIsLoading(true);
    setError('');

    const credential = await credentialManager.createCredentialWithCode(
      code,
      credentialName,
      credentialKind,
      options
    );

    setMessage(`Credential "${credentialName}" created successfully on this device`);
    onCredentialCreated?.(credential);
    
  } catch (error) {
    setError(`Failed to create credential with code: ${(error as Error).message}`);
  } finally {
    setIsLoading(false);
  }
};
```

### Add Cross-Device Code Display Dialog

```typescript
// Add to JSX return:
{showCodeDialog && (
  <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Cross-Device Setup Code
        </DialogTitle>
        <DialogDescription>
          Use this code on your other device within 1 minute to create the credential.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-mono font-bold tracking-wider p-4 bg-muted rounded-lg">
            {oneTimeCode}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Expires: {new Date(codeExpiration).toLocaleTimeString()}
          </p>
        </div>
        
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            This code can be used by anyone to create a credential. Only share it with trusted devices.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(oneTimeCode)}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setShowCodeDialog(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
```

### Add Cross-Device Code Input Form

```typescript
// Add cross-device code input section:
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Smartphone className="h-5 w-5" />
      Use Cross-Device Code
    </CardTitle>
    <CardDescription>
      Enter a code from another device to create a credential on this device.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="crossDeviceCode">One-Time Code</Label>
      <Input
        id="crossDeviceCode"
        placeholder="A7U-KY6-9PT"
        value={crossDeviceCode}
        onChange={(e) => setCrossDeviceCode(e.target.value.toUpperCase())}
        maxLength={11} // Format: XXX-XXX-XXX
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="credentialName">Credential Name</Label>
      <Input
        id="credentialName"
        placeholder="My Phone Credential"
        value={credentialName}
        onChange={(e) => setCredentialName(e.target.value)}
      />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="credentialType">Credential Type</Label>
      <Select value={selectedCredentialKind} onValueChange={setSelectedCredentialKind}>
        <SelectTrigger>
          <SelectValue placeholder="Select credential type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Fido2">WebAuthn/Passkey</SelectItem>
          <SelectItem value="Key">Private Key</SelectItem>
          <SelectItem value="PasswordProtectedKey">Password Protected Key</SelectItem>
          <SelectItem value="RecoveryKey">Recovery Key</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {selectedCredentialKind === 'PasswordProtectedKey' && (
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password for key protection"
        />
      </div>
    )}
    
    <Button
      onClick={() => handleCrossDeviceCodeInput(
        crossDeviceCode,
        credentialName,
        selectedCredentialKind as DfnsCredentialKind,
        { password, curve: DfnsSignatureType.Secp256k1 }
      )}
      disabled={!crossDeviceCode || !credentialName || isLoading}
      className="w-full"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create Credential with Code
    </Button>
  </CardContent>
</Card>
```

## Enhanced Credential Management UI

### Update DfnsAuthentication.tsx for New Interface

```typescript
// Update credential list display for new DFNS interface:
const CredentialList: React.FC<{ credentials: DfnsCredentialInfo[] }> = ({ credentials }) => {
  return (
    <div className="space-y-3">
      {credentials.map((credential) => (
        <Card key={credential.credentialUuid} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {credential.kind === 'Fido2' && <Fingerprint className="h-5 w-5 text-blue-500" />}
              {credential.kind === 'Key' && <Key className="h-5 w-5 text-green-500" />}
              {credential.kind === 'PasswordProtectedKey' && <Shield className="h-5 w-5 text-orange-500" />}
              {credential.kind === 'RecoveryKey' && <RefreshCw className="h-5 w-5 text-purple-500" />}
              
              <div>
                <p className="font-medium">{credential.name || 'Unnamed Credential'}</p>
                <p className="text-sm text-muted-foreground">
                  {credential.kind} • Created {new Date(credential.dateCreated).toLocaleDateString()}
                </p>
                {credential.lastUsedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last used: {new Date(credential.lastUsedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={credential.isActive ? "default" : "secondary"}>
                {credential.isActive ? "Active" : "Inactive"}
              </Badge>
              
              <Button
                size="sm"
                variant={credential.isActive ? "destructive" : "default"}
                onClick={() => handleCredentialToggle(credential)}
                disabled={isLoading}
              >
                {credential.isActive ? "Deactivate" : "Activate"}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteCredential(credential.credentialUuid)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {credential.relyingPartyId && (
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              <p>Relying Party: {credential.relyingPartyId}</p>
              {credential.origin && <p>Origin: {credential.origin}</p>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
```

## Enhanced Error Handling & User Feedback

### Add Comprehensive Error Messages

```typescript
const getErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();
  
  if (message.includes('expired')) {
    return 'The one-time code has expired. Please generate a new code.';
  }
  
  if (message.includes('invalid code')) {
    return 'Invalid one-time code. Please check the code and try again.';
  }
  
  if (message.includes('already used')) {
    return 'This code has already been used. Please generate a new code.';
  }
  
  if (message.includes('authentication required')) {
    return 'Please sign in first before creating cross-device codes.';
  }
  
  if (message.includes('webauthn')) {
    return 'WebAuthn is not supported on this device or browser.';
  }
  
  return error.message;
};

// Update error handling in components:
} catch (error) {
  const friendlyMessage = getErrorMessage(error as Error);
  setError(friendlyMessage);
  onAuthError?.(error as Error);
}
```

## Files to Update

### 1. `/frontend/src/components/dfns/DfnsDelegatedAuthentication.tsx`
- Add cross-device code generation UI (~80 lines)
- Add cross-device code input form (~60 lines)  
- Add enhanced error handling (~30 lines)
- Total: ~170 lines

### 2. `/frontend/src/components/dfns/DfnsAuthentication.tsx`
- Update credential list for new interface (~50 lines)
- Add activation/deactivation handlers (~40 lines)
- Add enhanced credential display (~30 lines)
- Total: ~120 lines

### 3. `/frontend/src/infrastructure/dfns/credential-manager.ts`
- Add the missing API methods from Phase 1 (~150 lines)
- Update existing methods for DFNS compliance (~50 lines)
- Total: ~200 lines

### 4. `/frontend/src/types/dfns/core.ts`
- Update credential interfaces (~30 lines)
- Add new request/response types (~20 lines)
- Total: ~50 lines

## Integration Testing Plan

### 1. Cross-Device Flow Testing
```typescript
// Test scenario: Desktop generates code, mobile uses code
describe('Cross-Device Credential Creation', () => {
  test('Generate code on desktop', async () => {
    // Test code generation
    // Verify code format and expiration
    // Test code display UI
  });
  
  test('Use code on mobile', async () => {
    // Test code input validation
    // Test credential creation with code
    // Verify credential appears in both devices
  });
  
  test('Code expiration handling', async () => {
    // Test expired code rejection
    // Test UI timeout behavior
  });
});
```

### 2. Activation/Deactivation Testing
```typescript
describe('Credential Management', () => {
  test('Activate/deactivate credentials', async () => {
    // Test activation API call
    // Test deactivation API call  
    // Test UI state updates
  });
  
  test('Credential list display', async () => {
    // Test new interface compatibility
    // Test status badge updates
    // Test action button states
  });
});
```

## Security Considerations

### 1. Cross-Device Code Security
- **One-time use:** Codes automatically invalidate after use
- **Short expiration:** Maximum 1 minute lifespan
- **User education:** Clear warnings about code sharing
- **Visual indicators:** Clear expiration countdown

### 2. Credential Management Security
- **Confirmation dialogs:** For destructive actions like deactivation
- **Activity logging:** Track all credential changes
- **Permission checks:** Verify user authorization for each action

## Deployment Strategy

### 1. Feature Flags
- Enable cross-device flows gradually
- A/B test new UI components
- Rollback capability for issues

### 2. Migration Plan
- Deploy backend API updates first
- Update frontend components in phases
- Maintain backward compatibility during transition

## Estimated Implementation Time

- **Phase 3 Implementation:** 12-16 hours
- **Integration Testing:** 6-8 hours  
- **UI/UX Refinement:** 4-6 hours
- **Documentation:** 2-3 hours

**Total Phase 3: 24-33 hours**

## Success Metrics

- ✅ All official DFNS API endpoints implemented
- ✅ Cross-device flow success rate >95%
- ✅ UI responsiveness <200ms for all actions
- ✅ Zero security vulnerabilities in code review
- ✅ Complete test coverage for new functionality
