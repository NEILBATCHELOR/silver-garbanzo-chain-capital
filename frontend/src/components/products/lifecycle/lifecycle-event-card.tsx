import React, { useState } from 'react';
import { getProductSpecificEventCard } from './product-specific-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Hash, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MoreVertical,
  CheckSquare
} from 'lucide-react';
import { 
  ProductLifecycleEvent, 
  EventStatus, 
  LifecycleEventType 
} from '@/types/products';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LifecycleEventCardProps {
  event: ProductLifecycleEvent;
  onStatusChange?: (eventId: string, newStatus: EventStatus) => void;
  onDelete?: (eventId: string) => void;
  onEdit?: (event: ProductLifecycleEvent) => void;
  className?: string;
  productType?: string; // Added to determine which specific card to use
}

/**
 * Card component for displaying a single product lifecycle event
 */
const LifecycleEventCard: React.FC<LifecycleEventCardProps> = ({ 
  event, 
  onStatusChange, 
  onDelete, 
  onEdit,
  className,
  productType
}) => {
  // If a product type is provided, check if there's a specific card component for it
  const ProductSpecificEventCard = productType ? getProductSpecificEventCard(productType) : null;
  
  // If we have a product-specific card for this event type, use it
  if (ProductSpecificEventCard) {
    return (
      <ProductSpecificEventCard
        event={event}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    );
  }
  
  // Otherwise, fall back to the default card
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Get event type display name
  const getEventTypeDisplay = (type: LifecycleEventType): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            {getEventTypeDisplay(event.eventType)}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(event.status)} text-white font-semibold`}
          >
            <span className="flex items-center">
              {getStatusIcon(event.status)}
              <span className="ml-1">{event.status}</span>
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(event.eventDate, 'PPP')}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{format(event.eventDate, 'p')}</span>
          </div>
          
          {event.quantity !== undefined && event.quantity !== null && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Quantity: {event.quantity.toLocaleString()}</span>
            </div>
          )}
          
          {event.actor && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Actor: {event.actor}</span>
            </div>
          )}
          
          {event.transactionHash && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Hash className="w-4 h-4" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      Tx: {event.transactionHash.substring(0, 8)}...{event.transactionHash.substring(event.transactionHash.length - 8)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{event.transactionHash}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          
          {event.details && (
            <div className="flex items-start space-x-2 text-muted-foreground">
              <FileText className="w-4 h-4 mt-1" />
              <span className="flex-1">{event.details}</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        {(onStatusChange || onEdit || onDelete) && (
          <div className="flex justify-end mt-4 space-x-2">
            {onStatusChange && (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-blue-500 hover:text-blue-700 text-sm" disabled={isChangingStatus}>
                  {isChangingStatus ? (
                    <span className="flex items-center">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Status
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.values(EventStatus).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={event.status === status || isChangingStatus}
                      onClick={async () => {
                        if (onStatusChange) {
                          setIsChangingStatus(true);
                          try {
                            await onStatusChange(event.id, status);
                          } finally {
                            setIsChangingStatus(false);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                        {status}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(event)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(event.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LifecycleEventCard;
