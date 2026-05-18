import { writable, derived } from 'svelte/store';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { arcTestnet, CONTRACTS, USDC_DECIMALS } from '$lib/chain/arc';
import { PAYMASTER_ABI, ERC20_ABI } from '$lib/chain/abis';

// ── State ─────────────────────────────────────────────────────────────────────

export const account    = writable<`0x${string}` | null>(null);
export const connecting = writable(false);
export const chainId    = writable<number | null>(null);

export interface UserStats {
	usdcBalance: bigint;
	agentBalance: bigint;
	totalSpent: bigint;
	queryCount: bigint;
}

export const stats        = writable<UserStats | null>(null);
export const statsLoading = writable(false);

// ── Clients ──────────────────────────────────────────────────────────────────

export const publicClient = createPublicClient({
	chain: arcTestnet,
	transport: http()
});

function getWalletClient() {
	if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet');
	return createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum) });
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function connectWallet() {
	if (typeof window === 'undefined') return;
	connecting.set(true);
	try {
		const wc = getWalletClient();
		const [addr] = await wc.requestAddresses();
		account.set(addr);

		try {
			await window.ethereum!.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: `0x${arcTestnet.id.toString(16)}` }]
			});
		} catch {
			await window.ethereum!.request({
				method: 'wallet_addEthereumChain',
				params: [{
					chainId: `0x${arcTestnet.id.toString(16)}`,
					chainName: arcTestnet.name,
					nativeCurrency: arcTestnet.nativeCurrency,
					rpcUrls: [arcTestnet.rpcUrls.default.http[0]],
					blockExplorerUrls: [arcTestnet.blockExplorers?.default.url]
				}]
			});
		}

		await refreshStats(addr);
	} finally {
		connecting.set(false);
	}
}

export async function refreshStats(addr: `0x${string}`) {
	statsLoading.set(true);
	try {
		const [usdcBal, paymasterStats] = await Promise.all([
			publicClient.readContract({
				address: CONTRACTS.USDC,
				abi: ERC20_ABI,
				functionName: 'balanceOf',
				args: [addr]
			}),
			publicClient.readContract({
				address: CONTRACTS.PAYMASTER,
				abi: PAYMASTER_ABI,
				functionName: 'getStats',
				args: [addr]
			})
		]);

		const [agentBalance, totalSpent, queryCount] = paymasterStats as [bigint, bigint, bigint];

		stats.set({
			usdcBalance: usdcBal as bigint,
			agentBalance,
			totalSpent,
			queryCount
		});
	} catch (e) {
		console.error('refreshStats:', e);
	} finally {
		statsLoading.set(false);
	}
}

export async function deposit(amount: bigint) {
	const addr = getAccount();
	const wc   = getWalletClient();

	const approveTx = await wc.writeContract({
		address: CONTRACTS.USDC,
		abi: ERC20_ABI,
		functionName: 'approve',
		args: [CONTRACTS.PAYMASTER, amount],
		account: addr
	});
	await publicClient.waitForTransactionReceipt({ hash: approveTx });

	const depositTx = await wc.writeContract({
		address: CONTRACTS.PAYMASTER,
		abi: PAYMASTER_ABI,
		functionName: 'deposit',
		args: [amount],
		account: addr
	});
	await publicClient.waitForTransactionReceipt({ hash: depositTx });
	await refreshStats(addr);
	return depositTx;
}

export async function withdraw(amount: bigint) {
	const addr = getAccount();
	const wc   = getWalletClient();
	const tx   = await wc.writeContract({
		address: CONTRACTS.PAYMASTER,
		abi: PAYMASTER_ABI,
		functionName: 'withdraw',
		args: [amount],
		account: addr
	});
	await publicClient.waitForTransactionReceipt({ hash: tx });
	await refreshStats(addr);
	return tx;
}

function getAccount(): `0x${string}` {
	let addr: `0x${string}` | null = null;
	account.subscribe((v) => { addr = v; })();
	if (!addr) throw new Error('Not connected');
	return addr;
}

// ── Derived ───────────────────────────────────────────────────────────────────

export const isConnected = derived(account, ($a) => $a !== null);
