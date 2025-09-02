import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { RedemptionRequestDetails } from './RedemptionRequestDetails';

interface RedemptionRequestDetailsPageProps {
  className?: string;
}

/**
 * Route wrapper component for RedemptionRequestDetails
 * Extracts requestId from URL parameters and handles navigation
 */
export const RedemptionRequestDetailsPage: React.FC<RedemptionRequestDetailsPageProps> = ({
  className = ''
}) => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  if (!requestId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-4">No redemption request ID provided</p>
          <Button onClick={() => navigate('/redemption')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Redemption Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    navigate('/redemption');
  };

  return (
    <div className={`container mx-auto py-6 ${className}`}>
      {/* Back Navigation */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={handleClose}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Redemption Dashboard
        </Button>
      </div>

      {/* Redemption Request Details */}
      <RedemptionRequestDetails 
        redemptionId={requestId}
        onClose={handleClose}
        className="max-w-none"
      />
    </div>
  );
};

export default RedemptionRequestDetailsPage;
