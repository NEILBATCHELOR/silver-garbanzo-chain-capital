/**
 * PSP Identity Types
 * Types for KYB/KYC identity verification
 */

export type CaseType = 'individual' | 'business'

export type CaseStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'review_required'

export type BusinessPersonRole =
  | 'BeneficialOwner'
  | 'ControlPerson'
  | 'Accountant'
  | 'LegalRepresentative'
  | 'AuthorizedSigner'
  | 'ComplianceOfficer'
  | 'Partner'
  | 'Trustee'

export type LegalEntityType =
  | 'CCorp'
  | 'SCorp'
  | 'LLC'
  | 'Partnership'
  | 'SoleProprietorship'
  | 'NonProfit'
  | 'GovernmentEntity'

export type BusinessRegulatoryStatus =
  | 'USRegulated'
  | 'IntlRegulated'
  | 'NonRegulated'

export type EmploymentStatus =
  | 'Employed'
  | 'SelfEmployed'
  | 'Unemployed'
  | 'Retired'
  | 'Student'
  | 'Other'

export interface Address {
  street1: string
  street2?: string
  district?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface BusinessData {
  name?: string
  legalName: string
  description: string
  taxId: string
  registrationNumber: string
  industry?: string
  phoneNumber?: string
  email: string
  website?: string
  legalEntityType: LegalEntityType
  incorporationDate: string
  stateOfFormation: string
  countryOfFormation: string
  regulatoryStatus?: BusinessRegulatoryStatus
  regulatoryAuthority?: string
  regulatorJurisdiction?: string
  regulatorRegisterNumber?: string
  nicCode?: string
  tradingType?: string
  monthlyTransactionVolume?: string
  registeredAddress: Address
  physicalAddress: Address
}

export interface PersonData {
  firstName?: string
  firstName2?: string
  middleName?: string
  lastName?: string
  lastName2?: string
  email: string
  phoneNumber?: string
  ssn?: string
  idNumber?: string
  birthdate?: string
  employmentStatus?: EmploymentStatus
  industry?: string
  occupation?: string
  annualIncome?: number
  incomeSource?: string
  wealthSource?: string
  address: Address
  role: BusinessPersonRole
}

export interface PspIdentityCase {
  id: string
  project_id: string
  warp_case_id: string | null
  case_type: CaseType
  status: CaseStatus
  business_data: BusinessData | null
  persons_data: PersonData[] | null
  verification_results: Record<string, any> | null
  next_steps: string[] | null
  missing_fields: string[] | null
  rejection_reasons: string[] | null
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateIdentityCaseRequest {
  project_id: string
  case_type: CaseType
  business: BusinessData
  persons: PersonData[]
}

export interface UpdatePersonRequest {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  ssn?: string
  birthdate?: string
  address?: Address
}

export interface UpdateBusinessRequest {
  name?: string
  legalName?: string
  description?: string
  email?: string
  phoneNumber?: string
  website?: string
  registeredAddress?: Address
  physicalAddress?: Address
}

export interface IdentityCasesSummary {
  total_count: number
  by_status: Record<CaseStatus, number>
  recent_cases: PspIdentityCase[]
}
