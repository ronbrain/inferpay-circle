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
	PAYMASTER: (import.meta.env.VITE_PAYMASTER_ADDRESS ?? '0x830e41AbB5AC5888B8412468aB4C53bEB84Af0d3') as `0x${string}`,
	STREAM:    (import.meta.env.VITE_STREAM_ADDRESS    ?? '0xFa716f5bc18BB64B1C4Cb86c22247F3330577dE6') as `0x${string}`,
	REGISTRY:  (import.meta.env.VITE_REGISTRY_ADDRESS  ?? '0x9D88AEEb2fab0ef9443A2D761dCac82A472c03d5') as `0x${string}`
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
