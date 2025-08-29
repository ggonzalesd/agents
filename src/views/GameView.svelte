<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { Option } from '#/utils/Option';

	import { getDebugContext } from '@/hooks/useDebug.svelte';
	import { getActionsContext } from '@/hooks/useActions.svelte';
	import { GameInput } from '@/utils/input.utils';

	import { worldPrefab } from '@/game/prefab/world.client';

	let canvasRef = $state.raw<HTMLCanvasElement>(null!);

	let debugContext = getDebugContext();
	let actionContext = getActionsContext();
	let gameInputContext = getContext<GameInput>(GameInput.name);

	onMount(() => {

		const world = worldPrefab({
			canvas: $state.snapshot(canvasRef) as HTMLCanvasElement,
			input: gameInputContext,
			debug: debugContext,
			actions: actionContext,
		});

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
		};
	});
</script>

<canvas class="absolute size-full bg-zinc-900 pointer-events-auto" bind:this={canvasRef}></canvas>
