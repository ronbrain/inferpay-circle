// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentPaymaster.sol";

contract MockUSDC is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to]   += amt;
        return true;
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        balanceOf[msg.sender] -= amt;
        balanceOf[to]         += amt;
        return true;
    }
}

contract AgentPaymasterTest is Test {
    AgentPaymaster paymaster;
    MockUSDC       usdc;

    address user     = address(0xA1);
    address agent    = address(0xA2);
    address provider = address(0xA3);
    address fee_recv = address(0xA4);

    function setUp() public {
        usdc      = new MockUSDC();
        paymaster = new AgentPaymaster(address(usdc), agent, fee_recv);

        usdc.mint(user, 1_000_000); // 1 USDC (6 dec)
        vm.prank(user);
        usdc.approve(address(paymaster), type(uint256).max);
    }

    function test_deposit_and_balance() public {
        vm.prank(user);
        paymaster.deposit(500_000);
        assertEq(paymaster.balances(user), 500_000);
    }

    function test_deduct_inference() public {
        vm.prank(user);
        paymaster.deposit(1_000_000);

        vm.prank(agent);
        paymaster.deductInference(user, provider, 10_000, "claude-sonnet-4-6");

        // 0.5% fee = 50; provider gets 9950
        assertEq(usdc.balanceOf(provider), 9_950);
        assertEq(usdc.balanceOf(fee_recv), 50);
        assertEq(paymaster.balances(user), 990_000);
        assertEq(paymaster.queryCount(user), 1);
    }

    function test_withdraw() public {
        vm.prank(user);
        paymaster.deposit(1_000_000);

        vm.prank(user);
        paymaster.withdraw(400_000);

        assertEq(paymaster.balances(user), 600_000);
        assertEq(usdc.balanceOf(user), 400_000);
    }

    function test_insufficient_balance_reverts() public {
        vm.prank(user);
        paymaster.deposit(100);

        vm.prank(agent);
        vm.expectRevert();
        paymaster.deductInference(user, provider, 200, "claude-sonnet-4-6");
    }

    function test_only_agent_can_deduct() public {
        vm.prank(user);
        paymaster.deposit(1_000_000);

        vm.prank(address(0xBAD));
        vm.expectRevert(AgentPaymaster.NotAgent.selector);
        paymaster.deductInference(user, provider, 1_000, "claude-sonnet-4-6");
    }
}
