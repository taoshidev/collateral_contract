// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Collateral_V2 is Initializable, Ownable2StepUpgradeable, UUPSUpgradeable {
    // =============================================================
    // ======================= STORAGE LAYOUT ======================
    // =============================================================

    // --- [V1] Direct collateral storage ---
    mapping(address => uint256) public collateralBalances;
    uint256 public slashedCollateral;
    uint256 public totalCollateral;

    // --- [V2] Delegated collateral storage ---
    mapping(address => mapping(address => uint256)) public contributorBalance; // miner => contributor => amount
    mapping(address => uint256) public minerTotalCollateral;
    mapping(address => uint256) public minerSlashedCollateral;

    uint256 public totalDelegatedCollateral;
    uint256 public totalDelegatedSlashedCollateral;

    // --- [Reserved for future upgrades] ---
    uint256[44] private __gap;

    // ======================= STORAGE LAYOUT END ==================

    error InsufficientBalance();
    error InsufficientTotalCollateral();
    error InvalidAddress();
    error InvalidAmount();

    event CollateralDeposited(address indexed account, uint256 amount);
    event CollateralSlashed(address indexed account, uint256 amount);
    event CollateralWithdrawn(address indexed account, uint256 amount);

    event ContributorDeposited(address indexed miner, address indexed contributor, uint256 amount);
    event ContributorWithdrawn(address indexed miner, address indexed contributor, uint256 amount);
    event ContributorSlashed(address indexed miner, address indexed contributor, uint256 amount);

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert InvalidAddress();

        return collateralBalances[account];
    }

    function deposit(address account, uint256 amount) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        collateralBalances[account] += amount;
        totalCollateral += amount;

        emit CollateralDeposited(account, amount);
    }

    function getSlashedCollateral() external view returns (uint256) {
        return slashedCollateral;
    }

    function getTotalCollateral() external view returns (uint256) {
        return totalCollateral;
    }

    function totalAllCollateral() external view returns (uint256) {
        return totalCollateral + totalDelegatedCollateral;
    }
    function totalAllSlashed() external view returns (uint256) {
        return slashedCollateral + totalDelegatedSlashedCollateral;
    }

    function slash(address account, uint256 amount) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (collateralBalances[account] < amount) revert InsufficientBalance();

        collateralBalances[account] -= amount;
        slashedCollateral += amount;
        totalCollateral -= amount;

        emit CollateralSlashed(account, amount);
    }

    function withdraw(address account, uint256 amount) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (collateralBalances[account] < amount) revert InsufficientBalance();
        if (totalCollateral < amount) revert InsufficientTotalCollateral();

        collateralBalances[account] -= amount;
        totalCollateral -= amount;

        emit CollateralWithdrawn(account, amount);
    }

    function depositFor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        contributorBalance[miner][contributor] += amount;
        minerTotalCollateral[miner] += amount;
        totalDelegatedCollateral += amount;

        emit ContributorDeposited(miner, contributor, amount);
    }

    function withdrawFor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = contributorBalance[miner][contributor];
        if (bal < amount) revert InsufficientBalance();

        contributorBalance[miner][contributor] = bal - amount;
        minerTotalCollateral[miner] -= amount;
        totalDelegatedCollateral -= amount;

        emit ContributorWithdrawn(miner, contributor, amount);
    }

    function slashFromContributor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = contributorBalance[miner][contributor];
        if (bal < amount) revert InsufficientBalance();

        contributorBalance[miner][contributor] = bal - amount;
        minerTotalCollateral[miner] -= amount;
        minerSlashedCollateral[miner] += amount;

        totalDelegatedCollateral -= amount;
        totalDelegatedSlashedCollateral += amount;

        emit ContributorSlashed(miner, contributor, amount);
    }
}
