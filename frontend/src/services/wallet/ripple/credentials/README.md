# XRPL Credentials Service

Blockchain-based verifiable credentials management on XRP Ledger.

## Overview

The XRPL Credentials Service provides functionality to issue, accept, verify, and manage blockchain-based verifiable credentials on the XRP Ledger. These credentials are stored on-chain and provide cryptographically verifiable proof of claims.

## Features

- **Issue Credentials**: Create blockchain-based credentials for subjects
- **Accept Credentials**: Subjects can accept credentials issued to them
- **Delete Credentials**: Revoke or delete credentials
- **Verify Credentials**: Verify credential validity and check expiration
- **Query Credentials**: Retrieve credentials by account or specific criteria

## Use Cases

### Identity Verification
Issue credentials to verify user identity, KYC status, or other identity attributes.

### Qualification Credentials
Issue credentials for certifications, licenses, or qualifications.

### Membership Credentials
Issue credentials to verify membership in organizations or access rights.

### Compliance Credentials
Issue credentials for regulatory compliance, accreditation, or audit purposes.

## Installation

```typescript
import { XRPLCredentialService } from '@/services/wallet/ripple/credentials'
import { xrplClientManager } from '@/services/wallet/ripple/core'

// Get XRPL client
const client = await xrplClientManager.getClient('TESTNET')

// Create service instance
const credentialService = new XRPLCredentialService(client)
```

## Basic Usage

### Issue a Credential

```typescript
import { Wallet } from 'xrpl'

// Issuer wallet
const issuerWallet = Wallet.fromSeed('sXXXXXXXXXXXXXXXXXXXXX')

// Issue credential
const result = await credentialService.issueCredential(issuerWallet, {
  subject: 'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz',
  credentialType: 'KYC_VERIFIED',
  data: {
    level: 'enhanced',
    verifiedAt: new Date().toISOString(),
    jurisdiction: 'US',
    verificationMethod: 'document_check'
  },
  expiration: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
})

console.log('Credential ID:', result.credentialId)
console.log('Transaction:', result.transactionHash)
```

### Accept a Credential

```typescript
// Subject wallet
const subjectWallet = Wallet.fromSeed('sYYYYYYYYYYYYYYYYYYYYY')

// Accept credential
const acceptResult = await credentialService.acceptCredential(subjectWallet, {
  credentialId: 'ABC123...'
})

console.log('Accepted:', acceptResult.transactionHash)
```

### Verify a Credential

```typescript
// Verify credential validity
const verification = await credentialService.verifyCredential('ABC123...')

console.log('Is Valid:', verification.isValid)
console.log('Is Expired:', verification.isExpired)
console.log('Issuer:', verification.issuer)
console.log('Subject:', verification.subject)
console.log('Type:', verification.credentialType)
console.log('Data:', verification.data)
```

### Get Account Credentials

```typescript
// Get all credentials for an account
const credentials = await credentialService.getAccountCredentials(
  'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz'
)

credentials.forEach(cred => {
  console.log('Credential ID:', cred.credentialId)
  console.log('Type:', cred.credentialType)
  console.log('Issuer:', cred.issuer)
  console.log('Subject:', cred.subject)
})
```

## Advanced Usage

### Filter Issued vs Received Credentials

```typescript
const address = 'rN7n7otQDd6FczFgLdllqpBayJvTpJNTjQz'

// Get only credentials issued by this address
const issued = await credentialService.getIssuedCredentials(address)

// Get only credentials received by this address
const received = await credentialService.getReceivedCredentials(address)
```

### Delete a Credential

```typescript
// Issuer or subject can delete
const deleteResult = await credentialService.deleteCredential(wallet, {
  credentialId: 'ABC123...'
})
```

### Comprehensive Verification

```typescript
// Get full verification result with timestamp
const verificationResult = await credentialService.performCredentialVerification(
  'ABC123...'
)

console.log('Verification Result:', verificationResult)
console.log('Verified At:', verificationResult.verifiedAt)
```

## Credential Types

Define credential types based on your use case:

- `KYC_VERIFIED` - Identity verification
- `ACCREDITED_INVESTOR` - Investment qualifications
- `MEMBERSHIP_ACTIVE` - Organization membership
- `LICENSE_HOLDER` - Professional licenses
- `AUDIT_PASSED` - Compliance audits
- Custom types as needed

## Credential Data Structure

Credential data is stored as JSON and can contain any structured information:

```typescript
{
  level: 'enhanced',
  verifiedAt: '2025-01-16T00:00:00Z',
  jurisdiction: 'US',
  attributes: {
    name: true,
    address: true,
    identity: true
  }
}
```

## Expiration

Credentials can have optional expiration timestamps (Unix seconds):

```typescript
const oneYear = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
const oneMonth = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
```

## Database Schema

Credentials are tracked in the database:

### `xrpl_credentials` Table
- `credential_id` - On-chain credential ID
- `issuer_address` - Credential issuer
- `subject_address` - Credential subject
- `credential_type` - Type of credential
- `data_json` - Credential data
- `status` - active/deleted
- `is_accepted` - Subject acceptance status
- `expiration` - Expiration timestamp
- `is_expired` - Auto-computed expiration status

### `xrpl_credential_verifications` Table
- Tracks verification checks
- Records verifier, result, and confidence score

## Error Handling

```typescript
try {
  const result = await credentialService.issueCredential(issuer, params)
} catch (error) {
  if (error.message.includes('tesSUCCESS')) {
    console.error('Transaction failed:', error.message)
  } else if (error.message.includes('not found')) {
    console.error('Credential not found')
  }
}
```

## Best Practices

1. **Validate Addresses**: Always validate XRPL addresses before operations
2. **Check Expiration**: Verify credentials aren't expired before relying on them
3. **Store Off-Chain Data**: Use database for quick access to credential data
4. **Monitor On-Chain**: Track blockchain confirmations for credential operations
5. **Implement Revocation**: Use delete functionality to revoke credentials
6. **Verify Regularly**: Re-verify credentials periodically for active systems

## Security Considerations

- Private keys should never be exposed or logged
- Credentials are publicly visible on-chain
- Don't store sensitive personal data directly in credentials
- Use reference IDs to link to off-chain sensitive data
- Implement proper access control for issuer wallets

## Testing

Test on TESTNET before production:

```typescript
const client = await xrplClientManager.getClient('TESTNET')
const service = new XRPLCredentialService(client)
```

## Related Services

- **XRPLClientManager** - XRPL network connection management
- **XRPLKeyDerivationService** - Wallet key generation
- **XRPLSecureSigningService** - Transaction signing

## Resources

- [XRPL Credentials Documentation](https://xrpl.org/docs/concepts/tokens/decentralized-identifiers/credentials)
- [XRPL Transaction Types](https://xrpl.org/transaction-types.html)
- [XRPL Dev Portal](https://xrpl.org)
