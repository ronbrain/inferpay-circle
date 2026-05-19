# InferPay — Hackathon Submission

## Project Title
InferPay

## Description
InferPay is a pay-per-inference AI agent platform where every Claude response costs USDC, settled atomically onchain on Arc in real time. Users deposit USDC once into a smart contract; each AI query deducts the exact model cost via the AgentPaymaster contract — no subscriptions, no API keys for end users, no custodial risk.

The core primitive is simple: AI result + payment proof arrive together. Every response includes a tx hash proving the USDC deduction happened onchain.

**Live demo:** https://inferpay-circle.vercel.app  
**GitHub:** https://github.com/ronbrain/inferpay-circle  

## Track
Track 4 — Agentic Economy

## Circle Account Email
founder@gezer.io

## Circle Products Used

### 1. Arc Testnet (Chain ID: 5042002)
All three smart contracts deployed on Arc. USDC is the native currency — this eliminates the "buy gas before you can transact" UX problem that breaks most onchain payment flows. Arc's ~250ms block finality makes per-inference settlement feel instant.

### 2. Arc USDC Precompile (`0x3600000000000000000000000000000000000000`)
NativeFiatToken used for all user deposits and agent deductions. ERC-20 compatible interface — no special SDK needed.

### 3. Circle Programmable Wallets
The agent wallet (`0xdD36f6bb3BA1a04FBdAEf2A29F619e44E6dFc596`) holds the server-side key and executes `deductInference()` after each Claude response. This keeps private keys off the client while enabling autonomous onchain payments — the right abstraction for agentic use cases.

### 4. Nanopayments (InferenceStream.sol)
Built a custom implementation of linear streaming payments — USDC drains per second from payer to recipient. Either party can cancel and recover the unstreamed portion. This is the smart contract equivalent of Circle's Nanopayments primitive, targeting continuous AI agent sessions.

### 5. CCTP v2
Included as a recharge layer in the system architecture — users can bridge USDC from Ethereum/Base to Arc to top up their InferPay balance without leaving the app. Ready for SDK integration.

## Smart Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| USDC (NativeFiatToken precompile) | `0x3600000000000000000000000000000000000000` |
| AgentPaymaster | `0xD4388B1F50C79EDc74AbD46265e1D3A8bb3B62d7` |
| InferenceStream | `0x4548833607c04A93074C1a29B4BC5E41a69516fb` |
| ModelRegistry | `0x61C188b4C7031EE1c681744C02D908e7D01B9d8e` |

## Documentation

### How it works
```
User deposits USDC → AgentPaymaster contract
User sends message → InferPay API (/api/agent)
API checks onchain balance → calls Claude API
Claude responds → agent wallet calls deductInference()
USDC deducted atomically onchain → tx hash returned to UI
```

### Architecture
Interactive system diagram: https://github.com/ronbrain/inferpay-circle/blob/main/app/static/architecture/index.html

Five layers:
1. **Client** — Browser, MetaMask, viem
2. **SvelteKit API** — Balance check, Claude proxy, deduction relay
3. **Arc Blockchain** — AgentPaymaster, InferenceStream, ModelRegistry
4. **Circle Infrastructure** — USDC Precompile, Programmable Wallets, CCTP v2
5. **AI Providers** — Claude (Anthropic), multi-provider registry onchain

### Tech stack
- Frontend: SvelteKit 2 + Svelte 5 (runes mode), TypeScript
- Contracts: Solidity 0.8.24, Foundry (5 tests, all passing)
- Chain: Arc Testnet, Chain ID 5042002
- Payments: Circle USDC NativeFiatToken + AgentPaymaster (custom)
- AI: Anthropic Claude API (Haiku 4.5 / Sonnet 4.6 / Opus 4.7)
- Wallet: viem + MetaMask (EIP-1193)

## Product Feedback

### Arc Testnet

**What worked great:**
- USDC as native gas token is a killer UX improvement — users never need to "buy ETH to pay for gas." For payment-focused apps this is transformative.
- EVM compatibility meant zero tooling changes — Foundry, viem, ethers all just worked.
- ~250ms finality made real-time payment UX actually feel real-time.
- The USDC precompile at `0x3600…0000` behaves exactly like a standard ERC-20. No wrapper, no special SDK — just a familiar interface.

**Issues found:**
- **`transferFrom` from contracts reverts** — the blocklist precompile at `0x1800…0001` returns `StackUnderflow` when called from a contract context. Only direct EOA transfers work. We worked around this with a sweep pattern (user calls `USDC.transfer(paymaster, amount)` then `paymaster.deposit()`), but it breaks the standard ERC-20 deposit flow and required redeploying contracts mid-hackathon.
- Chain ID 5042002 is not in MetaMask's preset registry or viem's chain list — every integration requires manual config.
- No public block explorer with working DNS during the hackathon (`explorer.testnet.arc.network` did not resolve).
- No public testnet faucet — required Circle developer console access to fund wallets.

### Circle Programmable Wallets

**What worked great:**
- The concept of a server-controlled wallet executing transactions without exposing keys to clients is exactly right for autonomous AI agents. The "agent wallet" pattern maps naturally to inference billing.

**Improvement requests:**
- REST API for calling arbitrary contract functions (not just USDC transfers) would make it easier to use Programmable Wallets for custom contract interactions like `deductInference`.
- Documentation on using Programmable Wallets as a "service account" (server-side signer) vs. a user-facing wallet would help.
- WebSocket event subscriptions for wallet activity (so we can notify users of deductions in real-time without polling).

### Nanopayments / Streaming

- The InferenceStream.sol contract we built is a direct smart contract implementation of the Nanopayments concept — linear USDC drain per second, cancellable, with instant settlement on Arc. This use case (per-token AI billing) is a perfect fit for Nanopayments once the SDK is available.
- Suggest: a Solidity interface or reference implementation for integrating Nanopayments into custom contracts would accelerate adoption.

### CCTP v2

- Included CCTP v2 as the cross-chain recharge layer in our architecture. The user story is: "I have USDC on Base, I want to top up my InferPay balance on Arc." CCTP v2 is the right primitive for this.
- A JS SDK with a single `bridge(amount, fromChain, toChain)` call would make this trivial to wire up.
