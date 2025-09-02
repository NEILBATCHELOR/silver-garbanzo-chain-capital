import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  DollarSign,
  BarChart,
  RefreshCw,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface FundProductEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for fund products (ETFs, mutual funds, etc.)
 */
const FundProductEventCard: React.FC<FundProductEventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  // Get status color based on event status
  const getStatusColor = (status: EventStatus): string => {
    switch (status) {
      case EventStatus.SUCCESS:
        return 'bg-green-500';
      case EventStatus.PENDING:
        return 'bg-amber-500';
      case EventStatus.PROCESSING:
        return 'bg-blue-500';
      case EventStatus.FAILED:
        return 'bg-red-500';
      case EventStatus.CANCELLED:
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Get status icon based on event status
  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case EventStatus.SUCCESS:
        return <CheckCircle className="w-4 h-4" />;
      case EventStatus.PENDING:
        return <AlertCircle className="w-4 h-4" />;
      case EventStatus.PROCESSING:
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case EventStatus.FAILED:
        return <XCircle className="w-4 h-4" />;
      case EventStatus.CANCELLED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Special visualization for NAV updates (valuation events)
  if (event.eventType === LifecycleEventType.VALUATION) {
    return (
      <Card className="border-blue-500 overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-500" />
              NAV Update
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(event.status)} text-white`}
            >
              <span className="flex items-center">
                {getStatusIcon(event.status)}
                <span className="ml-1">{event.status}</span>
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(event.eventDate, 'PPP p')}</span>
            </div>
            
            {event.details && (
              <div className="text-sm text-muted-foreground">
                {event.details}
              </div>
            )}
            
            {event.quantity && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground">NAV per Share</div>
                  <div className="text-xl font-bold text-blue-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Change</div>
                  <div className={`text-lg font-medium ${
                    event.details?.includes('+') ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {event.details?.split('|')[1] || '0.00%'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <div className="flex space-x-2">
                {onEdit && (
                  <button 
                    onClick={() => onEdit(event)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(event.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for distribution events
  if (event.eventType === LifecycleEventType.DIVIDEND_PAYMENT) {
    return (
      <Card className="border-green-500 overflow-hidden">
        <div className="bg-green-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Fund Distribution
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(event.status)} text-white`}
            >
              <span className="flex items-center">
                {getStatusIcon(event.status)}
                <span className="ml-1">{event.status}</span>
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(event.eventDate, 'PPP p')}</span>
            </div>
            
            {event.details && (
              <div className="text-sm text-muted-foreground">
                {event.details}
              </div>
            )}
            
            {event.quantity && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Distribution Amount</div>
                  <div className="text-xl font-bold text-green-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Distribution Type</div>
                  <div className="text-base">
                    {event.details?.includes('Income') ? 'Income' : 
                     event.details?.includes('Capital') ? 'Capital Gains' : 
                     'Standard'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <div className="flex space-x-2">
                {onEdit && (
                  <button 
                    onClick={() => onEdit(event)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(event.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for rebalance events
  if (event.eventType === LifecycleEventType.REBALANCE) {
    return (
      <Card className="border-purple-500 overflow-hidden">
        <div className="bg-purple-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              Fund Rebalance
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(event.status)} text-white`}
            >
              <span className="flex items-center">
                {getStatusIcon(event.status)}
                <span className="ml-1">{event.status}</span>
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(event.eventDate, 'PPP p')}</span>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
              <p className="text-sm text-purple-800">
                {event.details || "Portfolio rebalanced to maintain target allocations."}
              </p>
            </div>

            {/* Show changes in allocation if available in details */}
            {event.details?.includes('changes') && (
              <div className="mt-2 text-sm">
                <div className="font-medium mb-1">Major Changes:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {event.details.split('|')[1].split(',').map((change, i) => (
                    <li key={i}>{change.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <div className="flex space-x-2">
                {onEdit && (
                  <button 
                    onClick={() => onEdit(event)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(event.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Special visualization for creation/redemption events
  if (event.eventType === LifecycleEventType.ISSUANCE || event.eventType === LifecycleEventType.REDEMPTION) {
    const isCreation = event.eventType === LifecycleEventType.ISSUANCE;
    
    return (
      <Card className={`border-${isCreation ? 'teal' : 'amber'}-500 overflow-hidden`}>
        <div className={`bg-${isCreation ? 'teal' : 'amber'}-500 h-1.5 w-full`}></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className={`h-5 w-5 text-${isCreation ? 'teal' : 'amber'}-500`} />
              {isCreation ? 'Share Creation' : 'Share Redemption'}
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(event.status)} text-white`}
            >
              <span className="flex items-center">
                {getStatusIcon(event.status)}
                <span className="ml-1">{event.status}</span>
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{format(event.eventDate, 'PPP p')}</span>
            </div>
            
            {event.details && (
              <div className="text-sm">
                {event.details}
              </div>
            )}
            
            {event.quantity && (
              <div className="mt-3">
                <div className="text-sm mb-1 font-medium">
                  {isCreation ? 'Shares Created' : 'Shares Redeemed'}
                </div>
                <div className={`text-xl font-bold text-${isCreation ? 'teal' : 'amber'}-500`}>
                  {formatNumber(event.quantity)}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <div className="flex space-x-2">
                {onEdit && (
                  <button 
                    onClick={() => onEdit(event)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(event.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Use standard event card for other event types
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">
            {event.eventType.split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{format(event.eventDate, 'PPP p')}</span>
          </div>
          
          {event.details && (
            <div className="text-sm">
              {event.details}
            </div>
          )}
          
          {event.quantity !== undefined && event.quantity !== null && (
            <div className="text-sm">
              <span className="text-muted-foreground">Amount:</span> {formatCurrency(event.quantity, 'USD')}
            </div>
          )}
          
          {event.actor && (
            <div className="text-sm">
              <span className="text-muted-foreground">Actor:</span> {event.actor}
            </div>
          )}

          <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
            <div className="flex space-x-2">
              {onEdit && (
                <button 
                  onClick={() => onEdit(event)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(event.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to format number with commas
const formatNumber = (value?: number, decimalPlaces = 0): string => {
  if (value === undefined || value === null) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(value);
};

export default FundProductEventCard;