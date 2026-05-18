<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>InferPay — AI Payments on Arc</title>
	<meta name="description" content="Pay-per-inference AI agent powered by Circle USDC on Arc blockchain" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	:global(:root) {
		--bg:        oklch(0.155 0.008 250);
		--bg-1:      oklch(0.185 0.008 250);
		--bg-2:      oklch(0.215 0.008 250);
		--bg-3:      oklch(0.245 0.008 250);
		--line:      oklch(0.30  0.010 250);
		--line-soft: oklch(0.24  0.010 250 / 0.7);

		--fg:   oklch(0.96 0.005 250);
		--fg-1: oklch(0.82 0.008 250);
		--fg-2: oklch(0.62 0.010 250);
		--fg-3: oklch(0.45 0.010 250);
		--fg-4: oklch(0.30 0.010 250);

		--flow:      oklch(0.78 0.14 220);
		--flow-dim:  oklch(0.58 0.12 220);
		--flow-bg:   oklch(0.78 0.14 220 / 0.10);

		--value:     oklch(0.80 0.15 150);
		--value-dim: oklch(0.60 0.13 150);
		--value-bg:  oklch(0.80 0.15 150 / 0.10);

		--event:     oklch(0.82 0.13 75);
		--event-dim: oklch(0.62 0.11 75);
		--event-bg:  oklch(0.82 0.13 75 / 0.10);

		--warn:      oklch(0.72 0.18 28);

		--mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
		--r: 3px;
	}

	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	:global(body) {
		background: var(--bg);
		color: var(--fg);
		font-family: var(--mono);
		font-weight: 400;
		font-size: 13px;
		-webkit-font-smoothing: antialiased;
		font-feature-settings: 'tnum', 'cv11';
		font-variant-numeric: tabular-nums;
		height: 100dvh;
		overflow: hidden;
		background-image:
			radial-gradient(1px 1px at 25% 30%, oklch(0.40 0.008 250 / 0.35) 1px, transparent 1.5px),
			radial-gradient(1px 1px at 75% 70%, oklch(0.40 0.008 250 / 0.30) 1px, transparent 1.5px);
		background-size: 64px 64px, 96px 96px;
		background-position: 0 0, 32px 48px;
	}

	.app { height: 100dvh; display: flex; flex-direction: column; }
</style>
