/**
 * Case Details Component
 * Displays detailed information about an identity verification case
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, User, MapPin, Calendar, AlertCircle } from 'lucide-react'
import type { PspIdentityCase, CaseStatus } from '@/types/psp'
import { format } from 'date-fns'

interface CaseDetailsProps {
  identityCase: PspIdentityCase
}

const statusColors: Record<CaseStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  in_review: 'bg-blue-500/10 text-blue-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  review_required: 'bg-orange-500/10 text-orange-500'
}

export function CaseDetails({ identityCase }: CaseDetailsProps) {
  const business = identityCase.business_data
  const persons = identityCase.persons_data || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verification Status</CardTitle>
              <CardDescription>Current case status and details</CardDescription>
            </div>
            <Badge variant="outline" className={statusColors[identityCase.status]}>
              {identityCase.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {identityCase.warp_case_id && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Warp Case ID</div>
              <div className="font-mono text-sm">{identityCase.warp_case_id}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-sm">{format(new Date(identityCase.created_at), 'PPp')}</div>
            </div>
            {identityCase.submitted_at && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Submitted</div>
                <div className="text-sm">{format(new Date(identityCase.submitted_at), 'PPp')}</div>
              </div>
            )}
          </div>

          {identityCase.approved_at && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Approved</div>
              <div className="text-sm">{format(new Date(identityCase.approved_at), 'PPp')}</div>
            </div>
          )}

          {identityCase.rejected_at && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Rejected</div>
              <div className="text-sm">{format(new Date(identityCase.rejected_at), 'PPp')}</div>
            </div>
          )}

          {identityCase.next_steps && identityCase.next_steps.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Next Steps</div>
              <ul className="list-disc list-inside space-y-1">
                {identityCase.next_steps.map((step, i) => (
                  <li key={i} className="text-sm">{step}</li>
                ))}
              </ul>
            </div>
          )}

          {identityCase.missing_fields && identityCase.missing_fields.length > 0 && (
            <div className="rounded-md bg-yellow-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Missing Fields</div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {identityCase.missing_fields.map((field, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {identityCase.rejection_reasons && identityCase.rejection_reasons.length > 0 && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Rejection Reasons</div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {identityCase.rejection_reasons.map((reason, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {business && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Business Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Legal Name</div>
                <div className="font-medium">{business.legalName}</div>
              </div>
              {business.name && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">DBA Name</div>
                  <div>{business.name}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="text-sm">{business.description}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tax ID</div>
                <div className="font-mono text-sm">{business.taxId}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Entity Type</div>
                <div className="text-sm">{business.legalEntityType}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Incorporation Date</div>
                <div className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(business.incorporationDate), 'PP')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">State of Formation</div>
                <div className="text-sm">{business.stateOfFormation}</div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Registered Address
              </div>
              <div className="text-sm">
                <div>{business.registeredAddress.street1}</div>
                {business.registeredAddress.street2 && <div>{business.registeredAddress.street2}</div>}
                <div>
                  {business.registeredAddress.city}, {business.registeredAddress.state} {business.registeredAddress.postalCode}
                </div>
                <div>{business.registeredAddress.country}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-sm">{business.email}</div>
              </div>
              {business.phoneNumber && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div className="text-sm">{business.phoneNumber}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {persons.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Beneficial Owners & Control Persons</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {persons.map((person, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-6" />}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {person.firstName} {person.lastName}
                      </div>
                      <Badge variant="outline">{person.role}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Email</div>
                        <div className="text-sm">{person.email}</div>
                      </div>
                      {person.phoneNumber && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Phone</div>
                          <div className="text-sm">{person.phoneNumber}</div>
                        </div>
                      )}
                    </div>

                    {person.birthdate && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                        <div className="text-sm">{format(new Date(person.birthdate), 'PP')}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Address</div>
                      <div className="text-sm">
                        <div>{person.address.street1}</div>
                        {person.address.street2 && <div>{person.address.street2}</div>}
                        <div>
                          {person.address.city}, {person.address.state} {person.address.postalCode}
                        </div>
                        <div>{person.address.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
