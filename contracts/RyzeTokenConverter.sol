// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./abstract/RyzeOwnableUpgradeable.sol";
import "./RyzeAllocator.sol";
import "./RyzeLiquidToken.sol";
import "./RyzeToken.sol";
import "./RyzeTokenDatabase.sol";

/**
 * @title RyzeTokenConverter
 * @notice Manages the conversion of tokens between different standards and representations.
 * @dev Enables converting between ERC1155 (NFT) representations and their liquid ERC20 counterparts.
 */
contract RyzeTokenConverter is ERC1155HolderUpgradeable, RyzeOwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    mapping(uint => address) private _liquidTokenAddresses;

    RyzeTokenDatabase public tokenDatabase;
    RyzeAllocator public allocator;
    RyzeToken public allocationRewardToken;
    RyzeToken public allocationToken;
    RyzeToken public realEstateToken;

    event CreatedLiquidToken(address indexed liquidToken, uint indexed nftId);

    error TokenNotEnabled();
    error InsufficientBalance();

    function initialize(
        address _owner,
        address _tokenDatabase,
        address _allocator,
        address _allocationRewardToken,
        address _allocationToken,
        address _realEstateToken
    ) public initializer {
        __Ownable_init();

        transferOwnership(_owner);

        tokenDatabase = RyzeTokenDatabase(_tokenDatabase);
        allocator = RyzeAllocator(payable(_allocator));
        allocationRewardToken = RyzeToken(_allocationRewardToken);
        allocationToken = RyzeToken(_allocationToken);
        realEstateToken = RyzeToken(_realEstateToken);
    }

    /**
     * @notice Retrieves the address of the liquid ERC20 token associated with a given NFT ID.
     *
     * @param _tokenId ID of the NFT.
     *
     * @return Address of the corresponding liquid token.
     */
    function getLiquidToken(uint _tokenId) external view returns (address) {
        return _liquidTokenAddresses[_tokenId];
    }

    /**
     * @notice Converts their allocation tokens into ERC1155 real estate tokens.
     *
     * @dev This function allows the caller to claim their share of real estate tokens.
     *
     * @param _tokenId The ID of the token to claim.
     * @param _useReward Whether to use the reward token or the main allocation token.
     */
    function convertAllocationToRealEstateErc1155(uint _tokenId, bool _useReward) public {
        uint amount = _collectAllocationToken(_tokenId, _useReward);

        realEstateToken.mint(msg.sender, _tokenId, amount);
    }

    /**
     * @notice Converts multiple allocation tokens into ERC1155 real estate tokens in a batch.
     *
     * @dev This function allows the caller to claim their share of multiple real estate tokens.
     *
     * @param _tokenIds An array of token IDs to claim.
     * @param _useReward Whether to use the reward token or the main allocation token.
     */
    function convertManyAllocationsToRealEstate1155(uint[] calldata _tokenIds, bool _useReward) external {
        for (uint index; index < _tokenIds.length; index++) {
            convertAllocationToRealEstateErc1155(_tokenIds[index], _useReward);
        }
    }

    /**
     * @notice Convert allocation tokens into liquid ERC20 real estate tokens.
     *
     * @dev This function allows the caller to claim their share of real estate tokens and convert it to a liquid token.
     *
     * @param _tokenId The ID of the token to claim
     * @param _useReward A flag to determine whether to use the reward token or the allocation token for claiming
     */
    function convertAllocationToRealEstateErc20(uint _tokenId, bool _useReward) public {
        uint amount = _collectAllocationToken(_tokenId, _useReward);

        _mintLiquidToken(_tokenId, amount);
    }

    /**
     * @notice Converts multiple allocation tokens into liquid ERC20 real estate tokens in a batch.
     *
     * @dev Claims multiple real estate tokens and converts the claimed tokens to their erc20 equivalent.
     *
     * @param _tokenIds Array of token IDs to be claimed.
     * @param _useReward Boolean value indicating whether to claim rewards instead of main token allocations.
     */
    function convertManyAllocationsToRealEstateErc20(uint[] calldata _tokenIds, bool _useReward) external {
        for (uint index; index < _tokenIds.length; index++) {
            convertAllocationToRealEstateErc20(_tokenIds[index], _useReward);
        }
    }

    /**
     * @notice Converts liquid ERC20 tokens back to ERC1155 real estate tokens.
     *
     * @dev Burns liquid tokens and mints the equivalent amount of NFTs.
     * When specifying the `_amount`, ensure that you use the actual token count (e.g., 1)
     * and not its underlying representation (e.g., 1e18).
     *
     * @param _tokenId The ID of the NFT to convert to.
     * @param _amount The amount of NFTs to receive, not considering decimals.
     */
    function convertRealEstateFromErc20ToErc1155(uint _tokenId, uint _amount) public {
        RyzeLiquidToken(_liquidTokenAddresses[_tokenId]).burn(msg.sender, _amount * 1e18);

        realEstateToken.mint(msg.sender, _tokenId, _amount);
    }

    /**
     * @notice Convert ERC1155 real estate tokens into liquid ERC20 tokens.
     *
     * @dev The sender's NFTs will be burned and they will receive the equivalent amount of liquid tokens.
     *
     * @param _tokenId The ID of the NFT to convert from.
     * @param _amount The amount of NFTs to convert.
     */
    function convertRealEstateFromErc1155ToErc20(uint _tokenId, uint _amount) external {
        realEstateToken.burn(msg.sender, _tokenId, _amount);

        _mintLiquidToken(_tokenId, _amount);
    }

    function _mintLiquidToken(uint _tokenId, uint _amount) internal {
        if (_liquidTokenAddresses[_tokenId] == address(0)) {
            _createLiquidToken(_tokenId);
        }

        RyzeLiquidToken(_liquidTokenAddresses[_tokenId]).mint(msg.sender, _amount * 1e18);
    }

    /**
     * @dev Internal function that creates a liquid token.
     *
     * @param _tokenId The ID of the NFT token.
     *
     * @return The address of the newly created liquid token.
     */
    function _createLiquidToken(uint _tokenId) internal returns (address) {
        (string memory name, string memory symbol, bytes32 salt) = tokenDatabase.metadata(_tokenId);

        address liquidToken = address(new RyzeLiquidToken{salt: salt}(_tokenId, name, symbol));

        _liquidTokenAddresses[_tokenId] = liquidToken;

        emit CreatedLiquidToken(liquidToken, _tokenId);

        return liquidToken;
    }

    /**
     * @notice Collects the allocation token (either reward or regular) from a user.
     *
     * @dev This function is used internally when a user converts their allocation tokens.
     *
     * @param _tokenId ID of the NFT.
     * @param _useReward If set to true, the reward token is collected, else the regular allocation token is collected.
     *
     * @return The amount of tokens collected from the user.
     */
    function _collectAllocationToken(uint _tokenId, bool _useReward) internal returns (uint) {
        if (!allocator.isEnabled(_tokenId))
            revert TokenNotEnabled();

        RyzeToken _allocationToken = _useReward ? allocationRewardToken : allocationToken;
        uint amount = _allocationToken.balanceOf(msg.sender, _tokenId);

        if (amount == 0)
            revert InsufficientBalance();

        _allocationToken.safeTransferFrom(msg.sender, address(this), _tokenId, amount, "");

        return amount;
    }
}
