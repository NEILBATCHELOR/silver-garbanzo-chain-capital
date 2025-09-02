'use client';

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { OperationsRedemptionForm, RedemptionRequestDetails } from '@/components/redemption';

const OperationsRedemptionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get('request');

  const handleSuccess = (redemption: any) => {
    console.log('Redemption request created:', redemption);
    // Could add a toast notification here
    alert('Redemption request created successfully!');
  };

  const handleBack = () => {
    navigate('/redemption');
  };

  const handleEdit = () => {
    // For now, just show a message. Could implement edit functionality later
    alert('Edit functionality would be implemented here');
  };

  const handleCancel = () => {
    // For now, just show a message. Could implement cancel functionality later
    alert('Cancel functionality would be implemented here');
  };

  const handleClose = () => {
    navigate('/redemption');
  };

  // If request ID is provided, show the request details
  if (requestId) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Redemption Request Details</h1>
            <p className="text-muted-foreground mt-2">
              View detailed information about this redemption request
            </p>
          </div>
          
          <RedemptionRequestDetails
            redemptionId={requestId}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onClose={handleClose}
          />
        </div>
      </div>
    );
  }

  // Otherwise, show the form to create a new request
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Operations: Create Redemption Request
          </h1>
          <p className="text-muted-foreground mt-2">
            Create redemption requests for any investor. No eligibility checks - all requests go directly to approval queue.
          </p>
        </div>
        
        <OperationsRedemptionForm 
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default OperationsRedemptionPage;