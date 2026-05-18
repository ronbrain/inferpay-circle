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

<div class="panel">
	<div class="panel-head">
		<span class="panel-title">Streaming Payments</span>
		<span class="panel-contract">InferenceStream.sol</span>
	</div>
	<p class="panel-sub">Linear USDC drain per second. Either party can cancel and recover unstreamed funds.</p>

	{#if !streamId}
		<div class="form">
			<div class="field">
				<label class="field-label">Recipient</label>
				<input class="field-input" placeholder="0x…" bind:value={recipient} />
			</div>
			<div class="field-row">
				<div class="field">
					<label class="field-label">Duration (min)</label>
					<input class="field-input" type="number" min="1" bind:value={durationMin} />
				</div>
				<div class="field">
					<label class="field-label">Total USDC</label>
					<input class="field-input" type="number" min="0.01" step="0.01" bind:value={totalAmount} />
				</div>
			</div>
			{#if ratePreview}
				<div class="rate-preview">
					<span class="k">Rate</span>
					<span class="v">{ratePreview}</span>
				</div>
			{/if}
			<button class="btn primary" onclick={createStream} disabled={creating || !$account}>
				{creating ? 'Creating…' : 'Create Stream'}
			</button>
		</div>
	{:else}
		<div class="live">
			<div class="live-badge">
				<span class="dot-live"></span> LIVE
			</div>
			<div class="stats-grid">
				<div class="stat">
					<span class="stat-k">Rate</span>
					<span class="stat-v flow">{ratePerSec}</span>
				</div>
				<div class="stat">
					<span class="stat-k">Claimable</span>
					<span class="stat-v value">{formatUsdc(claimable)} USDC</span>
				</div>
				<div class="stat">
					<span class="stat-k">Deposited</span>
					<span class="stat-v">{streamInfo ? formatUsdc(streamInfo[3]) : '—'} USDC</span>
				</div>
			</div>
			{#if streamInfo}
				{@const elapsed = Date.now() / 1000 - Number(streamInfo[4])}
				{@const total   = Number(streamInfo[5]) - Number(streamInfo[4])}
				{@const pct     = Math.min(100, (elapsed / total) * 100).toFixed(1)}
				<div class="progress">
					<div class="progress-fill" style="width: {pct}%"></div>
				</div>
				<div class="progress-labels">
					<span>{pct}% elapsed</span>
					<span>{(100 - parseFloat(pct)).toFixed(1)}% remaining</span>
				</div>
			{/if}
			<button class="btn warn" onclick={cancelStream}>Cancel &amp; Refund</button>
		</div>
	{/if}
</div>

<style>
	.panel {
		background: var(--bg-1);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.panel-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-1); }
	.panel-contract { font-size: 9px; color: var(--flow); letter-spacing: 0.06em; }
	.panel-sub { font-size: 10.5px; color: var(--fg-3); line-height: 1.5; }

	.form { display: flex; flex-direction: column; gap: 10px; }
	.field { display: flex; flex-direction: column; gap: 4px; }
	.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
	.field-label { font-size: 9px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.12em; }
	.field-input {
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 6px 10px;
		color: var(--fg);
		font-family: var(--mono);
		font-size: 12px;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
	}
	.field-input:focus { border-color: var(--flow-dim); }
	.field-input::placeholder { color: var(--fg-4); }

	.rate-preview {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
	}
	.rate-preview .k { color: var(--fg-3); }
	.rate-preview .v { color: var(--value); font-weight: 600; }

	.btn {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		padding: 7px 14px;
		border-radius: var(--r);
		cursor: pointer;
		border: 1px solid var(--line);
		background: var(--bg-2);
		color: var(--fg-1);
		transition: background 0.12s, border-color 0.12s;
	}
	.btn.primary {
		background: var(--flow);
		color: oklch(0.18 0.008 250);
		border-color: var(--flow);
		font-weight: 700;
	}
	.btn.primary:hover { background: oklch(0.84 0.14 220); }
	.btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn.warn {
		background: transparent;
		border-color: var(--warn);
		color: var(--warn);
		align-self: flex-start;
	}
	.btn.warn:hover { background: oklch(0.72 0.18 28 / 0.1); }

	/* Live stream */
	.live { display: flex; flex-direction: column; gap: 10px; }
	.live-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		font-weight: 700;
		color: var(--value);
		letter-spacing: 0.14em;
	}
	.dot-live {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: var(--value);
		box-shadow: 0 0 8px var(--value);
		animation: pulse 1.2s ease-in-out infinite;
	}
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

	.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.stat { display: flex; flex-direction: column; gap: 3px; }
	.stat-k { font-size: 9px; color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.12em; }
	.stat-v { font-size: 12px; font-weight: 600; color: var(--fg); }
	.stat-v.flow  { color: var(--flow); }
	.stat-v.value { color: var(--value); }

	.progress {
		height: 3px;
		background: var(--bg-3);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress-fill { height: 100%; background: var(--flow); transition: width 2s linear; }
	.progress-labels {
		display: flex;
		justify-content: space-between;
		font-size: 9px;
		color: var(--fg-3);
	}
</style>
