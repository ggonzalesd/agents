<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import type { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseusClient.ecs';
	import { PlayerClientBehavior } from '@/game/scripts/player/playerClientBehavior.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import { SvelteMap } from 'svelte/reactivity';

	let worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	let itemState = new SvelteMap<
		string,
		{
			type: string;
			quantity?: number;
			metadata?: Record<string, any>;
		}
	>();

	onMount(() => {
		const world = worldOp.raw();
		if (!world) {
			return () => {};
		}

		const connection = world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.raw();
		if (!connection) {
			return () => {};
		}

		const { proxy, room } = connection;

		const state = world
			.getEntity(room.sessionId)
			.map((e) => e.getUnsafe(RecordEcs)?.getRecord('state'))
			.collapse()
			.raw() as PlayerState | undefined;

		if (!state) {
			return () => {};
		}

		for (const [key, item] of Object.entries(state.inventory.items)) {
			itemState.set(key, item);
		}

		const detachAdd = proxy(state.inventory).items.onAdd((item, key) => {
			itemState.set(key, item);
			console.log('Item added to inventory:', item, key);
		}, true);

		return () => {
			detachAdd();
		};
	});

	let items = ['A', 'B', 'C', 'D'];
</script>

<div class="grid grid-cols-6 gap-2 bg-gray-800 p-4 [direction:reverse]">
	{#each new Array(20) as _, i}
		{@const item = itemState.get(i.toString())}
		<div
			class="flex aspect-square size-16 items-center justify-center rounded-md border border-gray-600 bg-gray-700"
		>
			{#if item}
				<div class="Item">{item.type}</div>
			{:else}
				<div class="Empty">Empty</div>
			{/if}
		</div>
	{/each}
</div>
