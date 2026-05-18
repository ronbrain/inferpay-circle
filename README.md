# InferPay — Pay-Per-Inference AI Agent on Arc

> **Track 4: Agentic Economy** · Circle Stablecoin Commerce Stack Challenge

InferPay is an AI agent platform where every Claude response costs USDC, settled onchain in real-time on Arc. Users deposit USDC once; each query deducts the model cost atomically via a smart contract — no subscriptions, no API keys for end users, no custodial risk.

---

## Live Demo

**App:** https://inferpay.up.railway.app  
**Architecture:** https://inferpay.up.railway.app/architecture/index.html  
**Arc Testnet Explorer:** https://explorer.testnet.arc.network

---

## How It Works

```
User deposits USDC → AgentPaymaster contract
User sends message → InferPay API server
API checks onchain balance → calls Claude API
Claude responds → agent wallet calls deductInference()
USDC deducted atomically onchain → tx hash returned to UI
```

Each query is a micro-transaction: the AI result and its payment proof arrive together.

---

## Circle Products Used

| Product | How InferPay Uses It |
|---------|---------------------|
| **Arc Testnet (Chain 5042002)** | All contracts deployed here; USDC is the native currency |
| **Arc USDC Precompile** (`0x3600…0000`) | NativeFiatToken used for all deposits/deductions |
| **Circle Programmable Wallets** | Agent wallet (`0xdD36f6bb`) executes onchain deductions without exposing keys in client |
| **CCTP v2** | Cross-chain USDC recharge path (architecture layer, ready for integration) |
| **Nanopayments** | InferenceStream.sol implements linear streaming payments per-second for long sessions |

---

## Smart Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| USDC (NativeFiatToken) | `0x3600000000000000000000000000000000000000` |
| AgentPaymaster | `0xD4388B1F50C79EDc74AbD46265e1D3A8bb3B62d7` |
| InferenceStream | `0x4548833607c04A93074C1a29B4BC5E41a69516fb` |
| ModelRegistry | `0x61C188b4C7031EE1c681744C02D908e7D01B9d8e` |

### AgentPaymaster.sol

Core pay-per-inference contract. Users deposit USDC; a trusted agent wallet deducts per query with a 0.5% protocol fee split.

```solidity
function deposit(uint256 amount) external          // user deposits USDC
function deductInference(                           // agent deducts after response
    address user,
    address provider,
    uint256 cost,
    string calldata modelId
) external onlyAgent
function getStats(address user) external view       // balance, spent, query count
    returns (uint256 balance, uint256 totalSpent, uint256 queryCount)
```

### InferenceStream.sol

Linear streaming payments. A payer locks USDC and it drains per-second to the recipient. Either party can cancel and recover the unstreamed portion.

### ModelRegistry.sol

On-chain provider registry. Seeded with 5 providers at deploy:
- `claude-sonnet-4-6` — 124 µUSDC / 1k tokens
- `claude-haiku-4-5` — 41 µUSDC / 1k tokens  
- `gpt-5` — 180 µUSDC / 1k tokens
- `llama-3.3-70b` — 61 µUSDC / 1k tokens
- `sdxl-turbo` — 950 µUSDC / image

---

## Architecture

![Architecture Diagram](app/static/architecture/index.html)

The interactive architecture diagram at `/architecture/index.html` shows the full system design with animated flows across 5 layers:

1. **Client Layer** — Browser, MetaMask, viem
2. **SvelteKit API Layer** — Balance check, Claude proxy, deduction
3. **Arc Blockchain** — AgentPaymaster, InferenceStream, ModelRegistry
4. **Circle Infrastructure** — USDC Precompile, Programmable Wallets, CCTP v2
5. **AI Providers** — Claude (Anthropic), future multi-provider support

---

## Local Setup

### Prerequisites

- Node.js 18+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- MetaMask with Arc Testnet configured

### 1. Configure MetaMask for Arc Testnet

```
Network Name: Arc Testnet
RPC URL: https://rpc.testnet.arc.network
Chain ID: 5042002
Currency Symbol: USDC
Explorer: https://explorer.testnet.arc.network
```

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/inferpay
cd inferpay/app
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in:
# ANTHROPIC_API_KEY=sk-ant-...
# AGENT_PRIVATE_KEY=0x...   (agent wallet private key)
# PROVIDER_ADDRESS=0x...    (fee recipient address)
# VITE_PAYMASTER_ADDRESS=0x830e41AbB5AC5888B8412468aB4C53bEB84Af0d3
# VITE_STREAM_ADDRESS=0xFa716f5bc18BB64B1C4Cb86c22247F3330577dE6
# VITE_REGISTRY_ADDRESS=0x9D88AEEb2fab0ef9443A2D761dCac82A472c03d5
```

### 4. Run dev server

```bash
npm run dev
```

### 5. Get testnet USDC

Request from [Circle's testnet faucet](https://faucet.circle.com).

### Deploy contracts (optional — already deployed on Arc testnet)

```bash
cd contracts
forge build
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

---

## Usage Flow

1. Open app → Connect MetaMask (Arc Testnet)
2. Click **Deposit** → approve USDC transfer to AgentPaymaster
3. Select model (Haiku 0.001 USDC · Sonnet 0.005 USDC · Opus 0.025 USDC)
4. Type a message → AI responds → USDC deducted, tx hash displayed
5. Optional: open **Streaming Payments** panel to create a timed payment stream

---

## Circle Product Feedback

### Arc Testnet

**What worked well:**
- EVM compatibility made it easy to use standard Solidity tooling (Foundry, viem, ethers)
- USDC as native currency eliminates the "buy gas before you can do anything" UX problem — this alone is a huge DX win for payment-focused apps
- 250ms block finality made real-time payment UX feel snappy
- The USDC precompile at `0x3600…0000` behaved exactly like a standard ERC-20, no special SDK needed

**Friction points:**
- Chain ID 5042002 is not yet in common chain registries (viem, wagmi, MetaMask presets) — had to add it manually everywhere
- RPC endpoint discovery: the primary `rpc.testnet.arc.network` worked but took multiple tries to find from documentation; a single canonical endpoint page would help
- Faucet: needed to use Circle developer console to fund deployer wallet — a public testnet faucet would lower the barrier for hackathon participants
- No block explorer with contract verification support yet — had to verify contract ABI manually

### Circle Programmable Wallets

**What worked well:**
- Concept of a server-side wallet executing transactions without exposing keys to users is exactly the right abstraction for agentic payments
- The agent wallet pattern (server holds key, signs on behalf of users) maps naturally to the AI inference use case

**Improvement requests:**
- REST API for signing arbitrary contract calls (not just transfers) would make it easier to use for custom contract interactions like `deductInference`
- WebSocket support for wallet event subscriptions would enable real-time balance notifications without polling
- Clearer documentation on using Programmable Wallets as a "service account" rather than just a user wallet

### CCTP v2 / Nanopayments

- CCTP v2 is the right primitive for cross-chain recharging (e.g., user has USDC on Ethereum, wants to top up Arc balance) — looking forward to SDK support
- Nanopayments (sub-cent streaming) are the perfect match for per-token AI billing — the InferenceStream.sol contract we built is a direct prototype of this concept at the smart contract layer

---

## Tech Stack

- **Frontend**: SvelteKit 2 + Svelte 5 runes, TypeScript
- **Contracts**: Solidity 0.8.24, Foundry
- **Chain**: Arc Testnet (Circle), chain ID 5042002
- **Payments**: Circle USDC NativeFiatToken + AgentPaymaster (custom)
- **AI**: Anthropic Claude API (Haiku 4.5 / Sonnet 4.6 / Opus 4.7)
- **Wallet**: viem + MetaMask (EIP-1193)

---

## License

MIT
