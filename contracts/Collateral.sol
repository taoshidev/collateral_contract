// SPDX-License-Identifier: UNLINCENSED
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Collateral is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    mapping(address => uint256) public collateralBalances;
    uint256 public slashedCollateral;
    uint256 public totalCollateral;

    error InsufficientBalance();
    error InsufficientTotalCollateral();
    error InvalidAddress();
    error InvalidAmount();

    event CollateralDeposited(address indexed account, uint256 amount);
    event CollateralSlashed(address indexed account, uint256 amount);
    event CollateralWithdrawn(address indexed account, uint256 amount);

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), InvalidAddress());

        return collateralBalances[account];
    }

    function deposit(address account, uint256 amount) external onlyOwner {
        require(account != address(0), InvalidAddress());
        require(amount > 0, InvalidAmount());

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

    function slash(address account, uint256 amount) external onlyOwner {
        require(account != address(0), InvalidAddress());
        require(amount > 0, InvalidAmount());
        require(collateralBalances[account] >= amount, InsufficientBalance());

        collateralBalances[account] -= amount;
        slashedCollateral += amount;
        totalCollateral -= amount;

        emit CollateralSlashed(account, amount);
    }

    function withdraw(address account, uint256 amount) external onlyOwner {
        require(account != address(0), InvalidAddress());
        require(amount > 0, InvalidAmount());
        require(collateralBalances[account] >= amount, InsufficientBalance());
        require(totalCollateral >= amount, InsufficientTotalCollateral());

        collateralBalances[account] -= amount;
        totalCollateral -= amount;

        emit CollateralWithdrawn(account, amount);
    }
}
