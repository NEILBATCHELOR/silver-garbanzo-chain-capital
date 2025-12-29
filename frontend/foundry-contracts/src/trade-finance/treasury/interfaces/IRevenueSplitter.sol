// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRevenueSplitter
 * @notice Interface for revenue distribution
 */
interface IRevenueSplitter {
    
    event BeneficiaryAdded(address indexed account, uint256 shares);
    event BeneficiaryRemoved(address indexed account);
    event BeneficiaryUpdated(address indexed account, uint256 oldShares, uint256 newShares);
    event PaymentReleased(address indexed to, address indexed token, uint256 amount);
    event PaymentReceived(address indexed from, uint256 amount);
    
    function addBeneficiary(address payable account, uint256 shares) external;
    function removeBeneficiary(address account) external;
    function updateBeneficiary(address account, uint256 newShares) external;
    function release(address token, address account) external;
    function batchRelease(address[] calldata tokens, address account) external;
    function distributeAll(address token) external;
    
    function beneficiary(address account)
        external
        view
        returns (address payable beneficiaryAccount, uint256 shares, uint256 released);
    function getBeneficiaries()
        external
        view
        returns (address[] memory accounts, uint256[] memory shares);
    function totalShares() external view returns (uint256);
    function pendingPayment(address token, address account) external view returns (uint256);
    function released(address token, address account) external view returns (uint256);
    function totalReleased(address token) external view returns (uint256);
}
