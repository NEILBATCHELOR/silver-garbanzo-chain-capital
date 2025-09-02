import { ProfileType } from '@/types/core/database';

export interface ProfileTypeOption {
  value: ProfileType;
  label: string;
  description: string;
}

export const PROFILE_TYPE_OPTIONS: ProfileTypeOption[] = [
  {
    value: 'service provider' as ProfileType,
    label: 'Service Provider',
    description: 'Provides services within the platform'
  },
  {
    value: 'issuer' as ProfileType,
    label: 'Issuer',
    description: 'Issues tokens or securities'
  },
  {
    value: 'investor' as ProfileType,
    label: 'Investor',
    description: 'Invests in tokens or securities'
  },
  {
    value: 'super admin' as ProfileType,
    label: 'Super Admin',
    description: 'Has full administrative privileges'
  }
];

/**
 * Formats profile type for display
 */
export function formatProfileTypeForDisplay(profileType?: ProfileType | null): string {
  if (!profileType) return 'Not Set';
  
  const option = PROFILE_TYPE_OPTIONS.find(opt => opt.value === profileType);
  return option?.label || profileType;
}

/**
 * Gets profile type description
 */
export function getProfileTypeDescription(profileType: ProfileType): string {
  const option = PROFILE_TYPE_OPTIONS.find(opt => opt.value === profileType);
  return option?.description || '';
}
