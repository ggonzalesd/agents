<svelte:options runes />

<script lang="ts">
	interface Props {
		value: number;
		max: number;
		colorClass?: string;
		height?: string;
		showLabel?: boolean;
	}

	let {
		value,
		max,
		colorClass = 'bg-magenta-500',
		height = 'h-3',
		showLabel = true,
	}: Props = $props();

	const percentage = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
</script>

<div class="flex w-full items-center gap-2">
	<div class="bg-gris-700 relative h-3 w-full overflow-hidden rounded-full {height}">
		<div
			class="{colorClass} h-full rounded-full transition-all duration-500"
			style="width: {percentage}%"
		></div>
	</div>
	{#if showLabel}
		<span class="text-gris-300 min-w-[3rem] text-right text-xs">
			{value}/{max}
		</span>
	{/if}
</div>