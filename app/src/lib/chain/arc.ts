import { type Chain } from 'viem';

export const arcTestnet: Chain = {
	id: 5042002,
	name: 'Arc Testnet',
	nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
	rpcUrls: {
		default: { http: [import.meta.env.VITE_ARC_RPC_URL ?? 'https://rpc.testnet.arc.network'] }
	},
	blockExplorers: {
		default: {
			name: 'Arc Explorer',
			url: import.meta.env.VITE_ARC_EXPLORER_URL ?? 'https://explorer.testnet.arc.network'
		}
	},
	testnet: true
};

// Arc testnet contract addresses (from Circle deployment)
export const CONTRACTS = {
	USDC:      '0x3600000000000000000000000000000000000000' as `0x${string}`,
	PAYMASTER: (import.meta.env.VITE_PAYMASTER_ADDRESS ?? '0xD4388B1F50C79EDc74AbD46265e1D3A8bb3B62d7') as `0x${string}`,
	STREAM:    (import.meta.env.VITE_STREAM_ADDRESS    ?? '0x4548833607c04A93074C1a29B4BC5E41a69516fb') as `0x${string}`,
	REGISTRY:  (import.meta.env.VITE_REGISTRY_ADDRESS  ?? '0x61C188b4C7031EE1c681744C02D908e7D01B9d8e') as `0x${string}`
} as const;

export const USDC_DECIMALS = 6;

export function formatUsdc(raw: bigint): string {
	const whole = raw / 1_000_000n;
	const frac = raw % 1_000_000n;
	return `${whole}.${frac.toString().padStart(6, '0').slice(0, 4)}`;
}

export function parseUsdc(amount: number): bigint {
	return BigInt(Math.round(amount * 1_000_000));
}
