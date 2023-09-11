// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Test_ERC20 is ERC20 {
    uint public constant test = 1;

    constructor(address _owner) ERC20("Test ERC20", "TEST") {
        _mint(_owner, 100_000e18);
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
