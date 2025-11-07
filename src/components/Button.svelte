<svelte:options runes />

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import { v4 as uuidv4 } from 'uuid';

	interface Props {
		id?: string;
		name?: string;
		type?: 'button' | 'submit';
		color?: 'error' | 'success' | 'warning' | 'default' | 'ghost';
		iconSvgContent?: string;
		element?: HTMLButtonElement;
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		label?: string;
		children?: Snippet;
		class?: ClassValue;
	}

	let {
		id = uuidv4(),
		element = $bindable(),
		iconSvgContent,
		name,
		onclick,
		disabled,
		color = 'default',
		type = 'button',
		label,
		children,
		class: className,
	}: Props = $props();
</script>

<button
	{id}
	{name}
	{type}
	aria-disabled={disabled}
	class={[
		'pointer-events-auto inline-flex h-8 items-center justify-center gap-2 rounded-full px-4 shadow-lg transition-all hover:cursor-pointer focus:outline-none active:scale-105 aria-disabled:opacity-50 aria-disabled:saturate-0',
		{
			default: 'bg-gray-700 text-gray-300',
			error: ' bg-red-900 text-red-300',
			success: ' bg-lime-900 text-lime-300',
			warning: ' bg-yellow-900 text-yellow-300',
			ghost:
				'hover:bg-gris-700 w-full justify-start rounded-md bg-transparent !px-2',
		}[color],
		className,
	]}
	{disabled}
	bind:this={element}
	{onclick}
>
	{#if iconSvgContent}
		<span data-button-icon class="flex items-center justify-center">
			{@html iconSvgContent}
		</span>
	{/if}
	{#if label}
		<span class="flex w-full grow justify-center">{label}</span>
	{/if}
	{#if children}
		{@render children()}
	{/if}

	{#if iconSvgContent}
		<div
			data-button-icon
			class="flex aspect-square size-4 items-center justify-center"
		></div>
	{/if}
</button>

<style>
	[data-button-icon] > :global(svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
