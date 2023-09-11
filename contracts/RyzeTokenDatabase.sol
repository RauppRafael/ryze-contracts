// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.19;

import "./abstract/RyzeOwnableUpgradeable.sol";

/**
 * @title RyzeTokenDatabase
 *
 * @dev Contract to store metadata and max supply of NFT tokens.
 */
contract RyzeTokenDatabase is RyzeOwnableUpgradeable {
    /**
     * @dev Struct that contains NFT metadata.
     */
    struct RealEstateTokenMetadata {
        string name;
        string symbol;
        bytes32 salt;
    }

    error SymbolUnavailable();

    /**
     * @dev Total number of NFT tokens registered.
     */
    uint public tokenCount;

    /**
     * @dev Mapping from tokenId to RealEstateTokenMetadata.
     */
    mapping(uint => RealEstateTokenMetadata) public metadata;

    /**
     * @dev Mapping from tokenId to maxSupply.
     */
    mapping(uint => uint) public maxSupply;

    /**
     * @dev Mapping from token symbol to boolean used to prevent duplicate symbols.
     */
    mapping(string => bool) private registeredSymbols;

    /**
     * @dev Event that is emitted when an NFT token is registered.
     */
    event Registered(uint id, string name, string symbol, bytes32 salt, uint maxSupply);

    /**
     * @dev Initializes the contract with the address book.
     *
     */
    function initialize(address _owner) public initializer {
        __Ownable_init();
        transferOwnership(_owner);
    }

    /**
     * @dev Registers a new NFT token.
     *
     * @param _name Name of the NFT token.
     * @param _symbol Symbol of the NFT token.
     * @param _salt Salt used for the NFT token.
     * @param _maxSupply Maximum supply of the NFT token.
     *
     * @return The ID of the NFT token.
     */
    function register(
        string calldata _name,
        string calldata _symbol,
        bytes32 _salt,
        uint _maxSupply
    ) public onlyOwner returns (uint) {
        if (registeredSymbols[_symbol])
            revert SymbolUnavailable();

        registeredSymbols[_symbol] = true;

        uint id = tokenCount;

        metadata[id] = RealEstateTokenMetadata(_name, _symbol, _salt);
        maxSupply[id] = _maxSupply;

        emit Registered(id, _name, _symbol, _salt, _maxSupply);

        tokenCount++;

        return id;
    }
}
