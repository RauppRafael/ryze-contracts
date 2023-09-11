// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

import "./abstract/RyzeOwnableUpgradeable.sol";
import "./dex/RyzeRouter.sol";
import "./RyzeAllocator.sol";
import "./RyzeTokenConverter.sol";

/**
 * @title RyzeLiquidityInitializer
 * @notice This contract initializes liquidity for the Ryze ecosystem.
 * @dev Interacts with multiple components: RyzeRouter, RyzeAllocator, and RyzeTokenConverter to facilitate the liquidity initialization process.
 */
contract RyzeLiquidityInitializer is RyzeOwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    RyzeAllocator public allocator;
    RyzeTokenConverter public tokenConverter;
    RyzeRouter public router;

    IERC1155Upgradeable public allocationRewardToken;
    IERC20Upgradeable public stablecoin;

    function initialize(
        address _owner,
        address _router,
        address _allocator,
        address _tokenConverter,
        address _allocationRewardToken,
        address _stablecoin
    ) public initializer {
        __Ownable_init();
        transferOwnership(_owner);

        allocator = RyzeAllocator(payable(_allocator));
        tokenConverter = RyzeTokenConverter(_tokenConverter);
        router = RyzeRouter(payable(_router));

        allocationRewardToken = IERC1155Upgradeable(_allocationRewardToken);
        stablecoin = IERC20Upgradeable(_stablecoin);
    }

    /**
     * @notice Returns the balance of a given allocation ID.
     * @param _tokenId The ID of the allocation to query.
     * @return uint The balance of the specified allocation ID.
     */
    function allocation(uint _tokenId) public view returns (uint) {
        return allocationRewardToken.balanceOf(address(this), _tokenId);
    }

    /**
     * @notice Computes the amount of stablecoins needed to initialize liquidity for a specific token, based on a given ratio.
     * @param _tokenId The ID of the allocation.
     * @param _stablecoinToRealEstateRatioBasisPoints Ratio of stablecoins to real estate tokens in basis points.
     * @return uint The calculated amount of stablecoins required.
     */
    function calculateStablecoinsRequired(
        uint _tokenId,
        uint _stablecoinToRealEstateRatioBasisPoints
    ) external view returns (uint) {
        return allocation(_tokenId) * 1e18 * _stablecoinToRealEstateRatioBasisPoints / 10000;
    }

    /**
     * @notice Claims the allocation reward, converts it into real estate ERC20, and adds it as liquidity.
     * @param _tokenId The ID of the token/allocation to claim and add as liquidity.
     * @param _stablecoinToRealEstateRatioBasisPoints Ratio of stablecoins to real estate tokens in basis points for liquidity addition.
     */
    function claimAndAddLiquidity(
        uint _tokenId,
        uint _stablecoinToRealEstateRatioBasisPoints
    ) external onlyOwner {
        allocator.enableToken(_tokenId);
        tokenConverter.convertAllocationToRealEstateErc20(_tokenId, true);

        address liquidTokenAddress = tokenConverter.getLiquidToken(_tokenId);
        uint liquidTokenBalance = IERC20Upgradeable(liquidTokenAddress).balanceOf(address(this));
        uint daiBalance = liquidTokenBalance * _stablecoinToRealEstateRatioBasisPoints / 10000;

        stablecoin.safeTransferFrom(msg.sender, address(this), daiBalance);

        _approveRouter(liquidTokenAddress, liquidTokenBalance);
        _approveRouter(address(stablecoin), daiBalance);

        router.addLiquidity(
            liquidTokenAddress,
            address(stablecoin),
            liquidTokenBalance,
            daiBalance,
            liquidTokenBalance - liquidTokenBalance / 100,
            daiBalance - daiBalance / 100,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice ERC-1155 receiver hook that allows this contract to accept incoming ERC-1155 transfers.
     * @return bytes4 The function selector for ERC-1155 compliance.
     */
    function onERC1155Received(address, address, uint, uint, bytes memory) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     * @dev Approves the router to spend a given amount of a specific token.
     * @param _token Address of the token to approve.
     * @param _amount Amount of the token to approve.
     */
    function _approveRouter(address _token, uint _amount) internal {
        IERC20Upgradeable(_token).safeIncreaseAllowance(address(router), _amount);
    }
}
