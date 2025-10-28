import React, { useEffect, useState } from "react";
import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { supabase } from "@/infrastructure/database/client";
import { getRoleDisplayName } from "@/utils/auth/roleNormalizer";
import SessionIndicator from "./SessionIndicator";
import { MultiSigListenerHealthBadge } from "@/components/wallet/monitoring";
import { useMultiSigEventListeners } from "@/hooks/wallet/useMultiSigEventListeners";

const Header = () => {
  const { user } = useAuth();
  const [displayRole, setDisplayRole] = useState<string>("");
  
  // ============================================================================
  // MULTI-SIG EVENT LISTENERS INTEGRATION (Phase 3)
  // ============================================================================
  // FIXED: Lazy loading - listeners start only when viewing specific wallets
  // Auto-start disabled to prevent console spam and resource waste
  // Listeners are now managed by individual wallet components (PendingProposalsCard, etc.)
  const { health: multiSigHealth } = useMultiSigEventListeners(user?.id, {
    autoStart: false, // ✅ DISABLED: Prevents auto-starting 17+ listeners on app load
    autoStop: true,
    healthCheckInterval: 30000 // Check health every 30 seconds
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (roleData?.roles?.name) {
        setDisplayRole(getRoleDisplayName(roleData.roles.name));
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <header className="w-full bg-white border-b px-4 py-3 sticky top-0 z-10">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Unlock Institutional Liquidity</h1>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="text-sm text-muted-foreground">
                Welcome, {user.user_metadata?.name || user.email}
                {displayRole && <span className="ml-1">({displayRole})</span>}
              </div>
              {/* Multi-Sig Listener Health Badge */}
              <MultiSigListenerHealthBadge health={multiSigHealth} />
              <SessionIndicator compact={true} />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
