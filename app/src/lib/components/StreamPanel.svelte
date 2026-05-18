<script lang="ts">
	import { createPublicClient, createWalletClient, custom, http } from 'viem';
	import { arcTestnet, CONTRACTS, formatUsdc, parseUsdc } from '$lib/chain/arc';
	import { STREAM_ABI, ERC20_ABI } from '$lib/chain/abis';
	import { account } from '$lib/stores/wallet';
	import { onDestroy } from 'svelte';

	let recipient   = $state('');
	let durationMin = $state('60');
	let totalAmount = $state('1.00');
	let creating    = $state(false);
	let streamId    = $state<bigint | null>(null);
	let streamInfo  = $state<readonly [string, string, bigint, bigint, bigint, bigint, bigint, boolean] | null>(null);
	let claimable   = $state(0n);
	let ticker: ReturnType<typeof setInterval>;

	const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

	function getWC() {
		return createWalletClient({ chain: arcTestnet, transport: custom((window as any).ethereum) });
	}

	async function createStream() {
		if (!$account || !recipient || creating) return;
		creating = true;
		try {
			const wc       = getWC();
			const duration = BigInt(parseInt(durationMin) * 60);
			const amount   = parseUsdc(parseFloat(totalAmount));

			const approveTx = await wc.writeContract({
				address: CONTRACTS.USDC, abi: ERC20_ABI,
				functionName: 'approve', args: [CONTRACTS.STREAM, amount],
				account: $account!
			});
			await publicClient.waitForTransactionReceipt({ hash: approveTx });

			const tx = await wc.writeContract({
				address: CONTRACTS.STREAM, abi: STREAM_ABI,
				functionName: 'createStream',
				args: [recipient as `0x${string}`, duration, amount],
				account: $account!
			});
			await publicClient.waitForTransactionReceipt({ hash: tx });

			// Read stream 0 for demo (production: parse StreamCreated log)
			const info = await publicClient.readContract({
				address: CONTRACTS.STREAM, abi: STREAM_ABI,
				functionName: 'streams', args: [0n]
			});
			streamId   = 0n;
			streamInfo = info as typeof streamInfo;
			ticker     = setInterval(pollClaimable, 2000);
		} catch (e: any) {
			alert(e.message ?? 'Stream creation failed');
		} finally {
			creating = false;
		}
	}

	async function pollClaimable() {
		if (streamId === null) return;
		try {
			claimable = await publicClient.readContract({
				address: CONTRACTS.STREAM, abi: STREAM_ABI,
				functionName: 'claimable', args: [streamId]
			}) as bigint;
		} catch {}
	}

	async function cancelStream() {
		if (streamId === null || !$account) return;
		const wc = getWC();
		const tx = await wc.writeContract({
			address: CONTRACTS.STREAM, abi: STREAM_ABI,
			functionName: 'cancel', args: [streamId],
			account: $account!
		});
		await publicClient.waitForTransactionReceipt({ hash: tx });
		clearInterval(ticker);
		streamId   = null;
		streamInfo = null;
		claimable  = 0n;
	}

	onDestroy(() => clearInterval(ticker));

	const ratePerSec = $derived(
		streamInfo ? formatUsdc(streamInfo[2]) + ' USDC/s' : null
	);

	const ratePreview = $derived(
		durationMin && totalAmount
			? (parseFloat(totalAmount) / (parseFloat(durationMin) * 60)).toFixed(8) + ' USDC/s'
			: null
	);
</script>

<div class="stream-panel">
	<h3>Streaming Payment <span class="tag">InferenceStream.sol</span></h3>
	<p class="sub">Pay-per-second for continuous API/agent access. Arc finality makes sub-second settlement safe.</p>

	{#if !streamId}
		<div class="form">
			<label>
				<span>Recipient address</span>
				<input placeholder="0x…" bind:value={recipient} />
			</label>
			<div class="row">
				<label>
					<span>Duration (minutes)</span>
					<input type="number" min="1" bind:value={durationMin} />
				</label>
				<label>
					<span>Total USDC</span>
					<input type="number" min="0.01" step="0.01" bind:value={totalAmount} />
				</label>
			</div>
			{#if ratePreview}
				<p class="rate-preview">Rate: {ratePreview}</p>
			{/if}
			<button class="btn-primary" onclick={createStream} disabled={creating || !$account}>
				{creating ? 'Creating…' : 'Create Stream'}
			</button>
		</div>
	{:else}
		<div class="stream-live">
			<div class="live-badge">● LIVE</div>
			<div class="stream-stats">
				<div class="stat">
					<span class="stat-label">Rate</span>
					<span class="stat-val">{ratePerSec}</span>
				</div>
				<div class="stat">
					<span class="stat-label">Claimable</span>
					<span class="stat-val green">{formatUsdc(claimable)} USDC</span>
				</div>
				<div class="stat">
					<span class="stat-label">Deposit</span>
					<span class="stat-val">{streamInfo ? formatUsdc(streamInfo[3]) : '—'} USDC</span>
				</div>
			</div>
			{#if streamInfo}
				{@const elapsed = Date.now() / 1000 - Number(streamInfo[4])}
				{@const total   = Number(streamInfo[5]) - Number(streamInfo[4])}
				{@const pct     = Math.min(100, (elapsed / total) * 100).toFixed(1)}
				<div class="progress-bar">
					<div class="progress-fill" style="width: {pct}%"></div>
				</div>
			{/if}
			<button class="btn-cancel" onclick={cancelStream}>Cancel & Refund</button>
		</div>
	{/if}
</div>

<style>
	.stream-panel {
		background: #0d0d1a; border: 1px solid #1e1e3f; border-radius: 12px;
		padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
	}
	h3 { margin: 0; color: #e2e2ff; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
	.tag { font-size: 0.65rem; color: #5c5cff; font-weight: 400; font-family: monospace; }
	.sub { margin: 0; font-size: 0.78rem; color: #555; }
	.form { display: flex; flex-direction: column; gap: 0.75rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; }
	label span { font-size: 0.72rem; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
	input {
		background: #07070d; border: 1px solid #2a2a4a; border-radius: 6px;
		padding: 0.45rem 0.7rem; color: #e2e2ff; font-size: 0.85rem; font-family: monospace;
	}
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
	.rate-preview { font-size: 0.75rem; color: #7bffb0; font-family: monospace; margin: 0; }
	.btn-primary {
		background: #5c5cff; color: white; border: none; border-radius: 8px;
		padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
	}
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-cancel {
		background: transparent; color: #ff5c5c; border: 1px solid #ff5c5c;
		border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer;
		align-self: flex-start;
	}
	.stream-live { display: flex; flex-direction: column; gap: 0.75rem; }
	.live-badge { color: #7bffb0; font-size: 0.8rem; font-weight: 700; animation: pulse 1.5s infinite; }
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
	.stream-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
	.stat { display: flex; flex-direction: column; gap: 0.15rem; }
	.stat-label { font-size: 0.65rem; color: #555; text-transform: uppercase; }
	.stat-val { font-size: 0.85rem; font-family: monospace; color: #e2e2ff; }
	.stat-val.green { color: #7bffb0; }
	.progress-bar { height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden; }
	.progress-fill { height: 100%; background: #5c5cff; transition: width 2s linear; }
</style>
