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
  Home,
  Wrench,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface RealEstateEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for real estate products
 */
const RealEstateEventCard: React.FC<RealEstateEventCardProps> = ({
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

  // Special visualization for property acquisition events
  if (event.eventType === LifecycleEventType.ISSUANCE) {
    return (
      <Card className="border-indigo-500 overflow-hidden">
        <div className="bg-indigo-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-indigo-500" />
              Property Acquisition
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
                <div className="text-sm mb-1 font-medium">Purchase Price</div>
                <div className="text-xl font-bold text-indigo-500">
                  {formatCurrency(event.quantity, 'USD')}
                </div>
              </div>
            )}
            
            <div className="bg-indigo-50 p-2 rounded-md border border-indigo-200 mt-2">
              <div className="text-sm font-medium mb-1">Property Details</div>
              <div className="text-sm">
                {event.details?.split('|')[1] || 'Property acquired successfully'}
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
  
  // Special visualization for property sale events
  if (event.eventType === LifecycleEventType.REDEMPTION) {
    return (
      <Card className="border-emerald-500 overflow-hidden">
        <div className="bg-emerald-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-emerald-500" />
              Property Sale
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
                  <div className="text-xs text-muted-foreground">Sale Price</div>
                  <div className="text-xl font-bold text-emerald-500">
                    {formatCurrency(event.quantity, 'USD')}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-muted-foreground">Return</div>
                <div className="text-lg font-medium text-emerald-500">
                  {event.details?.match(/(\d+\.\d+)%/)?.[1] || "0.0"}%
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
  
  // Special visualization for rental income events
  if (event.eventType === LifecycleEventType.DIVIDEND_PAYMENT) {
    return (
      <Card className="border-green-500 overflow-hidden">
        <div className="bg-green-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Rental Income
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
                <div className="text-xs text-muted-foreground">Period</div>
                <div className="text-base">
                  {event.details?.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/)?.[0] || 
                   format(new Date(event.eventDate.getFullYear(), event.eventDate.getMonth()), 'MMM yyyy')}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Occupancy</div>
                <div className="text-base">
                  {event.details?.match(/(\d+)%\s+occupancy/i)?.[1] || "100"}%
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
  
  // Special visualization for maintenance events
  if (event.eventType === LifecycleEventType.AUDIT) {
    return (
      <Card className="border-amber-500 overflow-hidden">
        <div className="bg-amber-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Maintenance/Repairs
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
                <div className="text-sm mb-1 font-medium">Cost</div>
                <div className="text-xl font-bold text-amber-500">
                  {formatCurrency(event.quantity, 'USD')}
                </div>
              </div>
            )}
            
            <div className="bg-amber-50 p-2 rounded-md border border-amber-200 flex items-center">
              <Wrench className="h-5 w-5 text-amber-500 mr-2" />
              <span className="text-sm text-amber-800">
                {event.status === EventStatus.SUCCESS ? 'Maintenance completed' : 
                 event.status === EventStatus.PROCESSING ? 'Maintenance in progress' : 
                 event.status === EventStatus.PENDING ? 'Maintenance scheduled' : 
                 'Maintenance status updated'}
              </span>
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
  
  // Special visualization for lease events
  if (event.eventType === LifecycleEventType.REBALANCE) {
    return (
      <Card className="border-blue-500 overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Lease Update
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
              <div>
                <div className="text-xs text-muted-foreground">Tenant</div>
                <div className="text-base flex items-center">
                  <User className="w-4 h-4 mr-1 text-blue-500" />
                  <span>
                    {event.details?.match(/Tenant:\s+([^,]+)/i)?.[1] || "New Tenant"}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Term</div>
                <div className="text-base">
                  {event.details?.match(/(\d+)\s+year/i)?.[1] || "1"} year(s)
                </div>
              </div>
            </div>
            
            {event.quantity && (
              <div className="mt-2">
                <div className="text-sm mb-1 font-medium">Monthly Rent</div>
                <div className="text-lg font-bold text-blue-500">
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
  
  // Special visualization for valuation events
  if (event.eventType === LifecycleEventType.VALUATION) {
    return (
      <Card className="border-purple-500 overflow-hidden">
        <div className="bg-purple-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-purple-500" />
              Property Valuation
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
                  <div className="text-xs text-muted-foreground">Valuation</div>
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

export default RealEstateEventCard;