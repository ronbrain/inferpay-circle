// InferPay // System Architecture — data model
// Layers, nodes, edges. All node ids are globally unique across layers.

const LAYERS = [
  {
    id: 'client',
    code: '01',
    title: 'CLIENT',
    sub: 'User-facing dApp & wallet',
    accent: 'flow',
    nodes: [
      {
        id: 'dapp',
        kind: 'frontend',
        name: 'InferPay dApp',
        meta: 'Next.js 14 · wagmi · viem',
        foot: 'Prompt UI · live balance · history',
      },
      {
        id: 'wallet',
        kind: 'wallet',
        name: 'User Wallet',
        meta: 'Circle Programmable Wallet',
        foot: 'Signs intents · holds USDC',
      },
    ],
  },
  {
    id: 'agent',
    code: '02',
    title: 'ORCHESTRATION',
    sub: 'AI agent decision layer',
    accent: 'flow',
    nodes: [
      {
        id: 'parser',
        kind: 'agent',
        name: 'Intent Parser',
        meta: 'Claude Sonnet 4.6',
        foot: 'Task + constraints from prompt',
      },
      {
        id: 'router',
        kind: 'agent',
        name: 'Model Router',
        meta: 'price × quality × latency',
        foot: 'Picks best provider per call',
      },
      {
        id: 'policy',
        kind: 'policy',
        name: 'Spend Policy',
        meta: 'Per-query cap · session limit',
        foot: 'Enforces user budgets',
      },
    ],
  },
  {
    id: 'market',
    code: '03',
    title: 'AI MARKETPLACE',
    sub: 'Pay-per-call inference providers',
    accent: 'flow',
    nodes: [
      {
        id: 'claude',
        kind: 'model · text',
        name: 'Claude Sonnet 4.6',
        meta: 'anthropic',
        price: '0.000124 USDC/1k tok',
      },
      {
        id: 'gpt',
        kind: 'model · text',
        name: 'GPT-5',
        meta: 'openai',
        price: '0.000180 USDC/1k tok',
      },
      {
        id: 'llama',
        kind: 'model · text',
        name: 'Llama 3.3 70B',
        meta: 'together',
        price: '0.000061 USDC/1k tok',
      },
      {
        id: 'sdxl',
        kind: 'model · image',
        name: 'SDXL Turbo',
        meta: 'replicate',
        price: '0.000950 USDC/image',
      },
      {
        id: 'tavily',
        kind: 'service · search',
        name: 'Tavily Search',
        meta: 'tavily',
        price: '0.000200 USDC/call',
      },
    ],
  },
  {
    id: 'payment',
    code: '04',
    title: 'PAYMENT RAILS',
    sub: 'Circle stablecoin infrastructure',
    accent: 'value',
    nodes: [
      {
        id: 'nano',
        kind: 'protocol',
        name: 'Nanopayments',
        meta: 'Circle · sub-cent streaming',
        foot: 'Off-chain channels · onchain settle',
      },
      {
        id: 'pwallet',
        kind: 'wallet',
        name: 'Agent Wallet',
        meta: 'Programmable Wallet',
        foot: 'Session escrow · provider payouts',
      },
      {
        id: 'cctp',
        kind: 'bridge',
        name: 'CCTP v2',
        meta: 'Cross-chain transfer protocol',
        foot: 'Recharge from any chain',
      },
    ],
  },
  {
    id: 'contracts',
    code: '05',
    title: 'SMART CONTRACTS',
    sub: 'Onchain logic — Solidity',
    accent: 'event',
    nodes: [
      {
        id: 'paymaster',
        kind: 'contract',
        name: 'AgentPaymaster.sol',
        addr: '0x830e...Af0d3',
        foot: 'Authorizes nano-deductions',
      },
      {
        id: 'stream',
        kind: 'contract',
        name: 'InferenceStream.sol',
        addr: '0xFa71...7dE6',
        foot: 'Streams pay → provider',
      },
      {
        id: 'registry',
        kind: 'contract',
        name: 'ModelRegistry.sol',
        addr: '0x9D88...03d5',
        foot: 'Provider IDs + pricing oracle',
      },
    ],
  },
  {
    id: 'chain',
    code: '06',
    title: 'CHAIN',
    sub: 'Settlement layer',
    accent: 'event',
    nodes: [
      {
        id: 'arc',
        kind: 'l2',
        name: 'Arc Testnet',
        meta: 'chain 1337 · 250 ms blocks',
        foot: 'EVM · Circle-native gas',
      },
      {
        id: 'usdc',
        kind: 'precompile',
        name: 'USDC FiatToken',
        addr: '0x3600...0000',
        foot: 'Canonical stablecoin',
      },
    ],
  },
];

// Edges: from node-id → to node-id; class = 'flow' | 'value' | 'event'
// Edges are directional and rendered as cubic bezier curves between node centers.
const EDGES = [
  // Client ↔ Orchestration
  ['dapp', 'parser', 'flow'],
  ['wallet', 'policy', 'flow'],

  // Orchestration internal
  ['parser', 'router', 'flow'],
  ['router', 'policy', 'flow'],

  // Orchestration → Marketplace (router fans out)
  ['router', 'claude', 'flow'],
  ['router', 'gpt', 'flow'],
  ['router', 'llama', 'flow'],
  ['router', 'sdxl', 'flow'],
  ['router', 'tavily', 'flow'],

  // Orchestration → Payment (policy authorizes)
  ['policy', 'nano', 'value'],

  // Marketplace → Payment (providers paid via nano)
  ['claude', 'nano', 'value'],
  ['gpt', 'nano', 'value'],
  ['llama', 'nano', 'value'],
  ['sdxl', 'nano', 'value'],
  ['tavily', 'nano', 'value'],

  // Payment internal
  ['nano', 'pwallet', 'value'],
  ['cctp', 'pwallet', 'value'],

  // Payment → Contracts
  ['nano', 'paymaster', 'event'],
  ['pwallet', 'stream', 'event'],
  ['cctp', 'paymaster', 'event'],

  // Contracts internal
  ['paymaster', 'stream', 'event'],
  ['stream', 'registry', 'event'],

  // Contracts → Chain
  ['paymaster', 'arc', 'event'],
  ['stream', 'arc', 'event'],
  ['registry', 'arc', 'event'],
  ['arc', 'usdc', 'event'],
];

// A "scenario" = a full query trace. Defines the sequence of edges to light up,
// the timing, and the side-effects (events emitted, balance delta).
const SCENARIOS = [
  {
    id: 'text-query',
    label: 'Text query · routed to Claude',
    prompt: 'Summarize the Arc whitepaper in 5 bullets',
    steps: [
      { edges: [['dapp', 'parser']],     ev: 'agent.received',  delay: 0    },
      { edges: [['parser', 'router']],   ev: 'agent.parsed',    delay: 350  },
      { edges: [['wallet', 'policy'], ['router', 'policy']], ev: 'policy.checked', delay: 700 },
      { edges: [['router', 'claude']],   ev: 'route.selected',  delay: 1050, model: 'Claude Sonnet 4.6' },
      { edges: [['policy', 'nano']],     ev: 'nano.authorized', delay: 1300, amount: 0.000124 },
      { edges: [['claude', 'nano']],     ev: 'inference.done',  delay: 1900 },
      { edges: [['nano', 'pwallet'], ['nano', 'paymaster']], ev: 'paymaster.deduct', delay: 2200 },
      { edges: [['pwallet', 'stream']],  ev: 'stream.tick',     delay: 2500 },
      { edges: [['paymaster', 'arc'], ['stream', 'arc']], ev: 'block.included', delay: 2800 },
      { edges: [['arc', 'usdc']],        ev: 'usdc.transfer',   delay: 3050 },
    ],
    cost: 0.000124,
  },
  {
    id: 'image-query',
    label: 'Image gen · routed to SDXL',
    prompt: 'Generate a logo for InferPay — minimalist, monoline',
    steps: [
      { edges: [['dapp', 'parser']],     ev: 'agent.received',  delay: 0 },
      { edges: [['parser', 'router']],   ev: 'agent.parsed',    delay: 350 },
      { edges: [['router', 'sdxl']],     ev: 'route.selected',  delay: 700, model: 'SDXL Turbo' },
      { edges: [['policy', 'nano']],     ev: 'nano.authorized', delay: 950, amount: 0.000950 },
      { edges: [['sdxl', 'nano']],       ev: 'inference.done',  delay: 1900 },
      { edges: [['nano', 'paymaster']],  ev: 'paymaster.deduct',delay: 2200 },
      { edges: [['paymaster', 'stream']],ev: 'stream.tick',     delay: 2450 },
      { edges: [['stream', 'arc']],      ev: 'block.included',  delay: 2700 },
      { edges: [['arc', 'usdc']],        ev: 'usdc.transfer',   delay: 2950 },
    ],
    cost: 0.000950,
  },
  {
    id: 'search-query',
    label: 'Search · routed to Tavily',
    prompt: 'Latest news on Circle USDC reserves',
    steps: [
      { edges: [['dapp', 'parser']],     ev: 'agent.received',  delay: 0 },
      { edges: [['parser', 'router']],   ev: 'agent.parsed',    delay: 280 },
      { edges: [['router', 'tavily']],   ev: 'route.selected',  delay: 560, model: 'Tavily Search' },
      { edges: [['policy', 'nano']],     ev: 'nano.authorized', delay: 800, amount: 0.000200 },
      { edges: [['tavily', 'nano']],     ev: 'inference.done',  delay: 1400 },
      { edges: [['nano', 'paymaster']],  ev: 'paymaster.deduct',delay: 1700 },
      { edges: [['paymaster', 'arc']],   ev: 'block.included',  delay: 2000 },
      { edges: [['arc', 'usdc']],        ev: 'usdc.transfer',   delay: 2250 },
    ],
    cost: 0.000200,
  },
  {
    id: 'recharge',
    label: 'Recharge · CCTP from Ethereum',
    prompt: '— user tops up agent wallet with 5.00 USDC —',
    steps: [
      { edges: [['cctp', 'pwallet']],    ev: 'cctp.received',   delay: 0, amount: 5.0 },
      { edges: [['cctp', 'paymaster']],  ev: 'paymaster.credit',delay: 400 },
      { edges: [['paymaster', 'arc']],   ev: 'block.included',  delay: 800 },
      { edges: [['arc', 'usdc']],        ev: 'usdc.mint',       delay: 1050 },
    ],
    cost: -5.0, // negative = credit
  },
];

// Friendly signature templates for each event type → fills the side log
const EVENT_TEMPLATES = {
  'agent.received':  { sig: 'AgentReceived',       src: 'agent',    args: (s) => `prompt="${truncate(s.prompt, 36)}"` },
  'agent.parsed':    { sig: 'IntentParsed',        src: 'agent',    args: (s) => `task=${s.taskType}` },
  'policy.checked':  { sig: 'PolicyChecked',       src: 'agent',    args: (s) => `cap=0.01 USDC · ok=true` },
  'route.selected':  { sig: 'RouteSelected',       src: 'agent',    args: (s) => `model="${s.model}"` },
  'nano.authorized': { sig: 'NanoAuthorized',      src: 'payment',  args: (s) => `amount=<val>${fmt(s.amount)}</val> USDC` },
  'inference.done':  { sig: 'InferenceCompleted',  src: 'agent',    args: (s) => `latency=${s.latency}ms` },
  'paymaster.deduct':{ sig: 'AgentPaymaster.Deduct', src: 'contract', args: (s) => `user=<addr>${s.user}</addr> amount=<val>${fmt(s.amount)}</val>` },
  'paymaster.credit':{ sig: 'AgentPaymaster.Credit', src: 'contract', args: (s) => `to=<addr>${s.user}</addr> amount=<val>${fmt(s.amount)}</val>` },
  'stream.tick':     { sig: 'InferenceStream.Tick',  src: 'contract', args: (s) => `provider=<addr>${s.provider}</addr> drip=<val>${fmt(s.amount)}</val>` },
  'block.included':  { sig: 'BlockIncluded',         src: 'contract', args: (s) => `block=#${s.block} · gas=21000` },
  'usdc.transfer':   { sig: 'USDC.Transfer',         src: 'contract', args: (s) => `from=<addr>${s.user}</addr> to=<addr>${s.provider}</addr> value=<val>${fmt(s.amount)}</val>` },
  'usdc.mint':       { sig: 'USDC.Mint',             src: 'contract', args: (s) => `to=<addr>${s.user}</addr> value=<val>${fmt(s.amount)}</val>` },
  'cctp.received':   { sig: 'CCTP.Received',         src: 'payment',  args: (s) => `source=ethereum amount=<val>${fmt(s.amount)}</val>` },
};

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

window.LAYERS = LAYERS;
window.EDGES = EDGES;
window.SCENARIOS = SCENARIOS;
window.EVENT_TEMPLATES = EVENT_TEMPLATES;
