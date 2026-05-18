// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

interface IUSDC { function transfer(address, uint256) external returns (bool); }
interface IPaymaster { function deposit() external; }

contract Deposit is Script {
    address constant USDC      = 0x3600000000000000000000000000000000000000;
    address constant PAYMASTER = 0xD4388B1F50C79EDc74AbD46265e1D3A8bb3B62d7;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        IUSDC(USDC).transfer(PAYMASTER, 5_000_000);
        IPaymaster(PAYMASTER).deposit();
        vm.stopBroadcast();
    }
}
