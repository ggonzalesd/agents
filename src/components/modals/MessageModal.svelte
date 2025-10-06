<svelte:options runes />

<script lang="ts">
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getContext, onMount } from 'svelte';

	let gameInputContext = getContext<GameInput>(GameInput.name);
	let gameStateContext = getGameStateContext();
	let worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	function onSubmit(event: SubmitEvent) {
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

<div>
	<p>Send a Message</p>
	<form onsubmit={onSubmit}>
		<input bind:this={inputRef} type="text" name="message" id="message" />
		<button type="submit">Send</button>
	</form>
</div>
