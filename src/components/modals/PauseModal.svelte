<svelte:options runes />

<script lang="ts">
	import Button from '@/components/ui/Button.svelte';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { getRouterContext } from '@/hooks/useRouter.svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getContext } from 'svelte';
	import closeSvgContent from '@/assets/icons/close.svg?raw';

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

<div class="flex flex-col gap-10 bg-[url(/background-pause.svg)] bg-cover bg-center bg-no-repeat px-20 py-6 rounded-lg">
	<h1 class="font-zen-dots text-center text-2xl">MENU</h1>
	<div class="flex flex-col gap-6">
		<Button type="submit" onclick={onContinue}>Continuar</Button>
		<Button type="submit" onclick={onExit}>Abandonar</Button>
	</div>
	<div class="flex justify-center items-start">
		<button class="flex justify-center items-center text-gris-50 hover:text-gris-100 hover:border-gris-100 border-2 border-gris-50 rounded-full px-3 aspect-square cursor-pointer" onclick={onContinue}>
			{@html closeSvgContent}
		</button>
	</div>
</div>
