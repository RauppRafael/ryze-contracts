// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "../interfaces/IDai.sol";

library Permit {
    struct ERC2612PermitInfo {
        uint deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct DaiPermitInfo {
        uint nonce;
        uint expiry;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function approveERC2612(
        address _erc20,
        ERC2612PermitInfo calldata _permitInfo
    ) internal {
        IERC20Permit(_erc20).permit(
            msg.sender,
            address(this),
            type(uint).max,
            _permitInfo.deadline,
            _permitInfo.v,
            _permitInfo.r,
            _permitInfo.s
        );
    }

    function approveDai(
        address _dai,
        DaiPermitInfo calldata _permitInfo
    ) internal {
        IDai(_dai).permit(
            msg.sender,
            address(this),
            _permitInfo.nonce,
            _permitInfo.expiry,
            true,
            _permitInfo.v,
            _permitInfo.r,
            _permitInfo.s
        );
    }
}
