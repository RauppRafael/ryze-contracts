// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/ILiquidToken.sol";

contract RyzeLiquidToken is ILiquidToken, ERC20Permit, Ownable {
    uint immutable public realEstateTokenId;

    constructor(
        uint _realEstateTokenId,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        realEstateTokenId = _realEstateTokenId;
    }

    function mint(address _account, uint _amount) external onlyOwner {
        _mint(_account, _amount);
    }

    function burn(address _account, uint _amount) external onlyOwner {
        _burn(_account, _amount);
    }
}
