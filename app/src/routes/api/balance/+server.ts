import { json, error } from '@sveltejs/kit';
import { createPublicClient, http } from 'viem';
import { arcTestnet, CONTRACTS, formatUsdc } from '$lib/chain/arc';
import { PAYMASTER_ABI, ERC20_ABI } from '$lib/chain/abis';
import type { RequestHandler } from './$types';

const client = createPublicClient({ chain: arcTestnet, transport: http() });

export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address') as `0x${string}` | null;
	if (!address) throw error(400, 'address required');

	const [usdcBalance, paymasterStats] = await Promise.all([
		client.readContract({
			address: CONTRACTS.USDC,
			abi: ERC20_ABI,
			functionName: 'balanceOf',
			args: [address]
		}),
		client.readContract({
			address: CONTRACTS.PAYMASTER,
			abi: PAYMASTER_ABI,
			functionName: 'getStats',
			args: [address]
		})
	]);

	const [agentBalance, totalSpent, queryCount] = paymasterStats as [bigint, bigint, bigint];

	return json({
		usdcBalance: (usdcBalance as bigint).toString(),
		agentBalance: agentBalance.toString(),
		totalSpent: totalSpent.toString(),
		queryCount: queryCount.toString(),
		formatted: {
			usdcBalance: formatUsdc(usdcBalance as bigint),
			agentBalance: formatUsdc(agentBalance),
			totalSpent: formatUsdc(totalSpent)
		}
	});
};
