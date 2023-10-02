// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract USDT is ERC20Permit {
    constructor() ERC20("Tether USD", "USDT") ERC20Permit("Tether USD") {
    }

    function mint(address _user, uint _amount) external {
        _mint(_user, _amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
