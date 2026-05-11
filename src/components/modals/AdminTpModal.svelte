<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';
	import type { PlayerState } from '#/state/player.state';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import Button from '@/components/ui/Button.svelte';

	let gameState = getGameStateContext();
	let worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	let players = $state<{ entityId: string; name: string; skin: string }[]>([]);
	let myEntityId = $state('');
	let tpTarget = $state<string | null>(null);
	let error = $state<string | null>(null);
	let roomRef: Room<GameState> | null = null;

	function skinAvatarUrl(skin: string): string {
		return `${import.meta.env.VITE_API_URL}/api/v1/skin/head/${skin}/avatar.png`;
	}

	function refreshPlayers() {
		if (!roomRef) return;

		players = Array.from(roomRef.state.players.entries()).map(
			([entityId, state]: [string, PlayerState]) => ({
				entityId,
				name: state.name || entityId,
				skin: state.skin,
			}),
		);
	}

	function teleportToPlayer(targetEntityId: string) {
		tpTarget = targetEntityId;
		error = null;

		if (!roomRef) {
			error = 'No hay conexión con la sala';
			tpTarget = null;
			return;
		}

		roomRef.send('admin:teleport', {
			type: 'to-player',
			targetEntityId,
		});

		setTimeout(() => {
			tpTarget = null;
		}, 500);
	}

	function teleportToOrigin() {
		tpTarget = '__origin__';
		error = null;

		if (!roomRef) {
			error = 'No hay conexión con la sala';
			tpTarget = null;
			return;
		}

		roomRef.send('admin:teleport', {
			type: 'to-origin',
		});

		setTimeout(() => {
			tpTarget = null;
		}, 500);
	}

	function onBack() {
		gameState.setPause(true, 'MENU');
	}

	onMount(() => {
		const world = worldEcsContext.raw();
		if (!world) return;

		const colyseusClient = world.get(ColyseusClientEcs).raw();
		if (!colyseusClient) return;

		const connection = colyseusClient.connection.collapse().raw();
		if (!connection) return;

		const { proxy, room } = connection;
		roomRef = room;
		myEntityId = colyseusClient.entityId;

		refreshPlayers();

		const playersProxy = proxy(room.state).players;

		const unsubAdd =
			playersProxy.onAdd(() => {
				refreshPlayers();
			}) ?? (() => undefined);

		const unsubRemove =
			playersProxy.onRemove(() => {
				refreshPlayers();
			}) ?? (() => undefined);

		return () => {
			unsubAdd();
			unsubRemove();
		};
	});
</script>

<div
	class="flex flex-col gap-4 rounded-lg bg-[#27272a] p-6 text-white"
	style="width: 400px; max-height: 70vh;"
>
	<h1 class="font-zen-dots text-center text-xl">ADMIN TP</h1>

	<div class="flex flex-col gap-2">
		<Button
			type="button"
			class={tpTarget === '__origin__' ? 'opacity-50' : ''}
			disabled={tpTarget === '__origin__'}
			onclick={teleportToOrigin}
		>
			TP al Origen (0, 2, 0)
		</Button>
	</div>

	<div class="border-t border-zinc-600 pt-2">
		<h2 class="text-sm font-medium text-gray-400 mb-2">Jugadores conectados</h2>

		{#if error}
			<div class="bg-red-900/50 border border-red-600 rounded p-2 text-red-400 text-xs mb-2">
				{error}
			</div>
		{/if}

		<div class="overflow-y-auto max-h-48 flex flex-col gap-1">
			{#if players.length === 0}
				<div class="text-gray-500 text-center text-sm py-2">No hay jugadores</div>
			{:else}
				{#each players as player}
					{#if player.entityId !== myEntityId}
						<div class="flex items-center justify-between bg-zinc-700 rounded px-3 py-2">
							<div class="flex items-center gap-2 min-w-0">
								<img
									src={skinAvatarUrl(player.skin)}
									alt={player.name}
									class="image-rendering-pixelated size-8 shrink-0"
									draggable="false"
								/>
								<span class="text-sm truncate">{player.name}</span>
							</div>
							<Button
								type="button"
								class="h-7 px-3 text-xs min-w-fit"
								disabled={tpTarget !== null}
								onclick={() => teleportToPlayer(player.entityId)}
							>
								{tpTarget === player.entityId ? 'TP...' : 'TP'}
							</Button>
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</div>

	<div class="flex justify-center mt-2">
		<Button type="button" class="h-10 px-6 text-sm bg-zinc-600 hover:bg-zinc-500" onclick={onBack}>
			Volver
		</Button>
	</div>
</div>