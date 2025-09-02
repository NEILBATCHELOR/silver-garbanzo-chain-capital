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
  TrendingUp,
  ArrowDown,
  Briefcase,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatNumber, formatPercent } from '@/utils/formatters';

interface PrivateEquityDebtEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for private equity and private debt products
 */
const PrivateEquityDebtEventCard: React.FC<PrivateEquityDebtEventCardProps> = ({
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

  // Special visualization for capital call events
  if (event.eventType === LifecycleEventType.DEPOSIT) {
    return (
      <Card className="border-blue-500 overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-blue-500" />
              Capital Call
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
              <div className="text-2xl font-bold text-blue-500 mt-2 text-center">
                {formatCurrency(event.quantity, 'USD')}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className="text-xs text-muted-foreground">Call Number</div>
                <div className="text-base">
                  {event.details?.match(/Call #(\d+)/)?.[1] || "1"}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Due Date</div>
                <div className="text-base">
                  {event.details?.match(/Due: ([A-Za-z]+ \d+, \d{4})/)?.[1] || 
                   format(new Date(event.eventDate.getTime() + 1000 * 60 * 60 * 24 * 30), 'PPP')}
                </div>
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
  
  // Special visualization for distribution events
  if (event.eventType === LifecycleEventType.DIVIDEND_PAYMENT) {
    return (
      <Card className="border-green-500 overflow-hidden">
        <div className="bg-green-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Distribution
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
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <div className="text-xs text-muted-foreground">Distribution Type</div>
                <div className="text-base">
                  {event.details?.includes('Income') ? 'Income' : 
                   event.details?.includes('Return of Capital') ? 'Return of Capital' : 
                   event.details?.includes('Capital Gain') ? 'Capital Gain' : 
                   'Standard'}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Distribution Number</div>
                <div className="text-base">
                  {event.details?.match(/Distribution #(\d+)/)?.[1] || "1"}
                </div>
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
  
  // Special visualization for valuation events
  if (event.eventType === LifecycleEventType.VALUATION) {
    return (
      <Card className="border-purple-500 overflow-hidden">
        <div className="bg-purple-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
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
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              {event.quantity && (
                <div>
                  <div className="text-xs text-muted-foreground">NAV</div>
                  <div className="text-xl font-bold text-purple-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-muted-foreground">Change</div>
                <div className={`text-lg font-medium ${
                  event.details?.includes('+') ? 'text-green-500' : 'text-red-500'
                }`}>
                  {event.details?.split('|')[1] || '0.00%'}
                </div>
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
  
  // Special visualization for exit events
  if (event.eventType === LifecycleEventType.REDEMPTION) {
    return (
      <Card className="border-indigo-500 overflow-hidden">
        <div className="bg-indigo-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              Investment Exit
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
            
            <div className="mt-3">
              <div className="text-sm mb-1 font-medium">Exit Type</div>
              <div className="text-base">
                {event.details?.includes('IPO') ? 'Initial Public Offering' : 
                 event.details?.includes('M&A') ? 'Merger & Acquisition' : 
                 event.details?.includes('Secondary') ? 'Secondary Sale' : 
                 event.details?.includes('Buyback') ? 'Buyback' : 
                 'Complete Exit'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              {event.quantity && (
                <div>
                  <div className="text-xs text-muted-foreground">Proceeds</div>
                  <div className="text-xl font-bold text-indigo-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-muted-foreground">Multiple</div>
                <div className="text-lg font-medium text-indigo-500">
                  {event.details?.match(/(\d+\.\d+)x/)?.[1] || "1.0"}x
                </div>
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
  
  // Special visualization for investment (issuance) events
  if (event.eventType === LifecycleEventType.ISSUANCE) {
    return (
      <Card className="border-teal-500 overflow-hidden">
        <div className="bg-teal-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-500" />
              New Investment
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
              <div className="mt-3">
                <div className="text-sm mb-1 font-medium">Investment Amount</div>
                <div className="text-xl font-bold text-teal-500">
                  {formatCurrency(event.quantity, 'USD')}
                </div>
              </div>
            )}
            
            <div className="bg-teal-50 p-2 rounded-md border border-teal-200 mt-2">
              <div className="text-sm font-medium mb-1">Investment Details</div>
              <div className="text-sm">
                {event.details?.split('|')[1] || 'New portfolio company investment'}
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

export default PrivateEquityDebtEventCard;