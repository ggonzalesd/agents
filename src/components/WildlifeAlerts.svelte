<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { getDebugContext } from '@/hooks/useDebug.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';

	interface WildlifeEvent {
		type: 'wildlife:event';
		populationKey: 'bull' | 'deer' | 'donkey' | 'wolf';
		title: string;
		message: string;
		x: number;
		y: number;
		z: number;
	}

	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);
	const debugContext = getDebugContext();

	function getRoom(): Room<GameState> | null {
		return worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
	}

	function registerListeners(room: Room<GameState>) {
		room.onMessage('wildlife:event', (msg: WildlifeEvent) => {
			debugContext.warning(
				`${msg.title}: ${msg.message} (${Math.round(msg.x)}, ${Math.round(msg.z)})`,
			);
		});
	}

	onMount(() => {
		const room = getRoom();
		if (room) {
			registerListeners(room);
			return;
		}

		const interval = setInterval(() => {
			const nextRoom = getRoom();
			if (nextRoom) {
				clearInterval(interval);
				registerListeners(nextRoom);
			}
		}, 500);

		return () => clearInterval(interval);
	});
</script>
