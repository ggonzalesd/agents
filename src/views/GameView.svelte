<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { Option } from '#/utils/Option';

	import { getDebugContext } from '@/hooks/useDebug.svelte';
	import { getActionsContext } from '@/hooks/useActions.svelte';
	import { GameInput } from '@/utils/input.utils';

	import { worldPrefab } from '@/game/prefab/world.client';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';

	let canvasRef = $state.raw<HTMLCanvasElement>(null!);

	let debugContext = getDebugContext();
	let actionContext = getActionsContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);
	let gameStateContext = getGameStateContext();
	let worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	onMount(() => {
		gameInputContext.disabled = false;

		const world = worldPrefab({
			canvas: $state.snapshot(canvasRef) as HTMLCanvasElement,
			game: gameStateContext,
			input: gameInputContext,
			debug: debugContext,
			actions: actionContext,
			token: localStorage.getItem('token') ?? '',
		});

		worldEcsContext.populate(world);

		let animationRequestId: Option<number> = Option.none();
		let lastTime = performance.now();

		function main() {
			let currentTime = performance.now();
			let deltaTime = currentTime - lastTime;
			lastTime = currentTime;

			world.onUpdate(deltaTime);
			animationRequestId.populate(requestAnimationFrame(main));
		}

		animationRequestId.populate(requestAnimationFrame(main));

		return () => {
			animationRequestId.ifSome(cancelAnimationFrame);
			world.onDelete();
			worldEcsContext.clear();
		};
	});
</script>

<canvas
	class="pointer-events-auto absolute size-full bg-zinc-900"
	bind:this={canvasRef}
></canvas>
