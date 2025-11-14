<svelte:options runes />

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		disabled?: boolean;
		type: 'button' | 'submit' | 'reset';
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		svgContent?: string;
		class?: ClassValue;
	}

	let {
		disabled = false,
		type = 'button',
		onclick,
		children,
		svgContent,
		class: className,
	}: Props = $props();
</script>

<button
	{disabled}
	{type}
	{onclick}
	class={[
		'disabled:text-gris-600 disabled:bg-gris-300 bg-magenta-700 hover:bg-magenta-600 text-md pointer-events-auto relative inline-flex h-14 items-center justify-center rounded-sm px-10 font-bold transition-all duration-300 hover:cursor-pointer active:scale-90 disabled:pointer-events-none starting:scale-90',
		className,
	]}
>
	{#if svgContent}
		<span class="absolute left-3 inline-flex h-full items-center">
			{@html svgContent}
		</span>
	{/if}

	{@render children?.()}
</button>
