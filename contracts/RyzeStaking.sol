// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

import "./abstract/RyzeOwnableUpgradeable.sol";
import "./abstract/RyzeWhitelistUser.sol";
import "./dex/RyzeRouter.sol";
import "./dex/RyzePair.sol";
import "./libraries/Permit.sol";
import "./RyzeTokenConverter.sol";

/**
 * @title RyzeStaking
 * @notice This contract allows users to stake real estate tokens and earn rewards.
 * @dev Interacts with multiple components: RyzeRouter, RyzeTokenConverter, and RyzePair.
 */
contract RyzeStaking is RyzeOwnableUpgradeable, RyzeWhitelistUser, ERC1155HolderUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct UserInfo {
        uint stake;
        uint rewardDebt;
    }

    RyzeRouter public router;
    RyzeTokenConverter public tokenConverter;
    IERC1155Upgradeable public realEstateToken;
    IERC20Upgradeable public stablecoin;

    // @dev mapping tokenId => staked token isPair => user address => user staking info
    mapping(uint => mapping(bool => mapping(address => UserInfo))) private _userInfos;
    // @dev mapping tokenId => staked token isPair => total distributed rewards per token unit
    mapping(uint => mapping(bool => uint)) public accumulatedRewardPerToken;

    function initialize(
        address _owner,
        address _whitelist,
        address _router,
        address _tokenConverter,
        address _realEstateToken,
        address _stablecoin
    ) public initializer {
        __WhitelistUser_init(_whitelist);
        __Ownable_init();
        transferOwnership(_owner);

        router = RyzeRouter(payable(_router));
        tokenConverter = RyzeTokenConverter(_tokenConverter);
        realEstateToken = IERC1155Upgradeable(_realEstateToken);
        stablecoin = IERC20Upgradeable(_stablecoin);
    }

    /**
     * @notice Stakes an NFT to earn rewards.
     * @dev Converts an ERC1155 token to ERC20 and then stakes it.
     * @param _tokenId ID of the ERC1155 token.
     * @param _amount Amount of ERC1155 tokens to be converted and staked.
     */
    function stakeERC1155(uint _tokenId, uint _amount) external onlyWhitelisted {
        claimRewards(_tokenId, false);

        realEstateToken.safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId,
            _amount,
            ""
        );

        tokenConverter.convertRealEstateFromErc1155ToErc20(_tokenId, _amount);

        _stake(_tokenId, false, _amount * 1e18);
    }

    /**
     * @notice Stakes liquid tokens or pairs with a permit for gasless approvals.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     * @param _amount Amount of tokens to stake.
     * @param _permitInfo Permit details for approval.
     */
    function stakeERC20WithPermit(
        uint _tokenId,
        bool _isPair,
        uint _amount,
        Permit.ERC2612PermitInfo calldata _permitInfo
    ) external onlyWhitelisted {
        Permit.approveERC2612(_getStakingToken(_tokenId, _isPair), _permitInfo);

        stakeERC20(_tokenId, _isPair, _amount);
    }

    /**
     * @notice Stakes a liquid token or a pair.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     * @param _amount Amount of tokens to stake.
     */
    function stakeERC20(uint _tokenId, bool _isPair, uint _amount) public onlyWhitelisted {
        claimRewards(_tokenId, _isPair);

        IERC20Upgradeable(
            _getStakingToken(_tokenId, _isPair)
        ).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        _stake(_tokenId, _isPair, _amount);
    }

    /**
     * @notice Internal staking function.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     * @param _amount Amount of tokens to stake.
     */
    function _stake(uint _tokenId, bool _isPair, uint _amount) internal {
        UserInfo storage user = _userInfos[_tokenId][_isPair][msg.sender];

        user.stake += _amount;
        user.rewardDebt = _calculateRewardDebt(_tokenId, _isPair, user.stake);
    }

    /**
     * @notice Unstakes a liquid token or a pair.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     * @param _desiredAmount Amount of tokens to unstake.
     */
    function unstake(uint _tokenId, bool _isPair, uint _desiredAmount) external {
        claimRewards(_tokenId, _isPair);

        UserInfo storage user = _userInfos[_tokenId][_isPair][msg.sender];

        uint amount = _desiredAmount < user.stake ? _desiredAmount : user.stake;

        user.stake -= amount;
        user.rewardDebt = _calculateRewardDebt(_tokenId, _isPair, user.stake);

        IERC20Upgradeable(_getStakingToken(_tokenId, _isPair)).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Claims pending rewards.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     */
    function claimRewards(uint _tokenId, bool _isPair) public {
        UserInfo storage user = _userInfos[_tokenId][_isPair][msg.sender];

        if (user.stake > 0) {
            uint rewardsPerStakedToken = _calculateRewardDebt(_tokenId, _isPair, user.stake);
            uint pending = rewardsPerStakedToken - user.rewardDebt;

            user.rewardDebt = rewardsPerStakedToken;

            if (pending > 0)
                stablecoin.safeTransfer(msg.sender, pending);
        }
    }

    /**
     * @notice Distributes the rewards for a given token.
     * @param _tokenId ID of the token/allocation.
     * @param _amount Amount of stablecoins to distribute.
     */
    function distribute(uint _tokenId, uint _amount) external {
        stablecoin.safeTransferFrom(msg.sender, address(this), _amount);

        address liquidToken = tokenConverter.getLiquidToken(_tokenId);
        address pair = _getPair(_tokenId);

        uint liquidTokenBalance = _balance(liquidToken);
        uint pairBalance = _balance(pair);
        uint pairUnderlyingBalance = pairBalance * _getRealEstateReserves(pair) / IERC20Upgradeable(pair).totalSupply();
        uint totalRealEstateBalance = liquidTokenBalance + pairUnderlyingBalance;

        uint rewardsToLiquid = _amount * liquidTokenBalance / totalRealEstateBalance;
        uint rewardsToPair = _amount * pairUnderlyingBalance / totalRealEstateBalance;

        accumulatedRewardPerToken[_tokenId][false] += liquidTokenBalance > 0
            ? rewardsToLiquid * 1e18 / liquidTokenBalance
            : 0;
        accumulatedRewardPerToken[_tokenId][true] += pairBalance > 0
            ? rewardsToPair * 1e18 / pairBalance
            : 0;
    }

    /**
     * @notice Provides staking details of a user.
     * @param _tokenId ID of the token/allocation.
     * @param _isPair If the staking token is a pair or single token.
     * @param _user Address of the user.
     * @return stake_ Amount of tokens staked by the user.
     * @return pendingRewards_ Pending rewards for the user.
     */
    function userInfo(
        uint _tokenId,
        bool _isPair,
        address _user
    ) external view returns (
        uint stake_,
        uint pendingRewards_
    ) {
        UserInfo memory user = _userInfos[_tokenId][_isPair][_user];
        uint rewardsPerStakedToken = _calculateRewardDebt(_tokenId, _isPair, user.stake);

        return (user.stake, rewardsPerStakedToken - user.rewardDebt);
    }

    function _balance(address _token) internal view returns (uint) {
        return IERC20Upgradeable(_token).balanceOf(address(this));
    }

    function _getStakingToken(uint _tokenId, bool _isPair) internal view returns (address) {
        return _isPair
            ? _getPair(_tokenId)
            : tokenConverter.getLiquidToken(_tokenId);
    }

    function _getPair(uint _tokenId) internal view returns (address) {
        return router.pairFor(
            tokenConverter.getLiquidToken(_tokenId),
            address(stablecoin)
        );
    }

    function _getRealEstateReserves(address _pair) internal view returns (uint112) {
        (uint112 _reserve0, uint112 _reserve1,) = RyzePair(_pair).getReserves();
        address token0 = RyzePair(_pair).token0();

        return token0 == address(stablecoin) ? _reserve1 : _reserve0;
    }

    function _calculateRewardDebt(uint _tokenId, bool _isPair, uint _userStake) internal view returns (uint) {
        return _userStake * accumulatedRewardPerToken[_tokenId][_isPair] / 1e18;
    }
}
