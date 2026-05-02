<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import type { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import type { NPCState } from '#/state/game.state';
	import type { MapSchema } from '@colyseus/schema';
	import { SvelteMap } from 'svelte/reactivity';
	import type { IVec2 } from '#/utils/math.util';

	import { getItemIcon } from '@/game/item-icons.registry';
	import { ITEM_REGISTRY } from '#/state/item-registry';

	let worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	let mousePos: IVec2 = { x: 0, y: 0 };
	let dragFromSlot: string | null = $state(null);
	let dragOverSlot: string | null = $state(null);
	let dragOverTarget: string | null = $state(null);

	type InventoryItem = {
		type: string;
		quantity: number;
		metadata?: MapSchema<string> | Record<string, unknown>;
	};

	type TransferTarget = {
		entityId: string;
		name: string;
		skin: string;
		isFull: boolean;
	};

	let itemState = new SvelteMap<string, InventoryItem>();
	let transferTargets = new SvelteMap<string, TransferTarget>();

	let roomRef: { send: (type: string, data: unknown) => void } | null = null;
	let myEntityId: string = '';

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
		myEntityId = colyseusClient.entityId;

		const state = world
			.getEntity(colyseusClient.entityId)
			.map((e) => e.getUnsafe(RecordEcs)?.getRecord('state'))
			.collapse()
			.raw() as PlayerState | undefined;

		if (!state) {
			return () => {};
		}

		// Inventory items reactivity
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

		// Transfer targets: other players
		const playersProxy = proxy(room.state).players;

		const detachPlayerAdd = playersProxy.onAdd((playerState: PlayerState, entityId: string) => {
			if (entityId === myEntityId) return;

			const updateTarget = () => {
				const isFull = playerState.inventory.items.size >= playerState.inventory.capacity;
				transferTargets.set(entityId, {
					entityId,
					name: entityId,
					skin: playerState.skin,
					isFull,
				});
			};

			updateTarget();
			proxy(playerState.inventory).items.onChange(() => updateTarget());
			proxy(playerState.inventory).items.onAdd(() => updateTarget());
			proxy(playerState.inventory).items.onRemove(() => updateTarget());
		}, true) ?? (() => undefined);

		const detachPlayerRemove = playersProxy.onRemove((_: PlayerState, entityId: string) => {
			transferTargets.delete(entityId);
		}) ?? (() => undefined);

		// Transfer targets: NPCs
		const npcsProxy = proxy(room.state).npcs;

		const detachNpcAdd = npcsProxy.onAdd((npcState: NPCState, entityId: string) => {
			if (!npcState.hasInventory) return;

			const updateTarget = () => {
				const isFull = npcState.inventory.items.size >= npcState.inventory.capacity;
				transferTargets.set(entityId, {
					entityId,
					name: entityId,
					skin: npcState.skin,
					isFull,
				});
			};

			updateTarget();
			proxy(npcState.inventory).items.onChange(() => updateTarget());
			proxy(npcState.inventory).items.onAdd(() => updateTarget());
			proxy(npcState.inventory).items.onRemove(() => updateTarget());
		}, true) ?? (() => undefined);

		const detachNpcRemove = npcsProxy.onRemove((_: NPCState, entityId: string) => {
			transferTargets.delete(entityId);
		}) ?? (() => undefined);

		return () => {
			detachAdd();
			detachRemove();
			detachChange();
			detachPlayerAdd();
			detachPlayerRemove();
			detachNpcAdd();
			detachNpcRemove();
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

	function handleTargetDragOver(e: DragEvent, target: TransferTarget) {
		if (target.isFull || dragFromSlot == null) return;
		e.preventDefault();
		dragOverTarget = target.entityId;
	}

	function handleTargetDragLeave() {
		dragOverTarget = null;
	}

	function handleTargetDrop(target: TransferTarget) {
		if (target.isFull || dragFromSlot == null) return;
		sendAction({
			type: 'give-item',
			fromSlot: Number(dragFromSlot),
			targetEntityId: target.entityId,
		});
		dragFromSlot = null;
		dragOverTarget = null;
	}

	function skinUrl(skin: string): string {
		return `${import.meta.env.VITE_API_URL}/api/v1/skin/${skin}.png`;
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

{#snippet targetAvatar(target: TransferTarget)}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex flex-col items-center gap-1 select-none"
		class:opacity-40={target.isFull}
		ondragover={(e: DragEvent) => handleTargetDragOver(e, target)}
		ondragleave={handleTargetDragLeave}
		ondrop={() => handleTargetDrop(target)}
	>
		<div
			class="relative overflow-hidden rounded-md border-2 transition-colors"
			class:border-[#8965F2]={dragOverTarget === target.entityId && !target.isFull}
			class:border-transparent={dragOverTarget !== target.entityId}
			class:cursor-not-allowed={target.isFull}
			class:cursor-grab={!target.isFull}
			style="
				width: var(--skin-avatar-size, 48px);
				height: var(--skin-avatar-size, 48px);
			"
		>
			<img
				src={skinUrl(target.skin)}
				alt={target.name}
				style="
					position: absolute;
					width: calc(var(--skin-avatar-size, 48px) * var(--skin-avatar-scale, 2.5));
					top: calc(var(--skin-avatar-offset-y, -4px));
					left: calc(var(--skin-avatar-offset-x, -8px));
					image-rendering: pixelated;
				"
				draggable="false"
			/>
			{#if target.isFull}
				<div class="absolute inset-0 flex items-center justify-center bg-black/50">
					<span class="text-[8px] font-bold text-white leading-tight text-center">FULL</span>
				</div>
			{/if}
		</div>
		<span class="max-w-[52px] truncate text-center text-[10px] text-white/70">{target.name}</span>
	</div>
{/snippet}

<svelte:document on:mousemove={onMouseMove} />

<div class="flex gap-3">
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

	{#if transferTargets.size > 0}
		<div class="flex flex-col gap-3 rounded-lg bg-black/40 p-3 min-w-[72px] max-h-full overflow-y-auto">
			<span class="text-center text-[10px] text-white/50 uppercase tracking-wider">Nearby</span>
			{#each [...transferTargets.values()] as target (target.entityId)}
				{@render targetAvatar(target)}
			{/each}
		</div>
	{/if}
</div>
