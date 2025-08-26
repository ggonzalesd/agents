<script lang="ts">
	import { onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import { ColyseusClientEcs } from '@/game/scripts/colyseusClient.ecs';
	import { Option } from '#/utils/Option';
	import { ClientManagerEcs } from '@/game/scripts/clientManager.ecs';
	import { RenderClientEcs } from '@/game/scripts/renderClient.ecs';
	import { UIClientEcs } from '@/game/scripts/uiClient.ecs';
	import { getDebugContext } from '@/hooks/useDebug.svelte';
	import { getActionsContext } from '@/hooks/useActions.svelte';

	let canvasRef = $state.raw<HTMLCanvasElement>(null!);

	let debugContext = getDebugContext();
	let actionContext = getActionsContext();

	onMount(() => {
		const world = new WorldEcs({
			[UIClientEcs.name]: new UIClientEcs({
				debug: debugContext,
				actions: actionContext,
			}),
			[ColyseusClientEcs.name]: new ColyseusClientEcs(
				'ws://localhost:3000',
				'your_token_here',
				'main-room',
			),
			[ClientManagerEcs.name]: new ClientManagerEcs(),
			[RenderClientEcs.name]: new RenderClientEcs(
				$state.snapshot(canvasRef) as HTMLCanvasElement,
			),
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
		};
	});
</script>

<canvas class="absolute size-full bg-zinc-900" bind:this={canvasRef}></canvas>
