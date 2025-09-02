import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Transaction History Page - Redirects to Wallet Dashboard
 * Functionality moved to Wallet Dashboard History tab
 */
const TransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to wallet dashboard with transactions tab
    navigate("/wallet/dashboard?tab=transactions", { replace: true });
  }, [navigate]);

  // Return null while redirecting
  return null;
};

export default TransactionHistoryPage;
