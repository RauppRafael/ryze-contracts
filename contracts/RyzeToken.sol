// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";

import "./abstract/RyzeOwnableUpgradeable.sol";
import "./libraries/Permit.sol";
import "./RyzeAllocator.sol";
import "./RyzeTokenConverter.sol";

contract RyzeToken is ERC1155BurnableUpgradeable, ERC2981Upgradeable, RyzeOwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string public name;
    string public symbol;
    address public minter;
    address public tokenConverter;

    error Unauthorized();

    function initialize(
        address _gnosisSafe,
        string memory _name,
        string memory _symbol,
        string memory _metadataUri
    ) public initializer {
        __ERC1155_init(_metadataUri);
        __Ownable_init();

        _setDefaultRoyalty(_gnosisSafe, 100);

        name = _name;
        symbol = _symbol;
    }

    function initialize2(
        address _owner,
        address _minter,
        address _tokenConverter
    ) public onlyOwner reinitializer(2) {
        transferOwnership(_owner);

        minter = _minter;
        tokenConverter = _tokenConverter;
    }

    function isApprovedForAll(
        address _account,
        address _operator
    ) public view virtual override returns (bool) {
        return _operator == tokenConverter || super.isApprovedForAll(_account, _operator);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable, ERC2981Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function mint(address _to, uint _tokenId, uint _amount) external {
        if (msg.sender != minter)
            revert Unauthorized();

        _mint(_to, _tokenId, _amount, "");
    }
}
