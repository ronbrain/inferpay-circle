// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Stream {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Streaming payments for continuous AI agent service consumption on Arc.
///
/// A payer opens a stream → USDC drains linearly from deposit to recipient per second.
/// Either party can cancel; payer recovers the unstreamed portion.
/// Arc's deterministic finality makes sub-second settlement safe.
contract InferenceStream {
    IERC20Stream public immutable usdc;

    struct Stream {
        address payer;
        address recipient;
        uint256 ratePerSecond; // USDC (6 dec) per second
        uint256 deposit;       // total USDC locked
        uint256 startTime;
        uint256 endTime;
        uint256 withdrawn;     // amount already claimed by recipient
        bool    active;
    }

    uint256 public nextStreamId;
    mapping(uint256 => Stream) public streams;

    event StreamCreated(
        uint256 indexed id,
        address indexed payer,
        address indexed recipient,
        uint256 ratePerSecond,
        uint256 deposit,
        uint256 startTime,
        uint256 endTime
    );
    event StreamWithdrawn(uint256 indexed id, address indexed recipient, uint256 amount);
    event StreamCancelled(uint256 indexed id, uint256 recipientAmount, uint256 payerRefund);

    error NotPayer();
    error NotRecipient();
    error StreamNotActive();
    error InvalidDuration();
    error NothingToWithdraw();

    constructor(address _usdc) {
        usdc = IERC20Stream(_usdc);
    }

    // ── Payer creates stream ──────────────────────────────────────────────────

    /// @param recipient    Who receives the stream (model provider or agent)
    /// @param duration     Stream duration in seconds
    /// @param totalAmount  Total USDC to lock (ratePerSecond = totalAmount / duration)
    function createStream(
        address recipient,
        uint256 duration,
        uint256 totalAmount
    ) external returns (uint256 id) {
        if (duration == 0) revert InvalidDuration();

        uint256 rate = totalAmount / duration;
        // round down, refund dust to payer immediately by using rate*duration as actual deposit
        uint256 deposit = rate * duration;

        usdc.transferFrom(msg.sender, address(this), deposit);

        id = nextStreamId++;
        streams[id] = Stream({
            payer:         msg.sender,
            recipient:     recipient,
            ratePerSecond: rate,
            deposit:       deposit,
            startTime:     block.timestamp,
            endTime:       block.timestamp + duration,
            withdrawn:     0,
            active:        true
        });

        emit StreamCreated(id, msg.sender, recipient, rate, deposit, block.timestamp, block.timestamp + duration);
    }

    // ── Recipient withdraws vested amount ────────────────────────────────────

    function withdraw(uint256 id) external {
        Stream storage s = streams[id];
        if (msg.sender != s.recipient) revert NotRecipient();
        if (!s.active) revert StreamNotActive();

        uint256 vested = _vested(s);
        uint256 amount = vested - s.withdrawn;
        if (amount == 0) revert NothingToWithdraw();

        s.withdrawn += amount;
        usdc.transfer(s.recipient, amount);
        emit StreamWithdrawn(id, s.recipient, amount);
    }

    // ── Either party cancels ─────────────────────────────────────────────────

    function cancel(uint256 id) external {
        Stream storage s = streams[id];
        if (msg.sender != s.payer && msg.sender != s.recipient) revert NotPayer();
        if (!s.active) revert StreamNotActive();

        uint256 vested    = _vested(s);
        uint256 toRecipient = vested - s.withdrawn;
        uint256 toRefund    = s.deposit - vested;

        s.active = false;

        if (toRecipient > 0) usdc.transfer(s.recipient, toRecipient);
        if (toRefund > 0)    usdc.transfer(s.payer, toRefund);

        emit StreamCancelled(id, toRecipient, toRefund);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function claimable(uint256 id) external view returns (uint256) {
        Stream storage s = streams[id];
        if (!s.active) return 0;
        return _vested(s) - s.withdrawn;
    }

    function _vested(Stream storage s) internal view returns (uint256) {
        uint256 elapsed = (block.timestamp >= s.endTime ? s.endTime : block.timestamp) - s.startTime;
        uint256 v = elapsed * s.ratePerSecond;
        return v > s.deposit ? s.deposit : v;
    }
}
