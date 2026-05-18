<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>InferPay — AI Payments on Arc</title>
	<meta name="description" content="Pay-per-inference AI agent powered by Circle USDC on Arc blockchain" />
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
	:global(body) {
		background: #07070d;
		color: #e2e2ff;
		font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
		height: 100dvh;
		overflow: hidden;
	}
	.app { height: 100dvh; display: flex; flex-direction: column; }
</style>
