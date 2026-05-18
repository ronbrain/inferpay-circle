<script lang="ts">
	import WalletBar from '$lib/components/WalletBar.svelte';
	import ChatPane from '$lib/components/ChatPane.svelte';
	import StreamPanel from '$lib/components/StreamPanel.svelte';
</script>

<WalletBar />

<div class="main">
	<div class="chat-col">
		<ChatPane />
	</div>
	<div class="side-col">
		<StreamPanel />

		<div class="info-card">
			<h4>How it works</h4>
			<ol>
				<li>Connect your MetaMask wallet (Arc Testnet)</li>
				<li>Deposit USDC into the Agent Paymaster contract</li>
				<li>Each AI query deducts USDC onchain in real-time</li>
				<li>All payments are transparent on Arc explorer</li>
			</ol>
		</div>

		<div class="contracts-card">
			<h4>Contracts <span class="network">Arc Testnet</span></h4>
			<div class="contract-row">
				<span class="contract-name">USDC</span>
				<code>0x3600…0000</code>
			</div>
			<div class="contract-row">
				<span class="contract-name">AgentPaymaster</span>
				<code>{import.meta.env.VITE_PAYMASTER_ADDRESS?.slice(0,10) ?? 'deploying…'}…</code>
			</div>
			<div class="contract-row">
				<span class="contract-name">InferenceStream</span>
				<code>{import.meta.env.VITE_STREAM_ADDRESS?.slice(0,10) ?? 'deploying…'}…</code>
			</div>
		</div>

		<a class="arch-link" href="/architecture/index.html" target="_blank" rel="noopener">
			<span class="arch-icon">⬡</span>
			System Architecture
			<span class="arch-arrow">↗</span>
		</a>
	</div>
</div>

<style>
	.main {
		display: grid;
		grid-template-columns: 1fr 320px;
		flex: 1;
		overflow: hidden;
	}
	.chat-col { overflow: hidden; display: flex; flex-direction: column; }
	.side-col {
		border-left: 1px solid #1a1a2e;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		background: #07070d;
	}

	.info-card, .contracts-card {
		background: #0d0d1a;
		border: 1px solid #1e1e3f;
		border-radius: 12px;
		padding: 1rem;
	}
	h4 {
		font-size: 0.8rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.network {
		font-size: 0.65rem;
		background: #1a1a3f;
		color: #5c5cff;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		text-transform: none;
		letter-spacing: 0;
	}
	ol {
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	li { font-size: 0.78rem; color: #666; line-height: 1.4; }

	.contract-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.3rem 0;
		border-bottom: 1px solid #111;
	}
	.contract-row:last-child { border-bottom: none; }
	.contract-name { font-size: 0.75rem; color: #666; }
	code { font-size: 0.72rem; color: #5c5cff; font-family: monospace; }

	.arch-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		background: #0d0d1a;
		border: 1px solid #2a2a5a;
		border-radius: 8px;
		color: #7b7bff;
		font-size: 0.8rem;
		font-weight: 600;
		text-decoration: none;
		letter-spacing: 0.03em;
		transition: background 0.15s, border-color 0.15s;
	}
	.arch-link:hover { background: #111130; border-color: #5c5cff; }
	.arch-icon { font-size: 0.9rem; }
	.arch-arrow { margin-left: auto; opacity: 0.6; }
</style>
