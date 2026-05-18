// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Manages USDC deposits and per-inference deductions for AI agent queries on Arc.
///
/// Flow:
///   1. User calls deposit() with USDC approval
///   2. Backend (agent wallet) calls deductInference() per query — fee split: provider cut + protocol fee
///   3. User can withdraw remaining balance at any time
///
/// Arc testnet USDC: 0x3600000000000000000000000000000000000000
contract AgentPaymaster {
    IERC20 public immutable usdc;

    address public owner;
    address public agent;        // Circle Wallets key — executes deductions
    address public feeRecipient; // Protocol treasury

    uint256 public protocolFeeBps = 50; // 0.5% to protocol
    uint256 public constant MAX_FEE_BPS = 1000;

    mapping(address => uint256) public balances;    // user USDC balance (6 decimals)
    mapping(address => uint256) public totalSpent;  // lifetime spend per user
    mapping(address => uint256) public queryCount;  // lifetime queries per user

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event InferenceDeducted(
        address indexed user,
        address indexed provider,
        uint256 userCost,
        uint256 providerCut,
        uint256 protocolFee,
        string  modelId
    );
    event AgentUpdated(address indexed newAgent);
    event ProtocolFeeUpdated(uint256 newBps);

    error NotAgent();
    error NotOwner();
    error InsufficientBalance(uint256 have, uint256 need);
    error ZeroAmount();
    error FeeTooHigh();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(address _usdc, address _agent, address _feeRecipient) {
        usdc         = IERC20(_usdc);
        owner        = msg.sender;
        agent        = _agent;
        feeRecipient = _feeRecipient;
    }

    // ── User actions ──────────────────────────────────────────────────────────

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance(balances[msg.sender], amount);
        balances[msg.sender] -= amount;
        usdc.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ── Agent actions ─────────────────────────────────────────────────────────

    /// @param user         Wallet that initiated the query
    /// @param provider     Model provider receiving the majority cut
    /// @param cost         Total USDC cost of the inference (6 decimals)
    /// @param modelId      Identifier for the model used (logged onchain)
    function deductInference(
        address user,
        address provider,
        uint256 cost,
        string calldata modelId
    ) external onlyAgent {
        if (cost == 0) revert ZeroAmount();
        if (balances[user] < cost) revert InsufficientBalance(balances[user], cost);

        uint256 fee = (cost * protocolFeeBps) / 10_000;
        uint256 providerCut = cost - fee;

        balances[user] -= cost;
        totalSpent[user]  += cost;
        queryCount[user]  += 1;

        usdc.transfer(provider, providerCut);
        if (fee > 0) usdc.transfer(feeRecipient, fee);

        emit InferenceDeducted(user, provider, cost, providerCut, fee, modelId);
    }

    // ── Owner admin ───────────────────────────────────────────────────────────

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function setProtocolFee(uint256 bps) external onlyOwner {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = bps;
        emit ProtocolFeeUpdated(bps);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getStats(address user) external view returns (
        uint256 balance,
        uint256 spent,
        uint256 queries
    ) {
        return (balances[user], totalSpent[user], queryCount[user]);
    }
}
