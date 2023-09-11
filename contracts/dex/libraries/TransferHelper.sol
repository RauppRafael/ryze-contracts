// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false
library TransferHelper {
    using SafeERC20 for IERC20;

    function safeApprove(
        address token,
        address to,
        uint value
    ) internal {
        IERC20(token).safeApprove(to, value);
    }

    function safeTransfer(
        address token,
        address to,
        uint value
    ) internal {
        IERC20(token).safeTransfer(to, value);
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint value
    ) internal {
        IERC20(token).safeTransferFrom(from, to, value);
    }

    function safeTransferETH(address to, uint value) internal {
        payable(to).transfer(value);
    }
}
