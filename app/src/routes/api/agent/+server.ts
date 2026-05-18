import { json, error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, CONTRACTS, formatUsdc } from '$lib/chain/arc';
import { PAYMASTER_ABI } from '$lib/chain/abis';
import { ANTHROPIC_API_KEY, AGENT_PRIVATE_KEY, PROVIDER_ADDRESS as PROVIDER_ENV } from '$env/static/private';
import type { RequestHandler } from './$types';

const MODEL_COSTS: Record<string, bigint> = {
	'claude-sonnet-4-6': 5_000n,
	'claude-haiku-4-5':  1_000n,
	'claude-opus-4-7':  25_000n
};

function getClients() {
	if (!AGENT_PRIVATE_KEY || AGENT_PRIVATE_KEY === '0x' + '0'.repeat(64)) {
		throw new Error('AGENT_PRIVATE_KEY not set');
	}
	const agentAccount = privateKeyToAccount(AGENT_PRIVATE_KEY as `0x${string}`);
	const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
	const walletClient = createWalletClient({ chain: arcTestnet, transport: http(), account: agentAccount });
	return { publicClient, walletClient };
}

export const POST: RequestHandler = async ({ request }) => {
	const { messages, userAddress, modelId = 'claude-haiku-4-5' } = await request.json();

	if (!userAddress) throw error(400, 'userAddress required');
	if (!messages?.length) throw error(400, 'messages required');
	if (!ANTHROPIC_API_KEY) throw error(500, 'ANTHROPIC_API_KEY not configured');

	const cost = MODEL_COSTS[modelId] ?? MODEL_COSTS['claude-haiku-4-5'];
	const providerAddress = (PROVIDER_ENV ?? '0x0000000000000000000000000000000000000001') as `0x${string}`;

	// Check onchain balance
	let balance = 0n;
	try {
		const { publicClient } = getClients();
		const stats = await publicClient.readContract({
			address: CONTRACTS.PAYMASTER,
			abi: PAYMASTER_ABI,
			functionName: 'getStats',
			args: [userAddress as `0x${string}`]
		});
		[balance] = stats as [bigint, bigint, bigint];

		if (balance < cost) {
			throw error(402, `Insufficient balance. Need ${formatUsdc(cost)} USDC, have ${formatUsdc(balance)} USDC. Deposit more to continue.`);
		}
	} catch (e: any) {
		if (e.status) throw e; // rethrow SvelteKit errors
		console.warn('Balance check failed (proceeding anyway for demo):', e.message);
	}

	// Call Claude
	const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
	const response  = await anthropic.messages.create({
		model: modelId,
		max_tokens: 1024,
		system: `You are InferPay — an AI agent operating on the Arc blockchain (chain 5042002).
You help users with tasks and each of your responses costs USDC, settled in real-time onchain on Arc.
Current user wallet: ${userAddress}
Cost per query: ${formatUsdc(cost)} USDC
Smart contracts live on Arc testnet:
- AgentPaymaster: ${CONTRACTS.PAYMASTER}
- InferenceStream: ${CONTRACTS.STREAM}
- USDC: ${CONTRACTS.USDC}
Be concise and useful. When discussing payments or transactions, be specific about amounts in USDC.`,
		messages: messages.map((m: { role: string; content: string }) => ({
			role: m.role as 'user' | 'assistant',
			content: m.content
		}))
	});

	const content = response.content[0].type === 'text' ? response.content[0].text : '';

	// Deduct onchain after successful response
	let txHash: string | undefined;
	try {
		const { walletClient } = getClients();
		txHash = await walletClient.writeContract({
			address: CONTRACTS.PAYMASTER,
			abi: PAYMASTER_ABI,
			functionName: 'deductInference',
			args: [userAddress as `0x${string}`, providerAddress, cost, modelId]
		});
		console.log(`Deducted ${formatUsdc(cost)} USDC from ${userAddress} → tx ${txHash}`);
	} catch (e) {
		console.error('Onchain deduction failed (response delivered):', e);
	}

	return json({ content, cost: cost.toString(), txHash, modelId, usage: response.usage });
};
