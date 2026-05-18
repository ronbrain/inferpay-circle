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
		<span class="brand-mark">InferPay<span class="slash">/</span>Arc</span>
		<span class="brand-tag">Testnet · Chain 5042002</span>
	</div>

	{#if $account}
		<div class="chain-strip">
			<div class="chain-cell">
				<span class="k">Wallet USDC</span>
				<span class="v value">{$stats ? formatUsdc($stats.usdcBalance) : '—'}</span>
			</div>
			<div class="chain-cell">
				<span class="k">Agent Balance</span>
				<span class="v flow">{$stats ? formatUsdc($stats.agentBalance) : '—'}</span>
			</div>
			<div class="chain-cell">
				<span class="k">Queries</span>
				<span class="v">{$stats?.queryCount?.toString() ?? '—'}</span>
			</div>
			<div class="chain-cell">
				<span class="k">Spent</span>
				<span class="v event">{$stats ? formatUsdc($stats.totalSpent) : '—'}</span>
			</div>
		</div>

		<div class="controls">
			<span class="addr">{shortAddr}</span>
			<button class="btn primary" onclick={() => (showModal = true)}>+ Deposit</button>
		</div>
	{:else}
		<div class="chain-strip placeholder">
			<div class="chain-cell"><span class="k">Wallet USDC</span><span class="v fg3">—</span></div>
			<div class="chain-cell"><span class="k">Agent Balance</span><span class="v fg3">—</span></div>
			<div class="chain-cell"><span class="k">Queries</span><span class="v fg3">—</span></div>
		</div>
		<div class="controls">
			<button class="btn primary" onclick={connectWallet} disabled={$connecting}>
				{$connecting ? 'Connecting…' : 'Connect Wallet'}
			</button>
		</div>
	{/if}
</header>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => (showModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-head">
				<span class="modal-title">Deposit USDC</span>
				<button class="close-btn" onclick={() => (showModal = false)}>✕</button>
			</div>
			<p class="modal-sub">
				Step 1 — Transfer USDC to the AgentPaymaster<br/>
				Step 2 — Contract credits your balance onchain
			</p>
			<div class="input-row">
				<input
					type="number"
					placeholder="0.000000"
					min="0.001"
					step="0.001"
					bind:value={depositAmount}
				/>
				<span class="unit">USDC</span>
			</div>
			<div class="modal-actions">
				<button class="btn ghost" onclick={() => (showModal = false)}>Cancel</button>
				<button class="btn primary" onclick={handleDeposit} disabled={depositing}>
					{depositing ? 'Confirming…' : 'Deposit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.wallet-bar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 24px;
		padding: 0 20px;
		height: 52px;
		border-bottom: 1px solid var(--line);
		background: linear-gradient(180deg, oklch(0.17 0.008 250) 0%, var(--bg) 100%);
		position: sticky;
		top: 0;
		z-index: 10;
		flex-shrink: 0;
	}

	.brand { display: flex; align-items: center; gap: 12px; }
	.brand-mark {
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--fg);
	}
	.brand-mark .slash { color: var(--flow); margin: 0 1px; }
	.brand-tag {
		font-size: 10px;
		color: var(--fg-3);
		letter-spacing: 0.10em;
		text-transform: uppercase;
		padding-left: 12px;
		border-left: 1px solid var(--line);
	}

	.chain-strip {
		display: flex;
		border: 1px solid var(--line);
		border-radius: var(--r);
		background: var(--bg-1);
		overflow: hidden;
		justify-self: center;
	}
	.chain-strip.placeholder { opacity: 0.4; }
	.chain-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 14px;
		border-right: 1px solid var(--line);
		min-width: 90px;
	}
	.chain-cell:last-child { border-right: none; }
	.chain-cell .k {
		font-size: 9px;
		color: var(--fg-3);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.chain-cell .v { font-size: 13px; font-weight: 600; color: var(--fg); }
	.chain-cell .v.flow  { color: var(--flow); }
	.chain-cell .v.value { color: var(--value); }
	.chain-cell .v.event { color: var(--event); }
	.chain-cell .v.fg3   { color: var(--fg-3); }

	.controls { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
	.addr { font-size: 11px; color: var(--fg-3); letter-spacing: 0.04em; }

	.btn {
		font-family: var(--mono);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.04em;
		padding: 6px 14px;
		background: var(--bg-1);
		color: var(--fg-1);
		border: 1px solid var(--line);
		border-radius: var(--r);
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s, color 0.12s;
	}
	.btn:hover { background: var(--bg-2); border-color: var(--fg-3); color: var(--fg); }
	.btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn.primary {
		background: var(--flow);
		color: oklch(0.18 0.008 250);
		border-color: var(--flow);
		font-weight: 700;
	}
	.btn.primary:hover { background: oklch(0.84 0.14 220); }
	.btn.ghost { background: transparent; }

	/* Modal */
	.overlay {
		position: fixed; inset: 0;
		background: oklch(0 0 0 / 0.6);
		display: flex; align-items: center; justify-content: center;
		z-index: 100;
		backdrop-filter: blur(4px);
	}
	.modal {
		background: var(--bg-1);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 20px;
		width: 340px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		box-shadow: 0 24px 48px -8px oklch(0 0 0 / 0.6);
	}
	.modal-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.modal-title { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: var(--fg); }
	.close-btn {
		background: none; border: none; color: var(--fg-3);
		font-size: 12px; cursor: pointer; padding: 2px 4px;
	}
	.close-btn:hover { color: var(--fg); }
	.modal-sub { font-size: 11px; color: var(--fg-3); line-height: 1.6; }
	.input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 8px 12px;
	}
	.input-row input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: var(--fg);
		font-family: var(--mono);
		font-size: 14px;
		font-weight: 500;
	}
	.unit { font-size: 11px; color: var(--fg-3); letter-spacing: 0.08em; }
	.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
