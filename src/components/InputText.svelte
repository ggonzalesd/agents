<svelte:options runes />

<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';

	import showSvgContent from '@/assets/icons/show.svg?raw';
	import hideSvgContent from '@/assets/icons/hide.svg?raw';

	interface Props {
		id?: string;
		name?: string;
		type?: 'text' | 'password';
		placeholder?: string;
		color?: 'error' | 'success' | 'warning' | 'default';

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
		color = 'default',
		type: _type = 'text',
		placeholder,
	}: Props = $props();

	let type = $state(_type);
</script>

<div
	data-input-color={color}
	class={[
		'inline-flex h-8 justify-between rounded-full border bg-gray-900 shadow-lg  transition-all',
		{
			default: 'border-gray-500 text-gray-300',
			error: 'border-red-500 text-red-300',
			success: 'border-lime-500 text-lime-300',
			warning: 'border-yellow-500 text-yellow-300',
		}[color],
	]}
>
	{#if iconSvgContent}
		<div
			data-input-icon
			class="flex aspect-square h-full w-auto items-center justify-center"
		>
			{@html iconSvgContent}
		</div>
	{/if}
	<input
		{id}
		{name}
		{type}
		{placeholder}
		class="flex flex-1 px-2 outline-none"
		onchange={(e) => onchange?.((e.target as HTMLInputElement).value)}
		bind:this={element}
	/>
	{#if _type === 'password'}
		<button
			data-input-icon
			type="button"
			class="flex aspect-square h-full w-auto items-center justify-center px-2 text-white transition-all hover:cursor-pointer active:scale-125"
			onclick={() => (type = type === 'text' ? 'password' : 'text')}
		>
			{@html type === 'text' ? hideSvgContent : showSvgContent}
		</button>
	{/if}
</div>

<style>
	[data-input-icon] > :global(svg) {
		width: 1rem;
		height: 1rem;
	}

	div[data-input-color='warning']:has(input:focus) {
		border-color: var(--color-yellow-300);
	}

	div[data-input-color='default']:has(input:focus) {
		border-color: var(--color-gray-300);
	}

	div[data-input-color='error']:has(input:focus) {
		border-color: var(--color-red-300);
	}

	div[data-input-color='success']:has(input:focus) {
		border-color: var(--color-lime-300);
	}
</style>
