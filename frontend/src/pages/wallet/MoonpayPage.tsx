import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Moonpay Integration Page - Redirects to Wallet Dashboard
 * Functionality moved to Wallet Dashboard Moonpay tab
 */
const MoonpayPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to wallet dashboard with moonpay tab
    navigate("/wallet/dashboard?tab=moonpay", { replace: true });
  }, [navigate]);

  // Return null while redirecting
  return null;
};

export default MoonpayPage;
