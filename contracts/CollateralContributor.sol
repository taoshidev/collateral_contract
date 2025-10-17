// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CollateralContributor is Initializable, Ownable2StepUpgradeable, UUPSUpgradeable {
    mapping(address => mapping(address => uint256)) public contributorBalance; // miner => contributor => amount
    mapping(address => uint256) public minerTotalCollateral;
    mapping(address => uint256) public minerSlashedCollateral;

    uint256 public totalCollateral;
    uint256 public slashedCollateral;

    error InsufficientBalance();
    error InsufficientTotalCollateral();
    error InvalidAddress();
    error InvalidAmount();

    event ContributorDeposited(address indexed miner, address indexed contributor, uint256 amount);
    event ContributorWithdrawn(address indexed miner, address indexed contributor, uint256 amount);
    event ContributorSlashed(address indexed miner, address indexed contributor, uint256 amount);

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function depositFor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        contributorBalance[miner][contributor] += amount;
        minerTotalCollateral[miner] += amount;
        totalCollateral += amount;

        emit ContributorDeposited(miner, contributor, amount);
    }

    function withdrawFor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = contributorBalance[miner][contributor];
        if (bal < amount) revert InsufficientBalance();
        if (totalCollateral < amount) revert InsufficientTotalCollateral();

        contributorBalance[miner][contributor] = bal - amount;
        minerTotalCollateral[miner] -= amount;
        totalCollateral -= amount;

        emit ContributorWithdrawn(miner, contributor, amount);
    }

    function slashFromContributor(address miner, address contributor, uint256 amount) external onlyOwner {
        if (miner == address(0) || contributor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 bal = contributorBalance[miner][contributor];
        if (bal < amount) revert InsufficientBalance();
        if (totalCollateral < amount) revert InsufficientTotalCollateral();

        contributorBalance[miner][contributor] = bal - amount;
        minerTotalCollateral[miner] -= amount;
        minerSlashedCollateral[miner] += amount;

        totalCollateral -= amount;
        slashedCollateral += amount;

        emit ContributorSlashed(miner, contributor, amount);
    }
}
