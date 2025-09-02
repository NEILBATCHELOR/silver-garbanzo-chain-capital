import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Ripple Payments Page - Redirects to Wallet Dashboard
 * Functionality moved to Wallet Dashboard Ripple tab
 */
const RipplePaymentsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to wallet dashboard with ripple tab
    navigate("/wallet/dashboard?tab=ripple", { replace: true });
  }, [navigate]);

  // Return null while redirecting
  return null;
};

export default RipplePaymentsPage;
