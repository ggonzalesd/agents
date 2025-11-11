<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';

	import { getMessageHistoryContext } from '@/hooks';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { GameInput } from '@/utils/input.utils';

	import InputText from '../InputText.svelte';

	let gameInputContext = getContext<GameInput>(GameInput.name);
	let gameStateContext = getGameStateContext();
	let worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);
	let messageHistoryContext = getMessageHistoryContext();

	function onSubmit(event: SubmitEvent) {
		console.log('Message sent to server:', event);

		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const message = (form.elements.namedItem('message') as HTMLInputElement)
			.value;
		console.log('Message sent:', message);
		form.reset();

		gameStateContext.setPause(false);
		gameInputContext.disabled = false;

		const room = worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.pick('room')
			.unwrap('No WorldEcs context');

		room.send('client:action', {
			type: 'message',
			message: message,
		});
	}

	let inputRef = $state.raw<HTMLInputElement>(null!);

	onMount(() => {
		inputRef.focus();
	});
</script>

{#snippet renderMessage(from: string, message: string)}
	<div
		class="text-gris-50 font-space-mono bg-gris-600 flex flex-col gap-1 rounded-lg px-4 py-2.5"
	>
		<p class="text-[12px]">From: {from}</p>
		<p class="text-[14px]">{message}</p>
	</div>
{/snippet}

{#snippet renderRecommendedMessage(message: string)}
	<button
		class="text-gris-100 font-space-mono border-gris-100 hover:bg-gris-700 inline-flex cursor-pointer items-center justify-center rounded-lg border px-4 py-1 text-xs"
		onclick={() => {
			inputRef.value = message;
		}}
	>
		<p>{message}</p>
	</button>
{/snippet}

<div
	class="pointer-events-auto absolute right-0 flex h-full w-[350px] flex-col gap-5 bg-[url(/background-log-messages.png)] bg-cover bg-center bg-no-repeat p-4"
>
	<p class="text-gris-50 text-lg font-bold">Log messages</p>

	<div class="flex h-full flex-col gap-3 overflow-y-auto">
		{#each $messageHistoryContext as { id, from, message } (id)}
			{@render renderMessage(from, message)}
		{/each}
	</div>

	<div class="flex flex-col gap-3">
		<p class="text-gris-50 text-lg font-bold">Recommended messages</p>
		<div class="grid grid-cols-3 gap-2 text-center text-nowrap">
			{#each ['Hello!', 'Good game!', 'Well played!', 'Thanks!'] as msg}
				{@render renderRecommendedMessage(msg)}
			{/each}
		</div>
	</div>

	<div class="border-gris-500 h-[1px] border"></div>

	<form onsubmit={onSubmit} class="flex w-full">
		<InputText
			bind:element={inputRef}
			name="message"
			placeholder="Type your message..."
			id="message"
			type="text"
		/>
	</form>
</div>
