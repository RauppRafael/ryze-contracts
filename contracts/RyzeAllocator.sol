// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

import "./abstract/RyzeOwnableUpgradeable.sol";
import "./abstract/RyzeWhitelistUser.sol";
import "./dex/RyzeRouter.sol";
import "./libraries/Permit.sol";
import "./RyzeTokenDatabase.sol";
import "./RyzeToken.sol";

/**
 * @title RyzeAllocator
 * @notice Manages allocations for real estate tokens in exchange for stablecoins or ETH.
 * Users can acquire allocations directly or through referrals, with potential rewards.
 * The contract tracks each token's allocation information and state.
 */
contract RyzeAllocator is RyzeOwnableUpgradeable, RyzeWhitelistUser {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    enum AllocationState {
        PRE_SALE,
        PENDING,
        ENABLED,
        DISABLED
    }

    struct AllocationInfo {
        uint totalAllocated;
        AllocationState allocationState;
    }

    address public liquidityInitializer;
    RyzeRouter public router;
    RyzeTokenDatabase public tokenDatabase;
    RyzeToken public allocationToken;
    RyzeToken public allocationRewardToken;
    IERC20MetadataUpgradeable public stablecoin;

    uint16 public initialLiquidityBasisPoints; // 100 = 1%
    uint16 public referralRewardBasisPoints; // 100 = 1%
    uint16 public referredUserBonus; // in allocation token

    uint16 public constant MAX_INITIAL_LIQUIDITY_PERCENTAGE = 15_000;
    uint16 public constant MAX_REFERRAL_REWARD_PERCENTAGE = 1_000;
    uint16 public constant MAX_REFERRED_USER_BONUS = 100;

    mapping(uint => AllocationInfo) public allocationInfos;
    mapping(uint => uint) public disabledTokenValue;
    mapping(address => bool) public hasAllocated;

    event TokenStateChanged(uint realEstateTokenId, AllocationState state);
    event InitialLiquidityPercentageUpdated(uint16 percentage);
    event ReferralRewardPercentageUpdated(uint16 percentage);
    event ReferredUserBonusUpdated(uint16 bonus);

    error InvalidAllocationState(AllocationState expected, AllocationState current);
    error InvalidToken();
    error InvalidAmount();
    error InsufficientBalance();

    function initialize(
        address _owner,
        address _whitelist,
        address _router,
        address _tokenDatabase,
        address _liquidityInitializer,
        address _allocationRewardToken,
        address _allocationToken,
        address _stablecoin,
        uint16 _initialLiquidityBasisPoints,
        uint16 _referralRewardBasisPoints,
        uint16 _referredUserBonus
    ) public initializer {
        if (
            (_initialLiquidityBasisPoints > MAX_INITIAL_LIQUIDITY_PERCENTAGE) ||
            (_referralRewardBasisPoints > MAX_REFERRAL_REWARD_PERCENTAGE) ||
            (_referredUserBonus > MAX_REFERRED_USER_BONUS)
        )
            revert InvalidAmount();

        if (
            _allocationToken == _allocationRewardToken ||
            _allocationToken == address(0) ||
            _allocationRewardToken == address(0)
        )
            revert InvalidToken();

        __WhitelistUser_init(_whitelist);
        __Ownable_init();
        transferOwnership(_owner);

        router = RyzeRouter(payable(_router));
        tokenDatabase = RyzeTokenDatabase(_tokenDatabase);
        liquidityInitializer = _liquidityInitializer;
        allocationToken = RyzeToken(_allocationToken);
        allocationRewardToken = RyzeToken(_allocationRewardToken);
        stablecoin = IERC20MetadataUpgradeable(_stablecoin);
        initialLiquidityBasisPoints = _initialLiquidityBasisPoints;
        referralRewardBasisPoints = _referralRewardBasisPoints;
        referredUserBonus = _referredUserBonus;
    }

    /**
     * @dev Internal function to initialize allocation for a given token ID.
     * @param _tokenId The ID of the token for which allocation is to be initialized.
     */
    function _initializeAllocation(uint _tokenId) internal {
        _mintAllocation(
            _tokenId,
            tokenDatabase.maxSupply(_tokenId) * initialLiquidityBasisPoints / 10_000,
            liquidityInitializer,
            false
        );
    }

    /**
     * @notice Allocates a specified amount of tokens to a user. Requires user to be whitelisted.
     * @dev This function handles the basic allocation logic. The amount being allocated should already be approved for transfer.
     * @param _tokenId The ID of the token to be allocated.
     * @param _amount The amount of tokens to be allocated.
     * @param _referrer The address of the referrer.
     */
    function allocate(
        uint _tokenId,
        uint _amount,
        address _referrer
    ) external onlyWhitelisted {
        _allocate(_tokenId, _amount, _referrer, true);
    }

    /**
     * @notice Allocates with the help of a permit.
     * @dev This function uses the DAI permit mechanism to allocate tokens without needing a separate approve transaction.
     * @param _tokenId The ID of the token to be allocated.
     * @param _amount The amount of tokens to be allocated.
     * @param _referrer The address of the referrer.
     * @param _permitInfo The permit details required for approving Dai.
     */
    function allocateWithDaiPermit(
        uint _tokenId,
        uint _amount,
        address _referrer,
        Permit.DaiPermitInfo calldata _permitInfo
    ) external onlyWhitelisted {
        Permit.approveDai(address(stablecoin), _permitInfo);

        _allocate(_tokenId, _amount, _referrer, true);
    }

    /**
     * @notice Allocates with the help of a permit.
     * @dev This function uses the ERC1612 permit mechanism to allocate tokens without needing a separate approve transaction.
     * @param _tokenId The ID of the token to be allocated.
     * @param _amount The amount of tokens to be allocated.
     * @param _referrer The address of the referrer.
     * @param _permitInfo The permit details required for approving the token.
     */
    function allocateWithErc2612Permit(
        uint _tokenId,
        uint _amount,
        address _referrer,
        Permit.ERC2612PermitInfo calldata _permitInfo
    ) external onlyWhitelisted {
        Permit.approveErc2612(address(stablecoin), _permitInfo);

        _allocate(_tokenId, _amount, _referrer, true);
    }

    /**
     * @notice Allocates using Ether by converting it to stablecoins first. Requires user to be whitelisted.
     * @dev This function first converts the received Ether to stablecoins using the router, then allocates the converted amount.
     * @param _tokenId The ID of the token to be allocated.
     * @param _minAmount The minimum amount of allocation tokens expected to receive in the conversion.
     * @param _referrer The address of the referrer.
     */
    function allocateWithEth(
        uint _tokenId,
        uint _minAmount,
        address _referrer
    ) external payable onlyWhitelisted {
        uint initialBalance = stablecoin.balanceOf(address(this));
        address[] memory path = new address[](2);

        path[0] = router.WETH();
        path[1] = address(stablecoin);

        uint8 stablecoinDecimals = stablecoin.decimals();
        uint realAmount = _min(
            _minAmount,
            _getAvailableAllocationAmount(_tokenId)
        ) * (10 ** stablecoinDecimals);

        if (realAmount < _minAmount) {
            router.swapETHForExactTokens{value: msg.value}(
                realAmount,
                path,
                address(this),
                block.timestamp
            );

            uint balance = address(this).balance;

            if (balance > 0)
                payable(msg.sender).transfer(balance);
        } else {
            router.swapExactETHForTokens{value: msg.value}(
                _minAmount,
                path,
                address(this),
                block.timestamp
            );
        }

        _allocate(
            _tokenId,
            (stablecoin.balanceOf(address(this)) - initialBalance) / (10 ** stablecoinDecimals),
            _referrer,
            false
        );
    }

    /**
     * @dev Internal function to handle allocation logic.
     * @param _tokenId The ID of the token to be allocated.
     * @param _requestedAmount The amount of tokens requested to be allocated.
     * @param _referrer The address of the referrer.
     * @param _collectPayment Indicates if the payment should be collected.
     */
    function _allocate(
        uint _tokenId,
        uint _requestedAmount,
        address _referrer,
        bool _collectPayment
    ) private {
        if (_tokenId >= tokenDatabase.tokenCount())
            revert InvalidToken();

        AllocationInfo storage allocationInfo = allocationInfos[_tokenId];
        AllocationState allocationState = allocationInfo.allocationState;

        if (allocationInfo.totalAllocated == 0)
            _initializeAllocation(_tokenId);

        if (allocationState != AllocationState.PRE_SALE)
            revert InvalidAllocationState(AllocationState.PRE_SALE, allocationState);

        uint realAmount = _min(_requestedAmount, _getAvailableAllocationAmount(_tokenId));

        if (realAmount == 0)
            revert InvalidAmount();

        if (_collectPayment)
            stablecoin.safeTransferFrom(
                msg.sender,
                address(this),
                realAmount * (10 ** stablecoin.decimals())
            );

        _mintAllocation(_tokenId, realAmount, msg.sender, false);

        if (
            _referrer != address(0) &&
            _referrer != msg.sender &&
            RyzeWhitelist(whitelist).isWhitelisted(_referrer) &&
            !Address.isContract(_referrer)
        ) {
            if (!hasAllocated[msg.sender]) {
                hasAllocated[msg.sender] = true;

                _mintAllocation(_tokenId, referredUserBonus, msg.sender, true);
            }

            _mintAllocation(
                _tokenId,
                realAmount * referralRewardBasisPoints / 10_000,
                _referrer,
                true
            );
        }
    }

    /**
     * @dev Internal function to mint the given allocation amount for a specific token to a user or referrer.
     * @param _tokenId The ID of the token for which the allocation is minted.
     * @param _requestedAmount The amount of tokens to mint.
     * @param _user The address of the user to receive the minted allocation.
     * @param _isReward Indicates if the minted allocation is a reward.
     */
    function _mintAllocation(
        uint _tokenId,
        uint _requestedAmount,
        address _user,
        bool _isReward
    ) internal {
        uint availableAllocations = _getAvailableAllocationAmount(_tokenId);
        uint realAmount = _min(_requestedAmount, availableAllocations);

        if (availableAllocations == 0)
            return;

        if (realAmount < _requestedAmount || availableAllocations == realAmount)
            _setAllocationState(_tokenId, AllocationState.PENDING);

        allocationInfos[_tokenId].totalAllocated += realAmount;

        _isReward
            ? allocationRewardToken.mint(_user, _tokenId, realAmount)
            : allocationToken.mint(_user, _tokenId, realAmount);
    }

    /**
     * @notice Burns a user's allocation of a specified token. Requires user to be whitelisted.
     * @dev This function removes the allocation from a user, effectively decreasing the user's balance of that specific token.
     * @param _tokenId The ID of the token to be burned.
     */
    function burnAllocation(uint _tokenId) external onlyWhitelisted {
        AllocationState allocationState = allocationInfos[_tokenId].allocationState;

        if (allocationState != AllocationState.DISABLED)
            revert InvalidAllocationState(AllocationState.DISABLED, allocationState);

        uint amount = allocationToken.balanceOf(msg.sender, _tokenId);

        if (amount == 0)
            revert InsufficientBalance();

        allocationToken.safeTransferFrom(msg.sender, address(this), _tokenId, amount, "");
        allocationToken.burn(address(this), _tokenId, amount);
        stablecoin.safeTransfer(msg.sender, amount * disabledTokenValue[_tokenId]);
    }

    /**
     * @notice Allows the owner to claim the accumulated stablecoins from this contract.
     * @dev Transfers all stablecoin balance from the contract to the owner.
     */
    function claimStablecoins() external onlyOwner {
        stablecoin.safeTransfer(
            msg.sender,
            stablecoin.balanceOf(address(this))
        );
    }

    /**
     * @notice Enables a token for allocation.
     * @dev Modifies the state of the token to "ENABLED". Only the owner can call this function.
     * @param _tokenId The ID of the token to be enabled.
     */
    function enableToken(uint _tokenId) external {
        if (msg.sender != liquidityInitializer)
            revert Unauthorized();

        AllocationState allocationState = allocationInfos[_tokenId].allocationState;

        if (allocationState != AllocationState.PENDING)
            revert InvalidAllocationState(AllocationState.PENDING, allocationState);

        _setAllocationState(_tokenId, AllocationState.ENABLED);
    }

    /**
     * @notice Disables a token from allocation.
     * @dev Modifies the state of the token to "DISABLED" and assigns a value to the disabled token. Only the owner can call this function.
     * @param _tokenId The ID of the token to be disabled.
     * @param _value The value to be associated with the disabled token.
     */
    function disableToken(uint _tokenId, uint _value) external onlyOwner {
        AllocationState allocationState = allocationInfos[_tokenId].allocationState;

        if (allocationState == AllocationState.ENABLED)
            revert InvalidAllocationState(AllocationState.ENABLED, allocationState);

        disabledTokenValue[_tokenId] = _value;
        _setAllocationState(_tokenId, AllocationState.DISABLED);
    }

    /**
     * @dev Internal function to set the allocation state of a specific token.
     * @param _tokenId The ID of the token for which the allocation state is to be set.
     * @param _state The new allocation state to set.
     */
    function _setAllocationState(uint _tokenId, AllocationState _state) private {
        allocationInfos[_tokenId].allocationState = _state;

        emit TokenStateChanged(_tokenId, _state);
    }

    /**
     * @dev Internal function to get the available allocation amount for a specific token.
     * @param _tokenId The ID of the token to query.
     * @return Returns the available allocation amount for the token.
     */
    function _getAvailableAllocationAmount(uint _tokenId) private view returns (uint) {
        uint maxSupply = tokenDatabase.maxSupply(_tokenId);

        return maxSupply - allocationInfos[_tokenId].totalAllocated;
    }

    /**
     * @dev Internal utility function to get the minimum of two amounts.
     * @param _amountA The first amount.
     * @param _amountB The second amount.
     * @return Returns the smaller of the two amounts.
     */
    function _min(uint _amountA, uint _amountB) private pure returns (uint) {
        return _amountA > _amountB
            ? _amountB
            : _amountA;
    }

    /**
     * @dev Implementation for the ERC-1155 token received interface.
     */
    function onERC1155Received(address, address, uint, uint, bytes memory) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     * @notice Checks if a token is enabled for allocation.
     * @dev Queries the state of the token from the allocationInfos mapping.
     * @param _tokenId The ID of the token to be checked.
     * @return Returns true if the token is enabled, false otherwise.
     */
    function isEnabled(uint _tokenId) external view returns (bool) {
        return allocationInfos[_tokenId].allocationState == AllocationState.ENABLED;
    }

    /**
     * @notice Fallback function to accept Ether payments. Ensures only transactions from the router are accepted.
     */
    receive() external payable {
        assert(msg.sender == address(router)); // only accept ETH via fallback from the WETH contract
    }

    function setInitialLiquidityBasisPoints(
        uint16 _initialLiquidityBasisPoints
    ) external onlyOwner {
        if (_initialLiquidityBasisPoints > MAX_INITIAL_LIQUIDITY_PERCENTAGE)
            revert InvalidAmount();

        initialLiquidityBasisPoints = _initialLiquidityBasisPoints;

        emit InitialLiquidityPercentageUpdated(_initialLiquidityBasisPoints);
    }

    function setReferralRewardBasisPoints(
        uint16 _referralRewardBasisPoints
    ) external onlyOwner {
        if (_referralRewardBasisPoints > MAX_REFERRAL_REWARD_PERCENTAGE)
            revert InvalidAmount();

        referralRewardBasisPoints = _referralRewardBasisPoints;

        emit ReferralRewardPercentageUpdated(_referralRewardBasisPoints);
    }

    function setReferredUserBonus(
        uint16 _referredUserBonus
    ) external onlyOwner {
        if (_referredUserBonus > MAX_REFERRED_USER_BONUS)
            revert InvalidAmount();

        referredUserBonus = _referredUserBonus;

        emit ReferredUserBonusUpdated(_referredUserBonus);
    }
}
