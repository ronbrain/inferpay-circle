<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { messages, thinking, totalCost, addMessage } from '$lib/stores/chat';
	import { account, stats, refreshStats } from '$lib/stores/wallet';
	import { formatUsdc } from '$lib/chain/arc';

	let input          = $state('');
	let container: HTMLDivElement;
	let selectedModel  = $state('claude-sonnet-4-6');

	const MODELS = [
		{ id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  cost: '0.0010' },
		{ id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', cost: '0.0050' },
		{ id: 'claude-opus-4-7',   label: 'Opus 4.7',   cost: '0.0250' }
	];

	async function send() {
		if (!input.trim() || $thinking || !$account) return;

		const userText = input.trim();
		input = '';

		addMessage({ role: 'user', content: userText });
		thinking.set(true);
		await scrollBottom();

		const history = $messages
			.filter((m) => m.role !== 'system')
			.map((m) => ({ role: m.role, content: m.content }));

		try {
			const res = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: history, userAddress: $account, modelId: selectedModel })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				addMessage({ role: 'system', content: `Error: ${err.message ?? res.statusText}` });
				return;
			}

			const data = await res.json();
			addMessage({
				role: 'assistant',
				content: data.content,
				cost: data.cost,
				txHash: data.txHash,
				modelId: data.modelId
			});

			totalCost.update((v) => v + BigInt(data.cost ?? 0));
			if ($account) await refreshStats($account);
		} catch (e: any) {
			addMessage({ role: 'system', content: `Network error: ${e.message}` });
		} finally {
			thinking.set(false);
			await scrollBottom();
		}
	}

	async function scrollBottom() {
		await tick();
		container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
	}

	onMount(() => {
		addMessage({
			role: 'system',
			content: 'Arc testnet ready. Each query deducts USDC from your AgentPaymaster balance onchain.'
		});
	});
</script>

<div class="chat-layout">
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="model-group">
			{#each MODELS as m}
				<button
					class="model-btn"
					class:active={selectedModel === m.id}
					onclick={() => (selectedModel = m.id)}
				>
					{m.label}
					<span class="cost-tag">{m.cost} USDC</span>
				</button>
			{/each}
		</div>
		<div class="session-cost">
			<span class="k">Session</span>
			<span class="v">{formatUsdc($totalCost)} USDC</span>
		</div>
	</div>

	<!-- Messages -->
	<div class="messages" bind:this={container}>
		{#each $messages as msg (msg.id)}
			{#if msg.role === 'user'}
				<div class="row user">
					<div class="label">YOU</div>
					<div class="bubble user-bubble">{msg.content}</div>
				</div>
			{:else if msg.role === 'assistant'}
				<div class="row agent">
					<div class="label flow">AGENT</div>
					<div class="bubble agent-bubble">
						<div class="content">{msg.content}</div>
						{#if msg.cost}
							<div class="msg-footer">
								<span class="deducted">−{formatUsdc(BigInt(msg.cost))} USDC</span>
								{#if msg.txHash}
									<a
										class="tx-link"
										href={`https://explorer.testnet.arc.network/tx/${msg.txHash}`}
										target="_blank"
										rel="noopener"
									>{msg.txHash.slice(0, 10)}… ↗</a>
								{/if}
								<span class="model-tag">{msg.modelId}</span>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="sys-msg">▸ {msg.content}</div>
			{/if}
		{/each}

		{#if $thinking}
			<div class="row agent">
				<div class="label flow">AGENT</div>
				<div class="bubble agent-bubble thinking">
					<span class="dot"></span><span class="dot"></span><span class="dot"></span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Input -->
	<div class="input-bar">
		{#if !$account}
			<div class="hint">Connect your wallet to start</div>
		{:else if !$stats || $stats.agentBalance === 0n}
			<div class="hint">Deposit USDC to activate the agent →</div>
		{:else}
			<textarea
				placeholder="Ask anything — each response is settled in USDC on Arc…"
				bind:value={input}
				onkeydown={handleKey}
				rows={2}
			></textarea>
			<button class="send-btn" onclick={send} disabled={$thinking || !input.trim()}>
				{$thinking ? '…' : '↑'}
			</button>
		{/if}
	</div>
</div>

<style>
	.chat-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg);
		border-right: 1px solid var(--line);
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		height: 40px;
		border-bottom: 1px solid var(--line);
		background: var(--bg-1);
		flex-shrink: 0;
		gap: 16px;
	}
	.model-group { display: flex; gap: 2px; }
	.model-btn {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.02em;
		padding: 4px 10px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--r);
		color: var(--fg-3);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}
	.model-btn:hover { color: var(--fg-1); background: var(--bg-2); }
	.model-btn.active {
		color: var(--flow);
		background: var(--flow-bg);
		border-color: var(--flow-dim);
	}
	.cost-tag { font-size: 10px; color: var(--fg-4); }
	.model-btn.active .cost-tag { color: var(--flow-dim); }

	.session-cost { display: flex; align-items: center; gap: 8px; }
	.session-cost .k { font-size: 9px; color: var(--fg-4); letter-spacing: 0.12em; text-transform: uppercase; }
	.session-cost .v { font-size: 12px; color: var(--value); font-weight: 600; }

	/* Messages */
	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		scrollbar-width: thin;
		scrollbar-color: var(--line) transparent;
	}

	.row { display: grid; grid-template-columns: 44px 1fr; gap: 10px; align-items: start; }
	.row.user { direction: rtl; }
	.row.user > * { direction: ltr; }

	.label {
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fg-3);
		padding-top: 3px;
		text-align: right;
	}
	.row.user .label { text-align: left; }
	.label.flow { color: var(--flow); }

	.bubble {
		padding: 10px 14px;
		border-radius: var(--r);
		font-size: 13px;
		line-height: 1.6;
		border: 1px solid var(--line);
		max-width: 100%;
	}
	.user-bubble {
		background: var(--flow-bg);
		border-color: var(--flow-dim);
		color: var(--fg);
		white-space: pre-wrap;
	}
	.agent-bubble {
		background: var(--bg-1);
		color: var(--fg-1);
	}
	.content { white-space: pre-wrap; }

	.msg-footer {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px dashed var(--line-soft);
		font-size: 10px;
	}
	.deducted {
		color: var(--value);
		font-weight: 600;
		background: var(--value-bg);
		padding: 2px 8px;
		border-radius: var(--r);
	}
	.tx-link { color: var(--event); text-decoration: none; font-size: 10px; }
	.tx-link:hover { text-decoration: underline; }
	.model-tag { margin-left: auto; color: var(--fg-4); font-size: 10px; }

	.sys-msg {
		font-size: 11px;
		color: var(--fg-4);
		padding: 4px 0;
		letter-spacing: 0.04em;
	}

	.thinking { display: flex; gap: 5px; align-items: center; min-height: 36px; }
	.dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: var(--flow);
		animation: bounce 1.2s ease-in-out infinite;
	}
	.dot:nth-child(2) { animation-delay: 0.15s; }
	.dot:nth-child(3) { animation-delay: 0.30s; }
	@keyframes bounce {
		0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
		30% { transform: translateY(-5px); opacity: 1; }
	}

	/* Input */
	.input-bar {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--line);
		background: var(--bg-1);
		flex-shrink: 0;
	}
	.input-bar textarea {
		flex: 1;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--r);
		padding: 8px 12px;
		color: var(--fg);
		font-family: var(--mono);
		font-size: 13px;
		resize: none;
		outline: none;
		line-height: 1.5;
		transition: border-color 0.15s;
	}
	.input-bar textarea:focus { border-color: var(--flow-dim); }
	.input-bar textarea::placeholder { color: var(--fg-4); }
	.send-btn {
		width: 38px; height: 38px;
		background: var(--flow);
		color: oklch(0.18 0.008 250);
		border: none;
		border-radius: var(--r);
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.12s;
	}
	.send-btn:hover { background: oklch(0.84 0.14 220); }
	.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

	.hint {
		flex: 1;
		text-align: center;
		font-size: 11px;
		color: var(--fg-3);
		padding: 8px;
		letter-spacing: 0.04em;
	}
</style>
