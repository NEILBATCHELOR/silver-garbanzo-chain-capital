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
  Share2,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatPercent } from '@/utils/formatters';

interface EquityProductEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for equity products
 */
const EquityProductEventCard: React.FC<EquityProductEventCardProps> = ({
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

  // Special visualization for dividend payments
  if (event.eventType === LifecycleEventType.DIVIDEND_PAYMENT) {
    return (
      <Card className="border-green-500 overflow-hidden">
        <div className="bg-green-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Dividend Payment
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
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              {event.quantity && (
                <div>
                  <div className="text-xs text-muted-foreground">Amount per Share</div>
                  <div className="text-xl font-bold text-green-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-muted-foreground">Dividend Type</div>
                <div className="text-base">Regular Cash</div>
              </div>
            </div>

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
  
  // Special visualization for stock split events
  if (event.eventType === LifecycleEventType.REBALANCE) {
    return (
      <Card className="border-blue-500 overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              Stock Split
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
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <p className="text-sm text-blue-800">
                {event.details || "Stock split has been processed. Share count updated accordingly."}
              </p>
            </div>

            {event.quantity && (
              <div className="grid grid-cols-3 gap-2 items-center justify-center mt-2">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Before</div>
                  <div className="text-base">1 share</div>
                </div>
                <div className="text-center">
                  <Share2 className="w-5 h-5 mx-auto text-blue-500" />
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">After</div>
                  <div className="text-base font-bold text-blue-500">{event.quantity} shares</div>
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
  
  // Special visualization for valuation events
  if (event.eventType === LifecycleEventType.VALUATION) {
    return (
      <Card className="border-purple-500 overflow-hidden">
        <div className="bg-purple-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="h-5 w-5 text-purple-500" />
              Valuation Update
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
                <div className="text-sm mb-1 font-medium">Share Price</div>
                <div className="text-xl font-bold text-purple-500">
                  {formatCurrency(event.quantity, 'USD')}
                </div>
                
                {/* Visualization of price change */}
                <div className="flex items-center mt-1">
                  <div className={`text-sm ${parseFloat(event.details?.split(' ')[0] || '0') > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {event.details?.split('|')[1]}
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
  
  // Special visualization for acquisition events
  if (event.eventType === LifecycleEventType.REDEMPTION) {
    return (
      <Card className="border-indigo-500 overflow-hidden">
        <div className="bg-indigo-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              Acquisition / Merger
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
                <div className="text-sm mb-1 font-medium">Acquisition Price</div>
                <div className="text-xl font-bold text-indigo-500">
                  {formatCurrency(event.quantity, 'USD')} per share
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

export default EquityProductEventCard;