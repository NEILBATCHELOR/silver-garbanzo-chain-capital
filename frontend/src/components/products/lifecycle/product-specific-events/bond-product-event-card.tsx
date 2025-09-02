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
  Landmark,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface BondProductEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for bond products
 */
const BondProductEventCard: React.FC<BondProductEventCardProps> = ({
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

  // Special visualization for coupon payments
  if (event.eventType === LifecycleEventType.COUPON_PAYMENT) {
    return (
      <Card className="border-green-500 overflow-hidden">
        <div className="bg-green-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Bond Coupon Payment
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
              <div className="text-2xl font-bold text-green-500 mt-2 text-center">
                {formatCurrency(event.quantity, 'USD')}
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
  
  // Special visualization for maturity events
  if (event.eventType === LifecycleEventType.MATURITY) {
    return (
      <Card className="border-blue-500 overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-500" />
              Bond Maturity
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
              <div className="text-sm font-medium">
                {event.details}
              </div>
            )}
            
            {event.quantity && (
              <div className="mt-3">
                <div className="text-sm mb-1 font-medium">Principal Repayment</div>
                <div className="text-xl font-bold text-blue-500">
                  {formatCurrency(event.quantity, 'USD')}
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

  // Special visualization for call events
  if (event.eventType === LifecycleEventType.CALL) {
    return (
      <Card className="border-amber-500 overflow-hidden">
        <div className="bg-amber-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Bond Called
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
            
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
              <p className="text-sm text-amber-800">
                This bond has been called early by the issuer. Redemption will be processed according to the call terms.
              </p>
            </div>
            
            {event.details && (
              <div className="text-sm">
                {event.details}
              </div>
            )}
            
            {event.quantity && (
              <div className="mt-3">
                <div className="text-sm mb-1 font-medium">Call Payment</div>
                <div className="text-xl font-bold text-amber-500">
                  {formatCurrency(event.quantity, 'USD')}
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

export default BondProductEventCard;