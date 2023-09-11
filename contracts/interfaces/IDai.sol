// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

interface IDai {
    function permit(
        address holder,
        address spender,
        uint nonce,
        uint expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
