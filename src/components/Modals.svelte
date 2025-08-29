<svelte:options runes />

<script lang="ts">
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import Button from './Button.svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getContext } from 'svelte';

	let gameState = getGameStateContext();
	let inputs = getContext<GameInput>(GameInput.name);

	const onContinue = () => {
		gameState.setPause(false);
		inputs.disabled = false;
	};
</script>

{#if $gameState.paused}
	<div
		class="absolute top-0 left-0 z-10 flex size-full items-center justify-center bg-black/75 transition-colors starting:bg-transparent"
	>
		<div class="flex flex-col gap-4 bg-zinc-900 p-4 shadow-lg">
			<div class="flex gap-4">
				<Button label="Continue" color="success" onclick={onContinue} />
				<Button label="Exit" color="error" />
			</div>
		</div>
	</div>
{/if}
