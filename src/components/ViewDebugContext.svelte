<svelte:options runes />

<script lang="ts">
	import {
		getDebugContext,
		type DebugItemMessage,
	} from '@/hooks/useDebug.svelte';

	let debugContext = getDebugContext();
</script>

{#snippet itemMessage(message: DebugItemMessage)}
	<div
		class={[
			'max-w-xs origin-top overflow-hidden rounded break-words shadow-lg transition-transform starting:scale-50',
			{
				info: 'bg-zinc-900 text-white',
				warning: 'bg-yellow-950 text-white',
				error: 'bg-red-950 text-white',
			}[message.type],
		]}
	>
		<div
			class="flex h-6 w-full items-center gap-2 border-b-zinc-600 bg-zinc-800 px-1"
		>
			<button
				class="pointer-events-auto aspect-square size-4 rounded-full bg-red-600 hover:cursor-pointer hover:bg-red-300"
				onclick={message.delete}
			>
				<span class="sr-only">Delete message</span>
			</button>
			<button
				class="pointer-events-auto ml-auto px-1 text-xs text-zinc-400 hover:cursor-pointer hover:text-white"
				onclick={() => navigator.clipboard.writeText(message.message)}
				title="Copiar"
			>
				copy
			</button>
		</div>

		<div class="flex flex-col justify-center gap-2 p-2">
			<svelte:element
				this={message.isCode ? 'pre' : 'div'}
				class="pointer-events-auto"
			>
				{message.message}
			</svelte:element>
			{#if message.imageUrl}
				<img
					class="aspect-square size-30 self-center object-cover object-center"
					src={message.imageUrl}
					alt={'Debug Image - ' + message.imageUrl}
				/>
			{/if}
			<span class="text-xs text-zinc-400"
				>{message.createdAt.toLocaleString()}</span
			>
		</div>
	</div>
{/snippet}

<div
	class="pointer-events-none absolute top-8 left-0 z-50 flex flex-col gap-2 p-4"
>
	<div>View Debug Context</div>

	{#if $debugContext.length === 0}
		<div class="text-sm text-zinc-400">No debug messages</div>
	{/if}

	{#each $debugContext as message}
		{@render itemMessage(message)}
	{/each}
</div>
