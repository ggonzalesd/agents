<script lang="ts">
	import { Client, getStateCallbacks } from 'colyseus.js';
	import { onMount } from 'svelte';

	import { GameState } from '#/state/game.state';
	import { writable } from 'svelte/store';

	let playersState = writable<{ key: string; life: number }[]>([]);

	onMount(() => {
		const client = new Client('ws://localhost:3000');
		client.auth.token = 'your_token_here';

		async function game() {
			const room = await client.joinById<GameState>('main-room');

			const c = getStateCallbacks(room);

			c(room.state).players.onAdd((player, key) => {
				console.log('Player added:', player, key);

				playersState.update((players) => {
					players.push({ key, life: player.life });
					return players;
				});

				c(player).onChange(() => {
					console.log('Player changed:', player);
				});
			});

			c(room.state).players.onRemove((player, key) => {
				console.log('Player removed:', player, key);
				playersState.update((players) => {
					return players.filter((p) => p.key !== key);
				});
			});
		}

		game();
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
