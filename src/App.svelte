<script lang="ts">
	import { Client, getStateCallbacks } from 'colyseus.js';
	import { onMount } from 'svelte';

	import { GameState } from '#/state/game.state';

	onMount(() => {
		const client = new Client('ws://localhost:3000');
		client.auth.token = 'your_token_here';

		async function game() {
			const room = await client.joinById<GameState>('main-room');

			const c = getStateCallbacks(room);

			c(room.state).players.onAdd((player, key) => {
				console.log('Player added:', player, key);

				c(player).onChange(() => {
					console.log('Player changed:', player);
				});
			});
		}

		game();
	});
</script>

<main></main>
