<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { messages, thinking, totalCost, addMessage } from '$lib/stores/chat';
	import { account, stats, refreshStats } from '$lib/stores/wallet';
	import { formatUsdc } from '$lib/chain/arc';

	let input          = $state('');
	let container: HTMLDivElement;
	let selectedModel  = $state('claude-sonnet-4-6');

	const MODELS = [
		{ id: 'claude-haiku-4-5',  label: 'Haiku',  cost: '0.001' },
		{ id: 'claude-sonnet-4-6', label: 'Sonnet', cost: '0.005' },
		{ id: 'claude-opus-4-7',   label: 'Opus',   cost: '0.025' }
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
			content: 'Connected to Arc testnet. Each query is settled in USDC onchain. Deposit funds above to start.'
		});
	});
</script>

<div class="chat-layout">
	<div class="cost-bar">
		<span>Session cost: <strong>{formatUsdc($totalCost)} USDC</strong></span>
		<span class="model-selector">
			{#each MODELS as m}
				<button
					class="model-btn"
					class:active={selectedModel === m.id}
					onclick={() => (selectedModel = m.id)}
				>
					{m.label} <span class="cost-tag">${m.cost}</span>
				</button>
			{/each}
		</span>
	</div>

	<div class="messages" bind:this={container}>
		{#each $messages as msg (msg.id)}
			<div class="msg {msg.role}">
				{#if msg.role === 'user'}
					<div class="bubble user-bubble">{msg.content}</div>
				{:else if msg.role === 'assistant'}
					<div class="bubble assistant-bubble">
						<div class="msg-content">{msg.content}</div>
						{#if msg.cost}
							<div class="msg-meta">
								<span class="cost-chip">−{formatUsdc(BigInt(msg.cost))} USDC</span>
								{#if msg.txHash}
									<a class="tx-link" href={`https://explorer.testnet.arc.fun/tx/${msg.txHash}`} target="_blank" rel="noopener">tx ↗</a>
								{/if}
								<span class="model-tag">{msg.modelId}</span>
							</div>
						{/if}
					</div>
				{:else}
					<div class="system-msg">{msg.content}</div>
				{/if}
			</div>
		{/each}

		{#if $thinking}
			<div class="msg assistant">
				<div class="bubble assistant-bubble thinking">
					<span class="dot"></span><span class="dot"></span><span class="dot"></span>
				</div>
			</div>
		{/if}
	</div>

	<div class="input-bar">
		{#if !$account}
			<p class="hint">Connect your wallet to start querying</p>
		{:else if !$stats || $stats.agentBalance === 0n}
			<p class="hint">Deposit USDC above to activate the agent</p>
		{:else}
			<textarea
				placeholder="Ask InferPay anything… each response is settled in USDC on Arc"
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
	.chat-layout { display: flex; flex-direction: column; height: 100%; background: #07070d; }

	.cost-bar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0.5rem 1.25rem;
		background: #0d0d1a; border-bottom: 1px solid #1a1a2e;
		font-size: 0.8rem; color: #666;
	}
	.cost-bar strong { color: #7bffb0; }
	.model-selector { display: flex; gap: 0.4rem; }
	.model-btn {
		background: #111; border: 1px solid #2a2a4a; border-radius: 4px;
		color: #888; font-size: 0.72rem; padding: 0.15rem 0.5rem; cursor: pointer;
	}
	.model-btn.active { background: #1e1e4a; border-color: #5c5cff; color: #e2e2ff; }
	.cost-tag { color: #555; margin-left: 0.25rem; }

	.messages {
		flex: 1; overflow-y: auto; padding: 1.25rem;
		display: flex; flex-direction: column; gap: 1rem;
	}
	.msg { display: flex; }
	.msg.user { justify-content: flex-end; }
	.msg.assistant, .msg.system { justify-content: flex-start; }

	.bubble {
		max-width: 72%; border-radius: 12px; padding: 0.75rem 1rem;
		font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap;
	}
	.user-bubble { background: #1e1e4a; color: #e2e2ff; border-bottom-right-radius: 2px; }
	.assistant-bubble {
		background: #111827; color: #d1d5db;
		border-bottom-left-radius: 2px; border: 1px solid #1f2937;
	}
	.msg-content { white-space: pre-wrap; }
	.msg-meta {
		display: flex; align-items: center; gap: 0.5rem;
		margin-top: 0.5rem; padding-top: 0.5rem;
		border-top: 1px solid #1f2937; font-size: 0.7rem;
	}
	.cost-chip { background: #0f2a1a; color: #7bffb0; padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; }
	.tx-link { color: #5c5cff; text-decoration: none; }
	.tx-link:hover { text-decoration: underline; }
	.model-tag { color: #444; margin-left: auto; }
	.system-msg { font-size: 0.75rem; color: #555; font-style: italic; padding: 0.25rem 0; }

	.thinking { display: flex; gap: 0.3rem; align-items: center; padding: 0.75rem 1rem; }
	.dot { width: 7px; height: 7px; background: #5c5cff; border-radius: 50%; animation: bounce 1.2s infinite; }
	.dot:nth-child(2) { animation-delay: 0.2s; }
	.dot:nth-child(3) { animation-delay: 0.4s; }
	@keyframes bounce {
		0%, 60%, 100% { transform: translateY(0); }
		30% { transform: translateY(-6px); }
	}

	.input-bar {
		display: flex; align-items: flex-end; gap: 0.75rem;
		padding: 1rem 1.25rem; border-top: 1px solid #1a1a2e; background: #0a0a12;
	}
	.input-bar textarea {
		flex: 1; background: #111; border: 1px solid #2a2a4a; border-radius: 8px;
		padding: 0.6rem 0.85rem; color: #e2e2ff; font-size: 0.9rem;
		font-family: inherit; resize: none; outline: none;
	}
	.input-bar textarea:focus { border-color: #5c5cff; }
	.send-btn {
		width: 40px; height: 40px; background: #5c5cff; color: white;
		border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; flex-shrink: 0;
	}
	.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.hint { color: #555; font-size: 0.85rem; flex: 1; text-align: center; padding: 0.5rem; }
</style>
