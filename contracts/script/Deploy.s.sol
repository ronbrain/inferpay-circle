// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentPaymaster.sol";
import "../src/InferenceStream.sol";
import "../src/ModelRegistry.sol";

contract Deploy is Script {
    // Arc testnet USDC (NativeFiatToken precompile)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerKey  = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer     = vm.addr(deployerKey);
        address agentWallet  = vm.envAddress("AGENT_WALLET_ADDRESS");

        console.log("Deployer:     ", deployer);
        console.log("Agent wallet: ", agentWallet);
        console.log("USDC:         ", ARC_USDC);
        console.log("Chain ID:     ", block.chainid);

        vm.startBroadcast(deployerKey);

        ModelRegistry registry = new ModelRegistry();
        console.log("ModelRegistry:", address(registry));

        AgentPaymaster paymaster = new AgentPaymaster(
            ARC_USDC,
            agentWallet,
            deployer       // fee recipient — update to treasury post-deploy
        );
        console.log("AgentPaymaster:", address(paymaster));

        InferenceStream stream = new InferenceStream(ARC_USDC);
        console.log("InferenceStream:", address(stream));

        vm.stopBroadcast();

        // Print .env snippet for copy-paste
        console.log("\n--- .env ---");
        console.log("VITE_REGISTRY_ADDRESS=", address(registry));
        console.log("VITE_PAYMASTER_ADDRESS=", address(paymaster));
        console.log("VITE_STREAM_ADDRESS=", address(stream));
    }
}
