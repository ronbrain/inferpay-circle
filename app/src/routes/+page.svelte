<script lang="ts">
	import WalletBar from '$lib/components/WalletBar.svelte';
	import ChatPane from '$lib/components/ChatPane.svelte';
	import StreamPanel from '$lib/components/StreamPanel.svelte';

	const CONTRACTS = [
		{ name: 'USDC',            addr: '0x3600000000000000000000000000000000000000' },
		{ name: 'AgentPaymaster',  addr: import.meta.env.VITE_PAYMASTER_ADDRESS ?? '0xD4388…62d7' },
		{ name: 'InferenceStream', addr: import.meta.env.VITE_STREAM_ADDRESS    ?? '0x4548…6fb' },
		{ name: 'ModelRegistry',   addr: import.meta.env.VITE_REGISTRY_ADDRESS  ?? '0x61C1…8e' },
	];
</script>

<WalletBar />

<div class="main">
	<div class="chat-col">
		<ChatPane />
	</div>

	<aside class="side-col">
		<StreamPanel />

		<!-- How it works -->
		<div class="card">
			<div class="card-head">How it works</div>
			<ol class="steps">
				<li><span class="n">01</span> Connect MetaMask on Arc Testnet</li>
				<li><span class="n">02</span> Transfer USDC → AgentPaymaster contract</li>
				<li><span class="n">03</span> Each AI query deducts USDC atomically onchain</li>
				<li><span class="n">04</span> Withdraw any time — no lock-up</li>
			</ol>
		</div>

		<!-- Contracts -->
		<div class="card">
			<div class="card-head">
				Contracts
				<span class="network-tag">Arc Testnet · 5042002</span>
			</div>
			{#each CONTRACTS as c}
				<div class="contract-row">
					<span class="contract-name">{c.name}</span>
					<code class="contract-addr">{c.addr.slice(0, 10)}…</code>
				</div>
			{/each}
		</div>

		<!-- Architecture link -->
		<a class="arch-link" href="/architecture/index.html" target="_blank" rel="noopener">
			<span class="arch-icon">⬡</span>
			<span class="arch-text">System Architecture</span>
			<span class="arch-arrow">↗</span>
		</a>

		<!-- Footer -->
		<div class="footer">
			<span>Built for Circle Stablecoin Commerce Stack Challenge</span>
			<span class="track">Track 4 · Agentic Economy</span>
		</div>
	</aside>
</div>

<style>
	.main {
		display: grid;
		grid-template-columns: 1fr 300px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.chat-col { overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
	.side-col {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow-y: auto;
		background: var(--bg);
		border-left: 1px solid var(--line);
		scrollbar-width: thin;
		scrollbar-color: var(--line) transparent;
	}

	/* Card */
	.card {
		background: var(--bg-1);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fg-2);
	}
	.network-tag {
		font-size: 9px;
		font-weight: 400;
		color: var(--flow);
		letter-spacing: 0.06em;
		text-transform: none;
	}

	/* Steps */
	.steps {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0;
	}
	.steps li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 11px;
		color: var(--fg-2);
		line-height: 1.4;
	}
	.n {
		font-size: 9px;
		color: var(--flow);
		font-weight: 700;
		letter-spacing: 0.08em;
		padding-top: 1px;
		flex-shrink: 0;
	}

	/* Contracts */
	.contract-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 0;
		border-bottom: 1px dashed var(--line-soft);
	}
	.contract-row:last-child { border-bottom: none; }
	.contract-name { font-size: 11px; color: var(--fg-2); }
	.contract-addr { font-size: 10px; color: var(--event); }

	/* Architecture link */
	.arch-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--bg-1);
		border: 1px solid var(--line);
		border-radius: var(--r);
		color: var(--flow);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-decoration: none;
		transition: background 0.12s, border-color 0.12s;
	}
	.arch-link:hover { background: var(--flow-bg); border-color: var(--flow-dim); }
	.arch-icon { font-size: 14px; }
	.arch-text { flex: 1; }
	.arch-arrow { opacity: 0.6; }

	/* Footer */
	.footer {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 9px;
		color: var(--fg-4);
		letter-spacing: 0.06em;
		padding: 8px 0 4px;
	}
	.track { color: var(--event); }
</style>
