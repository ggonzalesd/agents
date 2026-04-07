<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
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
					toast.success(
						`${msg.acceptorName} aceptó tu misión: "${msg.missionTitle}"`,
					);
					break;
				case 'mission:completed':
					toast.success(
						`${msg.validatorName} completó la misión: "${msg.missionTitle}"`,
					);
					break;
				case 'mission:abandoned':
					toast.warning(
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
