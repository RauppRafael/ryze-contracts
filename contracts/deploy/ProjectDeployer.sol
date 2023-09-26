// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../dex/RyzeFactory.sol";
import "../dex/RyzeRouter.sol";

import "../RyzeToken.sol";
import "../RyzeWhitelist.sol";
import "../RyzeTokenDatabase.sol";
import "../RyzeTokenConverter.sol";
import "../RyzeAllocator.sol";
import "../RyzeLiquidityInitializer.sol";

contract ProjectDeployer is Ownable {
    struct DeploymentInfo {
        bytes code;
        bytes32 salt;
    }

    struct ProxyDeploymentInfo {
        bytes code;
        bytes32 implementationSalt;
        bytes32 proxySalt;
    }

    struct SaltInfo {
        bytes32 implementationSalt;
        bytes32 proxySalt;
    }

    struct ProxyAddress {
        address implementation;
        address proxy;
    }

    struct TokenDeploymentInfo {
        bytes32 allocationRewardTokenSalt;
        bytes32 allocationTokenSalt;
        bytes32 realEstateTokenSalt;
        DeploymentInfo implementation;
    }

    struct ProjectDeploymentInfo {
        ProxyDeploymentInfo whitelist;
        ProxyDeploymentInfo tokenDatabase;
        ProxyDeploymentInfo tokenConverter;
        ProxyDeploymentInfo liquidityInitializer;
        ProxyDeploymentInfo allocator;
    }

    // Dex
    address public factory;
    address public router;

    // Tokens
    address public tokenImplementation;
    address public allocationRewardToken;
    address public allocationToken;
    address public realEstateToken;

    // Project contracts
    ProxyAddress public whitelist;
    ProxyAddress public tokenDatabase;
    ProxyAddress public tokenConverter;
    ProxyAddress public allocator;
    ProxyAddress public liquidityInitializer;

    constructor() {
        transferOwnership(msg.sender);
    }

    function deployDex(
        address _gnosisSafe,
        address _weth,
        DeploymentInfo calldata _factory,
        DeploymentInfo calldata _router
    ) external onlyOwner {
        factory = _deploy(_factory.code, _factory.salt);
        router = _deploy(_router.code, _router.salt);

        RyzeFactory(factory).initialize(_gnosisSafe);
        RyzeRouter(payable(router)).initialize(_gnosisSafe, factory, _weth);
    }

    function deployTokens(
        address _gnosisSafe,
        TokenDeploymentInfo calldata _tokenInfo
    ) external onlyOwner {
        tokenImplementation = _deploy(_tokenInfo.implementation.code, _tokenInfo.implementation.salt);

        allocationRewardToken = _deployProxy(tokenImplementation, _tokenInfo.allocationRewardTokenSalt);
        allocationToken = _deployProxy(tokenImplementation, _tokenInfo.allocationTokenSalt);
        realEstateToken = _deployProxy(tokenImplementation, _tokenInfo.realEstateTokenSalt);

        // Initialize tokens
        RyzeToken(allocationRewardToken).initialize(
            _gnosisSafe,
            'Ryze Allocation Reward Token',
            'ryzeREWARD',
            'https://api.ryze.land/metadata/allocation-rewards/{id}.json'
        );

        RyzeToken(allocationToken).initialize(
            _gnosisSafe,
            'Ryze Allocation Token',
            'ryzeALLOC',
            'https://api.ryze.land/metadata/allocations/{id}.json'
        );

        RyzeToken(realEstateToken).initialize(
            _gnosisSafe,
            'Ryze Real Estate Token',
            'RYZE',
            'https://api.ryze.land/metadata/real-estate/{id}.json'
        );
    }

    function deployProject(
        address _gnosisSafe,
        address _whitelistManager,
        address _stablecoin,
        uint16 _initialLiquidityBasisPoints,
        uint16 _referralRewardBasisPoints,
        ProjectDeploymentInfo calldata _projectInfo
    ) external onlyOwner {
        // Deploy Project
        whitelist = _deployImplementationAndProxy(_projectInfo.whitelist);
        tokenDatabase = _deployImplementationAndProxy(_projectInfo.tokenDatabase);
        tokenConverter = _deployImplementationAndProxy(_projectInfo.tokenConverter);
        allocator = _deployImplementationAndProxy(_projectInfo.allocator);
        liquidityInitializer = _deployImplementationAndProxy(_projectInfo.liquidityInitializer);

        // Initialize token stage 2
        RyzeToken(allocationRewardToken).initialize2(
            _gnosisSafe,
            allocator.proxy,
            tokenConverter.proxy
        );
        RyzeToken(allocationToken).initialize2(
            _gnosisSafe,
            allocator.proxy,
            tokenConverter.proxy
        );
        RyzeToken(realEstateToken).initialize2(
            _gnosisSafe,
            tokenConverter.proxy,
            tokenConverter.proxy
        );

        // Initialize project contracts
        RyzeWhitelist(whitelist.proxy).initialize(_gnosisSafe, _whitelistManager);
        RyzeTokenDatabase(tokenDatabase.proxy).initialize(_gnosisSafe);
        RyzeTokenConverter(tokenConverter.proxy).initialize(
            _gnosisSafe,
            tokenDatabase.proxy,
            allocator.proxy,
            allocationRewardToken,
            allocationToken,
            realEstateToken
        );
        RyzeAllocator(payable(allocator.proxy)).initialize(
            _gnosisSafe,
            whitelist.proxy,
            router,
            tokenDatabase.proxy,
            liquidityInitializer.proxy,
            allocationRewardToken,
            allocationToken,
            _stablecoin,
            _initialLiquidityBasisPoints,
            _referralRewardBasisPoints
        );
        RyzeLiquidityInitializer(liquidityInitializer.proxy).initialize(
            _gnosisSafe,
            router,
            allocator.proxy,
            tokenConverter.proxy,
            allocationToken,
            _stablecoin
        );
    }

    function _deployImplementationAndProxy(
        ProxyDeploymentInfo calldata _deployInfo
    ) internal returns (ProxyAddress memory) {
        address implementation = _deploy(_deployInfo.code, _deployInfo.implementationSalt);
        address proxy = _deployProxy(implementation, _deployInfo.proxySalt);

        return ProxyAddress(implementation, proxy);
    }

    function _deployProxy(
        address _implementation,
        bytes32 _salt
    ) internal returns (address) {
        address proxy = _deploy(
            abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    _implementation,
                    ""
                )
            ),
            _salt
        );

        return proxy;
    }

    function _deploy(
        bytes memory _code,
        bytes32 _salt
    ) internal returns (address) {
        address addr;

        assembly {
            addr := create2(0, add(_code, 0x20), mload(_code), _salt)
            if iszero(extcodesize(addr)) {revert(0, 0)}
        }

        return addr;
    }
}
