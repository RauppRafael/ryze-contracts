// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

interface ILiquidToken is IERC20Permit {
    function mint(address _account, uint _amount) external;

    function burn(address _account, uint _amount) external;
}
