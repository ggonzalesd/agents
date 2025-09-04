<svelte:options runes />

<script lang="ts">
	import Button from '@/components/Button.svelte';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getContext } from 'svelte';

	let gameState = getGameStateContext();
	let routerContext = getRouterContext();
	let inputs = getContext<GameInput>(GameInput.name);

	const onContinue = () => {
		gameState.setPause(false);
		inputs.disabled = false;
	};

	const onExit = () => {
		gameState.setPause(false);
		inputs.disabled = false;
		routerContext.changeRoute('/profile');
	};
</script>

<div class="flex flex-col gap-4 bg-zinc-900 p-4 shadow-lg">
	<div class="flex gap-4">
		<Button label="Continue" color="success" onclick={onContinue} />
		<Button label="Exit" color="error" onclick={onExit} />
	</div>
</div>
