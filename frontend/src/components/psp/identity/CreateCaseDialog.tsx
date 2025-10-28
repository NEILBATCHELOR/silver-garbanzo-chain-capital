/**
 * Create Identity Case Dialog Component
 * Multi-step wizard for creating KYB/KYC cases
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { BusinessData, PersonData, LegalEntityType, BusinessPersonRole } from '@/types/psp'

interface CreateCaseDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { business: BusinessData; persons: PersonData[] }) => Promise<void>
  projectId: string
}

export function CreateCaseDialog({ open, onClose, onSubmit, projectId }: CreateCaseDialogProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [business, setBusiness] = useState<Partial<BusinessData>>({
    legalEntityType: 'LLC',
    countryOfFormation: 'US'
  })
  
  const [person, setPerson] = useState<Partial<PersonData>>({
    role: 'BeneficialOwner',
    address: {
      street1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  })

  const handleSubmit = async () => {
    if (!business.legalName || !business.registeredAddress || !person.email) {
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        business: business as BusinessData,
        persons: [person as PersonData]
      })
      onClose()
      resetForm()
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setBusiness({ legalEntityType: 'LLC', countryOfFormation: 'US' })
    setPerson({
      role: 'BeneficialOwner',
      address: { street1: '', city: '', state: '', postalCode: '', country: 'US' }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Identity Verification Case</DialogTitle>
          <DialogDescription>
            Step {step} of 2: {step === 1 ? 'Business Information' : 'Beneficial Owner'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Business Name *</Label>
                <Input
                  id="legalName"
                  value={business.legalName || ''}
                  onChange={(e) => setBusiness({ ...business, legalName: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">DBA Name</Label>
                <Input
                  id="name"
                  value={business.name || ''}
                  onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                  placeholder="Acme Co"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description *</Label>
              <Textarea
                id="description"
                value={business.description || ''}
                onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                placeholder="Brief description of business activities"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID (EIN) *</Label>
                <Input
                  id="taxId"
                  value={business.taxId || ''}
                  onChange={(e) => setBusiness({ ...business, taxId: e.target.value })}
                  placeholder="12-3456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number *</Label>
                <Input
                  id="registrationNumber"
                  value={business.registrationNumber || ''}
                  onChange={(e) => setBusiness({ ...business, registrationNumber: e.target.value })}
                  placeholder="State registration number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalEntityType">Entity Type *</Label>
                <Select
                  value={business.legalEntityType}
                  onValueChange={(value) => setBusiness({ ...business, legalEntityType: value as LegalEntityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLC">LLC</SelectItem>
                    <SelectItem value="CCorp">C Corporation</SelectItem>
                    <SelectItem value="SCorp">S Corporation</SelectItem>
                    <SelectItem value="Partnership">Partnership</SelectItem>
                    <SelectItem value="SoleProprietorship">Sole Proprietorship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incorporationDate">Incorporation Date *</Label>
                <Input
                  id="incorporationDate"
                  type="date"
                  value={business.incorporationDate || ''}
                  onChange={(e) => setBusiness({ ...business, incorporationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={business.email || ''}
                  onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                  placeholder="contact@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={business.phoneNumber || ''}
                  onChange={(e) => setBusiness({ ...business, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stateOfFormation">State of Formation *</Label>
              <Input
                id="stateOfFormation"
                value={business.stateOfFormation || ''}
                onChange={(e) => setBusiness({ ...business, stateOfFormation: e.target.value })}
                placeholder="DE"
              />
            </div>

            <div className="space-y-2">
              <Label>Registered Address *</Label>
              <div className="grid gap-2">
                <Input
                  placeholder="Street Address"
                  value={business.registeredAddress?.street1 || ''}
                  onChange={(e) => setBusiness({
                    ...business,
                    registeredAddress: { ...business.registeredAddress!, street1: e.target.value }
                  })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={business.registeredAddress?.city || ''}
                    onChange={(e) => setBusiness({
                      ...business,
                      registeredAddress: { ...business.registeredAddress!, city: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="State"
                    value={business.registeredAddress?.state || ''}
                    onChange={(e) => setBusiness({
                      ...business,
                      registeredAddress: { ...business.registeredAddress!, state: e.target.value }
                    })}
                  />
                </div>
                <Input
                  placeholder="Postal Code"
                  value={business.registeredAddress?.postalCode || ''}
                  onChange={(e) => setBusiness({
                    ...business,
                    registeredAddress: { ...business.registeredAddress!, postalCode: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={person.firstName || ''}
                  onChange={(e) => setPerson({ ...person, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={person.lastName || ''}
                  onChange={(e) => setPerson({ ...person, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personEmail">Email *</Label>
                <Input
                  id="personEmail"
                  type="email"
                  value={person.email || ''}
                  onChange={(e) => setPerson({ ...person, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personPhone">Phone Number</Label>
                <Input
                  id="personPhone"
                  value={person.phoneNumber || ''}
                  onChange={(e) => setPerson({ ...person, phoneNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={person.role}
                  onValueChange={(value) => setPerson({ ...person, role: value as BusinessPersonRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BeneficialOwner">Beneficial Owner</SelectItem>
                    <SelectItem value="ControlPerson">Control Person</SelectItem>
                    <SelectItem value="AuthorizedSigner">Authorized Signer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthdate">Date of Birth</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={person.birthdate || ''}
                  onChange={(e) => setPerson({ ...person, birthdate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssn">SSN (Last 4 digits)</Label>
              <Input
                id="ssn"
                value={person.ssn || ''}
                onChange={(e) => setPerson({ ...person, ssn: e.target.value })}
                placeholder="1234"
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Address *</Label>
              <div className="grid gap-2">
                <Input
                  placeholder="Street Address"
                  value={person.address?.street1 || ''}
                  onChange={(e) => setPerson({
                    ...person,
                    address: { ...person.address!, street1: e.target.value }
                  })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={person.address?.city || ''}
                    onChange={(e) => setPerson({
                      ...person,
                      address: { ...person.address!, city: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="State"
                    value={person.address?.state || ''}
                    onChange={(e) => setPerson({
                      ...person,
                      address: { ...person.address!, state: e.target.value }
                    })}
                  />
                </div>
                <Input
                  placeholder="Postal Code"
                  value={person.address?.postalCode || ''}
                  onChange={(e) => setPerson({
                    ...person,
                    address: { ...person.address!, postalCode: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(2)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Case'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
