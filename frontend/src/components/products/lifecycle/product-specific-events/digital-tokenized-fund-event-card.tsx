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
  Zap,
  Upload,
  Shield,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ProductLifecycleEvent, EventStatus, LifecycleEventType } from '@/types/products';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface DigitalTokenizedFundEventCardProps {
  event: ProductLifecycleEvent;
  onEdit?: (event: ProductLifecycleEvent) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: EventStatus) => void;
}

/**
 * Specialized event card for digital tokenized fund products
 */
const DigitalTokenizedFundEventCard: React.FC<DigitalTokenizedFundEventCardProps> = ({
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

  // Special visualization for token issuance events
  if (event.eventType === LifecycleEventType.ISSUANCE) {
    return (
      <Card className="border-indigo-500 overflow-hidden">
        <div className="bg-indigo-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-500" />
              Token Issuance
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
                  <div className="text-xs text-muted-foreground">Tokens Issued</div>
                  <div className="text-xl font-bold text-indigo-500">
                    {formatNumber(event.quantity)}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-muted-foreground">Network</div>
                <div className="text-base">
                  {event.details?.includes('Ethereum') ? 'Ethereum' : 
                   event.details?.includes('Polygon') ? 'Polygon' : 
                   event.details?.includes('Solana') ? 'Solana' : 'Blockchain'}
                </div>
              </div>
            </div>

            {event.transactionHash && (
              <div className="bg-indigo-50 p-2 rounded-md border border-indigo-200 mt-2">
                <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
                <div className="text-sm font-mono text-indigo-700 truncate">
                  {event.transactionHash}
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
  
  // Special visualization for redemption events
  if (event.eventType === LifecycleEventType.REDEMPTION) {
    return (
      <Card className="border-pink-500 overflow-hidden">
        <div className="bg-pink-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-pink-500" />
              Token Redemption
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
                <div className="text-sm mb-1 font-medium">Tokens Redeemed</div>
                <div className="text-xl font-bold text-pink-500">
                  {formatNumber(event.quantity)}
                </div>
              </div>
            )}

            {event.transactionHash && (
              <div className="bg-pink-50 p-2 rounded-md border border-pink-200 mt-2">
                <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
                <div className="text-sm font-mono text-pink-700 truncate">
                  {event.transactionHash}
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
  
  // Special visualization for NAV updates (valuation)
  if (event.eventType === LifecycleEventType.VALUATION) {
    return (
      <Card className="border-violet-500 overflow-hidden">
        <div className="bg-violet-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="h-5 w-5 text-violet-500" />
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
                  <div className="text-xs text-muted-foreground">NAV per Token</div>
                  <div className="text-xl font-bold text-violet-500">
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
  
  // Special visualization for upgrade events
  if (event.eventType === LifecycleEventType.UPGRADE) {
    return (
      <Card className="border-emerald-500 overflow-hidden">
        <div className="bg-emerald-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Smart Contract Upgrade
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
            
            <div className="bg-emerald-50 p-3 rounded-md border border-emerald-200">
              <p className="text-sm text-emerald-800">
                {event.details || "Smart contract upgraded to new version with enhanced features."}
              </p>
            </div>

            {event.transactionHash && (
              <div className="bg-emerald-50 p-2 rounded-md border border-emerald-200 mt-2">
                <div className="text-xs text-muted-foreground mb-1">Upgrade Transaction</div>
                <div className="text-sm font-mono text-emerald-700 truncate">
                  {event.transactionHash}
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
  
  // Special visualization for audit events
  if (event.eventType === LifecycleEventType.AUDIT) {
    return (
      <Card className="border-teal-500 overflow-hidden">
        <div className="bg-teal-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-500" />
              Security Audit
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
            
            <div className="bg-teal-50 p-2 rounded-md border border-teal-200 flex items-center">
              <Shield className="h-5 w-5 text-teal-500 mr-2" />
              <span className="text-sm text-teal-800">
                Security audit {event.status === EventStatus.SUCCESS ? 'completed successfully' : 'in progress'}
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

export default DigitalTokenizedFundEventCard;