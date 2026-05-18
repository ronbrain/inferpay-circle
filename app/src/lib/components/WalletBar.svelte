<script lang="ts">
	import { account, stats, connecting, connectWallet, deposit, withdraw } from '$lib/stores/wallet';
	import { formatUsdc, parseUsdc } from '$lib/chain/arc';

	let depositAmount = $state('');
	let depositing    = $state(false);
	let showModal     = $state(false);

	async function handleDeposit() {
		const amt = parseFloat(depositAmount);
		if (!amt || amt <= 0) return;
		depositing = true;
		try {
			await deposit(parseUsdc(amt));
			depositAmount = '';
			showModal = false;
		} catch (e: any) {
			alert(e.message ?? 'Deposit failed');
		} finally {
			depositing = false;
		}
	}

	const shortAddr = $derived(
		$account ? `${$account.slice(0, 6)}…${$account.slice(-4)}` : null
	);
</script>

<header class="wallet-bar">
	<div class="brand">
		<span class="logo">⚡</span>
		<span class="name">InferPay</span>
		<span class="tag">Arc Testnet</span>
	</div>

	{#if $account}
		<div class="wallet-info">
			<div class="balance-group">
				<div class="balance-item">
					<span class="label">Wallet</span>
					<span class="amount">{$stats ? formatUsdc($stats.usdcBalance) : '—'} USDC</span>
				</div>
				<div class="balance-item highlight">
					<span class="label">Agent balance</span>
					<span class="amount">{$stats ? formatUsdc($stats.agentBalance) : '—'} USDC</span>
				</div>
				<div class="balance-item muted">
					<span class="label">Queries</span>
					<span class="amount">{$stats?.queryCount?.toString() ?? '—'}</span>
				</div>
			</div>
			<div class="actions">
				<button class="btn-sm primary" onclick={() => (showModal = true)}>Deposit</button>
				<span class="addr">{shortAddr}</span>
			</div>
		</div>
	{:else}
		<button class="btn-connect" onclick={connectWallet} disabled={$connecting}>
			{$connecting ? 'Connecting…' : 'Connect Wallet'}
		</button>
	{/if}
</header>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => (showModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<h3>Deposit USDC into Agent</h3>
			<p class="modal-sub">USDC is deducted per inference. Withdraw any time.</p>
			<div class="input-row">
				<input
					type="number"
					placeholder="0.00"
					min="0.001"
					step="0.001"
					bind:value={depositAmount}
				/>
				<span class="unit">USDC</span>
			</div>
			<div class="modal-actions">
				<button class="btn-sm secondary" onclick={() => (showModal = false)}>Cancel</button>
				<button class="btn-sm primary" onclick={handleDeposit} disabled={depositing}>
					{depositing ? 'Confirming…' : 'Deposit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.wallet-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: #0a0a0f;
		border-bottom: 1px solid #1e1e2e;
		gap: 1rem;
	}
	.brand { display: flex; align-items: center; gap: 0.5rem; }
	.logo { font-size: 1.2rem; }
	.name { font-weight: 700; font-size: 1.1rem; color: #e2e2ff; }
	.tag {
		font-size: 0.65rem;
		background: #1e1e3f;
		color: #7b7bff;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		border: 1px solid #3636aa;
	}
	.wallet-info { display: flex; align-items: center; gap: 1.5rem; }
	.balance-group { display: flex; gap: 1.5rem; }
	.balance-item { display: flex; flex-direction: column; align-items: flex-end; }
	.label { font-size: 0.65rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
	.amount { font-size: 0.9rem; font-weight: 600; color: #e2e2ff; font-family: monospace; }
	.balance-item.highlight .amount { color: #7bffb0; }
	.balance-item.muted .amount { color: #888; }
	.actions { display: flex; align-items: center; gap: 0.75rem; }
	.addr { font-size: 0.75rem; color: #555; font-family: monospace; }

	.btn-connect, .btn-sm {
		padding: 0.4rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
	}
	.btn-connect, .primary { background: #5c5cff; color: white; }
	.btn-connect:hover, .primary:hover { background: #4a4aff; }
	.btn-connect:disabled { opacity: 0.5; cursor: not-allowed; }
	.secondary { background: #1e1e2e; color: #aaa; border: 1px solid #333; }

	.modal-overlay {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.7);
		display: flex; align-items: center; justify-content: center;
		z-index: 100;
	}
	.modal {
		background: #111;
		border: 1px solid #2a2a4a;
		border-radius: 12px;
		padding: 1.5rem;
		min-width: 320px;
		display: flex; flex-direction: column; gap: 1rem;
	}
	.modal h3 { margin: 0; color: #e2e2ff; }
	.modal-sub { margin: 0; font-size: 0.8rem; color: #666; }
	.input-row { display: flex; align-items: center; gap: 0.5rem; }
	.input-row input {
		flex: 1;
		background: #0a0a0f;
		border: 1px solid #333;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		color: #e2e2ff;
		font-size: 1rem;
		font-family: monospace;
	}
	.unit { color: #666; font-size: 0.85rem; }
	.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
