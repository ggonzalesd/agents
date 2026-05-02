<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { getDebugContext } from '@/hooks/useDebug.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';

	interface MissionEvent {
		type: 'mission:accepted' | 'mission:completed' | 'mission:abandoned';
		missionId: string;
		missionTitle: string;
		acceptorName?: string;
		validatorName?: string;
		abandonerName?: string;
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
		room.onMessage('mission:event', (msg: MissionEvent) => {
			switch (msg.type) {
				case 'mission:accepted':
					debugContext.success(
						`${msg.acceptorName} aceptó tu misión: "${msg.missionTitle}"`,
					);
					break;
				case 'mission:completed':
					debugContext.success(
						`${msg.validatorName} completó la misión: "${msg.missionTitle}"`,
					);
					break;
				case 'mission:abandoned':
					debugContext.warning(
						`${msg.abandonerName} abandonó tu misión: "${msg.missionTitle}"`,
					);
					break;
			}
		});
	}

	onMount(() => {
		const room = getRoom();
		if (room) {
			registerListeners(room);
			return;
		}

		const interval = setInterval(() => {
			const room = getRoom();
			if (room) {
				clearInterval(interval);
				registerListeners(room);
			}
		}, 500);

		return () => clearInterval(interval);
	});
</script>
