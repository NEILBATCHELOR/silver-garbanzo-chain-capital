/**
 * Solana Dashboard Header Component
 * 
 * Displays the main header for Solana Token Launchpad with title, description, and actions
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Coins,
  Rocket,
  Plus,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { cn } from "@/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SolanaDashboardHeaderProps {
  title?: string;
  description?: string;
  showDeployButton?: boolean;
  showRefreshButton?: boolean;
  isRefreshing?: boolean;
  onDeploy?: () => void;
  onRefresh?: () => void;
  className?: string;
  actions?: React.ReactNode;
}

export function SolanaDashboardHeader({
  title = "Solana Token Launchpad",
  description = "Deploy and manage SPL and Token-2022 tokens on Solana",
  showDeployButton = true,
  showRefreshButton = true,
  isRefreshing = false,
  onDeploy,
  onRefresh,
  className,
  actions
}: SolanaDashboardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Left: Title and Description */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Deploy SPL tokens for basic functionality or Token-2022 tokens
                    with advanced extensions like metadata, transfer fees, and compliance features.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {showRefreshButton && onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}
        
        {showDeployButton && onDeploy && (
          <Button onClick={onDeploy} className="gap-2">
            <Rocket className="h-4 w-4" />
            Deploy New Token
          </Button>
        )}

        {/* Custom actions if provided */}
        {actions}
      </div>
    </div>
  );
}

/**
 * Page Header for Sub-Pages
 */
export interface SolanaPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  backTo?: {
    label: string;
    href: string;
  };
  actions?: React.ReactNode;
  className?: string;
}

export function SolanaPageHeader({
  title,
  description,
  icon,
  backTo,
  actions,
  className
}: SolanaPageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {backTo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="gap-2"
        >
          <span>←</span>
          {backTo.label}
        </Button>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
