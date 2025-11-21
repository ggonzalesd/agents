<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import type { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { PlayerState } from '#/state/player.state';
	import { SvelteMap } from 'svelte/reactivity';
	import type { IVec2 } from '#/utils/math.util';

	import cookieSvgSrc from '@/assets/items/cookie.svg';
	import potionSvgSrc from '@/assets/items/potion.svg';
	import seedsSvgSrc from '@/assets/items/seeds.svg';
	import swordSvgSrc from '@/assets/items/sword.svg';
	import coinSvgSrc from '@/assets/items/coin.svg';

	let worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	let mousePos: IVec2 = { x: 0, y: 0 };

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

		console.log('Mounting InventoryModal');

		const colyseusClient = world
			.get(ColyseusClientEcs)
			.unwrap('No ColyseusClientEcs found');
		const connection = colyseusClient.connection.collapse().raw();

		if (!connection) {
			return () => {};
		}

		console.log('Connection found in InventoryModal');

		const { proxy, room } = connection;

		const state = world
			.getEntity(colyseusClient.entityId)
			.map((e) => e.getUnsafe(RecordEcs)?.getRecord('state'))
			.collapse()
			.raw() as PlayerState | undefined;

		console.log('Player state in InventoryModal:', { state });

		if (!state) {
			return () => {};
		}

		const detachAdd = proxy(state.inventory).items.onAdd((item, key) => {
			itemState.set(key, {
				type: item.type,
				quantity: item.quantity,
				metadata: item.metadata,
			});
			console.log('Item added to inventory:', item, key);
		}, true);

		return () => {
			detachAdd();
		};
	});

	function onMouseMove(event: MouseEvent) {
		mousePos = { x: event.clientX, y: event.clientY };
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
			// Check if the itemDiv is hovered
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

<svelte:document on:mousemove={onMouseMove} />

<div
	class="flex flex-col gap-5 rounded-lg bg-[url(/background-inventory.svg)] bg-cover bg-center bg-no-repeat p-5 [direction:reverse]"
>
	<h1 class="font-zen-dots text-center text-2xl">INVENTORY</h1>
	<div class="grid grid-cols-9 [direction:reverse]">
		{#each new Array(27) as _, i}
			{@const item = itemState.get(i.toString())}
			<div
				class="border-gris-300 flex aspect-square size-19 cursor-pointer items-center justify-center border-4 hover:border-[#8965F2]"
			>
				{#if item}
					<div class="Item" {@attach itemDropHandler(i.toString())}>
						{#if item.type === 'cookie'}
							<img src={cookieSvgSrc} alt="Cookie" class="h-10 w-10" />
						{:else if item.type === 'potion'}
							<img src={potionSvgSrc} alt="Potion" class="h-10 w-10" />
						{:else if item.type === 'seeds'}
							<img src={seedsSvgSrc} alt="Seeds" class="h-10 w-10" />
						{:else if item.type === 'sword'}
							<img src={swordSvgSrc} alt="Sword" class="h-10 w-10" />
						{:else if item.type === 'coin'}
							<img src={coinSvgSrc} alt="Coin" class="h-10 w-10" />
						{:else}
							{item.type}
						{/if}
					</div>
				{:else}
					<div class="Empty">Empty</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-9 [direction:reverse]">
		{#each new Array(9) as _, i}
			{@const item = itemState.get((i + 27).toString())}
			<div
				class="border-gris-300 flex aspect-square size-19 cursor-pointer items-center justify-center border-4 hover:border-[#8965F2]"
			>
				{#if item}
					<div class="Item" {@attach itemDropHandler((i + 27).toString())}>
						{item.type}
					</div>
				{:else}
					<div class="Empty">Empty</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
