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

<div
	class="flex flex-col gap-10 rounded-lg bg-[url(/background-pause.svg)] bg-cover bg-center bg-no-repeat px-20 py-6"
>
	<h1 class="font-zen-dots text-center text-2xl">MENU</h1>
	<div class="flex flex-col gap-6">
		<Button type="submit" onclick={onContinue}>Continuar</Button>
		<Button type="submit" onclick={onExit}>Abandonar</Button>
	</div>
	<div class="flex items-start justify-center">
		<button
			class="text-gris-50 hover:text-gris-100 hover:border-gris-100 border-gris-50 flex aspect-square cursor-pointer items-center justify-center rounded-full border-2 px-3"
			onclick={onContinue}
		>
			{@html closeSvgContent}
		</button>
	</div>
</div>
