<svelte:options runes />

<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';

	interface Props {
		id?: string;
		name?: string;
		type?: 'text' | 'password';
		placeholder?: string;

		iconSvgContent?: string;
		element?: HTMLInputElement;
		onchange?: (value: string) => void;
	}

	let {
		id = uuidv4(),
		element = $bindable(),
		iconSvgContent,
		name,
		onchange,
		type = 'text',
		placeholder,
	}: Props = $props();
</script>

<div
	data-input-text
	class="inline-flex h-8 justify-between rounded-full border border-gray-800 bg-gray-900 text-lime-300 transition-all"
>
	{#if iconSvgContent}
		<div
			data-input-text-icon
			class="flex aspect-square h-full w-auto items-center justify-center text-white"
		>
			{@html iconSvgContent}
		</div>
		<div class="flex h-full items-center">
			<div class="h-3 w-[1px] bg-gray-800"></div>
		</div>
	{/if}
	<input
		{id}
		{name}
		{type}
		{placeholder}
		class="px-2 outline-none"
		onchange={(e) => onchange?.((e.target as HTMLInputElement).value)}
		bind:this={element}
	/>
	<div
		class="flex aspect-square h-full w-auto items-center justify-center px-2 text-white"
	>
		X
	</div>
</div>

<style>
	div[data-input-text-icon] :global(svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
