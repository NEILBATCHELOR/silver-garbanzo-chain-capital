import React from "react";
import { Badge } from "@/components/ui/badge";
import { LightningBoltIcon, StarIcon, InfoCircledIcon } from "@radix-ui/react-icons";

interface FeatureBadgeProps {
  type: 'defi' | 'advanced' | 'enterprise' | 'compliance';
  children: React.ReactNode;
  className?: string;
}

/**
 * FeatureBadge - Consistent badge component for token configuration features
 * Fixed positioning and styling for clean alignment
 */
export const FeatureBadge: React.FC<FeatureBadgeProps> = ({ type, children, className = "" }) => {
  const variants = {
    defi: { 
      color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", 
      icon: <LightningBoltIcon className="h-3 w-3" /> 
    },
    advanced: { 
      color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800", 
      icon: <StarIcon className="h-3 w-3" /> 
    },
    enterprise: { 
      color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800", 
      icon: <StarIcon className="h-3 w-3" /> 
    },
    compliance: { 
      color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
      icon: <InfoCircledIcon className="h-3 w-3" /> 
    }
  };
  
  return (
    <Badge className={`${variants[type].color} text-xs border flex items-center gap-1 px-2 py-1 shrink-0 ${className}`}>
      {variants[type].icon}
      <span>{children}</span>
    </Badge>
  );
};
