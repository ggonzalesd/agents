<script lang="ts">
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import { ColyseusClientEcs } from '@/game/scripts/colyseusClient.ecs';
	import { Option } from '#/utils/Option';
	import { ClientManagerEcs } from '@/game/scripts/clientManager.ecs';

	let playersState = writable<{ key: string; life: number }[]>([]);

	onMount(() => {
		const world = new WorldEcs({
			[ColyseusClientEcs.name]: new ColyseusClientEcs(
				'ws://localhost:3000',
				'your_token_here',
				'main-room',
			),
			[ClientManagerEcs.name]: new ClientManagerEcs(),
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

		/* const client = new Client('ws://localhost:3000');
		client.auth.token = 'your_token_here';

		async function game() {
			const room = await client.joinById<GameState>('main-room');

			console.log(room.sessionId);

			const c = getStateCallbacks(room);

			c(room.state).players.onAdd((player, key) => {
				console.log('Player added:', player, key);

				playersState.update((players) => {
					players.push({ key, life: player.life });
					return players;
				});

				c(player).onChange(() => {
					playersState.update((players) => {
						return players.map((p) =>
							p.key === key ? { key, life: player.life } : p,
						);
					});
				});
			});

			c(room.state).players.onRemove((player, key) => {
				console.log('Player removed:', player, key);
				playersState.update((players) => {
					return players.filter((p) => p.key !== key);
				});
			});
		}

		game(); */

		return () => {
			animationRequestId.ifSome(cancelAnimationFrame);
		};
	});
</script>

<div>
	<h1 class="mb-4 text-2xl font-bold">Game View</h1>
	<ul>
		{#each $playersState as player (player.key)}
			<li class="mb-2 rounded border p-2">
				<strong>Player ID:</strong>
				{player.key} <br />
				<strong>Life:</strong>
				{player.life}
			</li>
		{/each}
	</ul>
</div>
