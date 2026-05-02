<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import type { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import type { MapSchema } from '@colyseus/schema';
	import { SvelteMap } from 'svelte/reactivity';
	import type { IVec2 } from '#/utils/math.util';

	import { getItemIcon } from '@/game/item-icons.registry';
	import { ITEM_REGISTRY } from '#/state/item-registry';

	let worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	let mousePos: IVec2 = { x: 0, y: 0 };
	let dragFromSlot: string | null = $state(null);
	let dragOverSlot: string | null = $state(null);

	type InventoryItem = {
		type: string;
		quantity: number;
		metadata?: MapSchema<string> | Record<string, unknown>;
	};

	let itemState = new SvelteMap<string, InventoryItem>();

	let roomRef: { send: (type: string, data: unknown) => void } | null = null;

	onMount(() => {
		const world = worldOp.raw();
		if (!world) {
			return () => {};
		}

		const colyseusClient = world
			.get(ColyseusClientEcs)
			.unwrap('No ColyseusClientEcs found');
		const connection = colyseusClient.connection.collapse().raw();

		if (!connection) {
			return () => {};
		}

		const { proxy, room } = connection;
		roomRef = room;

		const state = world
			.getEntity(colyseusClient.entityId)
			.map((e) => e.getUnsafe(RecordEcs)?.getRecord('state'))
			.collapse()
			.raw() as PlayerState | undefined;

		if (!state) {
			return () => {};
		}

		const inventoryProxy = proxy(state.inventory).items;

		const detachAdd = inventoryProxy.onAdd((item, key) => {
			itemState.set(key, {
				type: item.type,
				quantity: item.quantity,
				metadata: item.metadata,
			});
		}, true) ?? (() => undefined);

		const detachRemove = inventoryProxy.onRemove((_item, key) => {
			itemState.delete(key);
		}) ?? (() => undefined);

		const detachChange = inventoryProxy.onChange((item, key) => {
			itemState.set(key, {
				type: item.type,
				quantity: item.quantity,
				metadata: item.metadata,
			});
		}) ?? (() => undefined);

		return () => {
			detachAdd();
			detachRemove();
			detachChange();
		};
	});

	function onMouseMove(event: MouseEvent) {
		mousePos = { x: event.clientX, y: event.clientY };
	}

	function sendAction(data: Record<string, unknown>) {
		roomRef?.send('client:action', data);
	}

	function getFirstFreeSlot(): number | null {
		const capacity = 36;
		for (let i = 0; i < capacity; i++) {
			if (!itemState.has(i.toString())) return i;
		}
		return null;
	}

	function handleDragStart(slotId: string) {
		dragFromSlot = slotId;
	}

	function handleDragOver(e: DragEvent, slotId: string) {
		e.preventDefault();
		dragOverSlot = slotId;
	}

	function handleDragLeave() {
		dragOverSlot = null;
	}

	function handleDrop(slotId: string) {
		if (dragFromSlot != null && dragFromSlot !== slotId) {
			sendAction({
				type: 'move-item',
				fromSlot: Number(dragFromSlot),
				toSlot: Number(slotId),
			});
		}
		dragFromSlot = null;
		dragOverSlot = null;
	}

	function handleDragEnd() {
		dragFromSlot = null;
		dragOverSlot = null;
	}

	function handleSlotClick(e: MouseEvent, slotId: string) {
		if (!e.shiftKey) return;
		const item = itemState.get(slotId);
		if (!item || item.quantity <= 1) return;

		const freeSlot = getFirstFreeSlot();
		if (freeSlot == null) return;

		sendAction({
			type: 'split-item',
			fromSlot: Number(slotId),
			toSlot: freeSlot,
			quantity: Math.floor(item.quantity / 2),
		});
	}

	function handleContextMenu(e: MouseEvent, slotId: string) {
		e.preventDefault();
		const item = itemState.get(slotId);
		if (!item) return;
		const def = ITEM_REGISTRY[item.type];
		if (!def?.consumable) return;
		sendAction({ type: 'consume-item', slot: Number(slotId) });
	}

	const itemDropHandler = (id: string) => (itemDiv: HTMLDivElement) => {
		const world = worldOp.raw();
		if (!world) {
			return () => {};
		}

		const room = world
			.get(ColyseusClientEcs)
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
		if (!room) {
			return () => {};
		}

		const onKeyQ = (event: KeyboardEvent) => {
			const rect = itemDiv.getBoundingClientRect();

			if (
				mousePos.x >= rect.left &&
				mousePos.x <= rect.right &&
				mousePos.y >= rect.top &&
				mousePos.y <= rect.bottom &&
				event.key === 'q'
			) {
				room.send('client:action', { type: 'drop', itemId: id });
				itemState.delete(id);
			}
		};

		document.addEventListener('keydown', onKeyQ);

		return () => {
			document.removeEventListener('keydown', onKeyQ);
		};
	};
</script>

{#snippet itemIcon(item: InventoryItem)}
	{@const icon = getItemIcon(item.type)}
	{#if icon}
		<img src={icon} alt={item.type} class="h-10 w-10" />
	{:else}
		{item.type}
	{/if}
{/snippet}

{#snippet slot(slotId: string)}
	{@const item = itemState.get(slotId)}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="border-gris-300 relative flex aspect-square size-19 cursor-pointer items-center justify-center border-4 transition-colors"
		class:border-[#8965F2]={dragOverSlot === slotId}
		ondragover={(e: DragEvent) => handleDragOver(e, slotId)}
		ondragleave={handleDragLeave}
		ondrop={() => handleDrop(slotId)}
		onclick={(e: MouseEvent) => handleSlotClick(e, slotId)}
		oncontextmenu={(e: MouseEvent) => handleContextMenu(e, slotId)}
		onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleSlotClick(e as unknown as MouseEvent, slotId); }}
	>
		{#if item}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="Item flex h-full w-full items-center justify-center"
				draggable="true"
				ondragstart={() => handleDragStart(slotId)}
				ondragend={handleDragEnd}
				{@attach itemDropHandler(slotId)}
			>
				{@render itemIcon(item)}
			</div>
			{#if item.quantity > 1}
				<span class="absolute bottom-0 right-0 rounded bg-black/50 px-1 text-xs font-bold text-white">
					{item.quantity}
				</span>
			{/if}
		{:else}
			<div class="Empty"></div>
		{/if}
	</div>
{/snippet}

<svelte:document on:mousemove={onMouseMove} />

<div
	class="flex flex-col gap-5 rounded-lg bg-[url(/background-inventory.svg)] bg-cover bg-center bg-no-repeat p-5 [direction:reverse]"
>
	<h1 class="font-zen-dots text-center text-2xl">INVENTORY</h1>
	<div class="grid grid-cols-9 [direction:reverse]">
		{#each new Array(27) as _, i}
			{@render slot(i.toString())}
		{/each}
	</div>

	<div class="grid grid-cols-9 [direction:reverse]">
		{#each new Array(9) as _, i}
			{@render slot((i + 27).toString())}
		{/each}
	</div>
</div>
