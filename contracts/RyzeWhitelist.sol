// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "./abstract/RyzeOwnableUpgradeable.sol";

/**
 * @title RyzeWhitelist
 * @notice This contract manages a list of whitelisted addresses and a manager role who can update this list.
 * @dev It leverages the ownership functionality provided by RyzeOwnableUpgradeable.
 */
contract RyzeWhitelist is RyzeOwnableUpgradeable {
    address public manager;
    mapping(address => bool) private _whitelist;

    event WhitelistUpdated(address user, bool whitelisted);
    event ManagerUpdated(address user);

    error Unauthorized();

    /**
     * @notice Modifier to restrict function access only to the manager.
     */
    modifier onlyManager() {
        if (msg.sender != manager)
            revert Unauthorized();

        _;
    }

    function initialize(address _owner, address _manager) public initializer {
        __Ownable_init();
        transferOwnership(_owner);
        manager = _manager;
    }

    /**
     * @notice Check if an address is whitelisted.
     * @param _user Address to check.
     * @return True if the address is whitelisted, false otherwise.
     */
    function isWhitelisted(address _user) external view returns (bool) {
        return _whitelist[_user];
    }

    /**
     * @notice Updates the whitelist status of an address.
     * @param _user Address to update.
     * @param _whitelisted Whitelist status to set for the address.
     */
    function updateUserWhitelistStatus(address _user, bool _whitelisted) external onlyManager {
        _whitelist[_user] = _whitelisted;

        emit WhitelistUpdated(_user, _whitelisted);
    }

    /**
     * @notice Sets the manager's address.
     * @param _user Address to be set as the manager.
     */
    function setManager(address _user) public onlyOwner {
        manager = _user;

        emit ManagerUpdated(_user);
    }
}
