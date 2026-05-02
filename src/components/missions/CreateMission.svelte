<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import type { CreateMissionInput } from '#/schema/mission.schema';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import { RecordEcs } from '#/ecs/lib/Record.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';
	import type { PlayerState } from '#/state/player.state';
	import type { MapSchema } from '@colyseus/schema';
	import { SvelteMap } from 'svelte/reactivity';

	import { ITEM_ICONS } from '@/game/item-icons.registry';

	interface Props {
		onBack: () => void;
		onSuccess: () => void;
	}
	let { onBack, onSuccess }: Props = $props();

	const queryClient = useQueryClient();
	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	const form = $state<CreateMissionInput>({
		title: '',
		description: '',
		rewardItemType: null,
		rewardItemQty: null,
	});

	let error = $state<string | null>(null);
	let isPending = $state(false);

	type InventoryItem = {
		type: string;
		quantity: number;
		metadata?: MapSchema<string> | Record<string, unknown>;
	};

	let itemState = new SvelteMap<string, InventoryItem>();
	let rewardItem = $state<{ type: string; qty: number } | null>(null);
	let dragOverReward = $state(false);

	function getRoom(): Room<GameState> | null {
		return worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
	}

	onMount(() => {
		const room = getRoom();
		if (!room) return;

		const handler = (msg: { success: boolean; event?: string; error?: string }) => {
			if (msg.event !== 'mission:created') return;
			isPending = false;
			if (msg.success) {
				queryClient.invalidateQueries({ queryKey: ['missions'] });
				onSuccess();
			} else {
				error = msg.error ?? 'Error al crear la misión';
			}
		};

		room.onMessage('mission:result', handler);

		const world = worldEcsContext.raw();
		if (!world) return;

		const colyseusClient = world.get(ColyseusClientEcs).raw();
		if (!colyseusClient) return;

		const connection = colyseusClient.connection.collapse().raw();
		if (!connection) return;

		const { proxy } = connection;

		const state = world
			.getEntity(colyseusClient.entityId)
			.map((e) => e.getUnsafe(RecordEcs)?.getRecord('state'))
			.collapse()
			.raw() as PlayerState | undefined;

		if (!state) return;

		const inventoryProxy = proxy(state.inventory).items;

		const detachAdd = inventoryProxy.onAdd((item, key) => {
			itemState.set(key, { type: item.type, quantity: item.quantity, metadata: item.metadata });
		}, true) ?? (() => undefined);

		const detachRemove = inventoryProxy.onRemove((_item, key) => {
			itemState.delete(key);
		}) ?? (() => undefined);

		const detachChange = inventoryProxy.onChange((item, key) => {
			itemState.set(key, { type: item.type, quantity: item.quantity, metadata: item.metadata });
		}) ?? (() => undefined);

		return () => {
			detachAdd();
			detachRemove();
			detachChange();
		};
	});

	function handleInventoryDragStart(e: DragEvent, slotId: string) {
		e.dataTransfer?.setData('text/plain', slotId);
	}

	function handleRewardDragOver(e: DragEvent) {
		e.preventDefault();
		dragOverReward = true;
	}

	function handleRewardDragLeave() {
		dragOverReward = false;
	}

	function handleRewardDrop(e: DragEvent) {
		e.preventDefault();
		dragOverReward = false;
		const slotId = e.dataTransfer?.getData('text/plain');
		if (!slotId) return;

		const item = itemState.get(slotId);
		if (!item) return;

		rewardItem = { type: item.type, qty: item.quantity };
		form.rewardItemType = item.type;
		form.rewardItemQty = item.quantity;
	}

	function clearReward() {
		rewardItem = null;
		form.rewardItemType = null;
		form.rewardItemQty = null;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (form.title.length < 3) {
			error = 'El título debe tener al menos 3 caracteres';
			return;
		}
		if (form.description.length < 10) {
			error = 'La descripción debe tener al menos 10 caracteres';
			return;
		}

		const room = getRoom();
		if (!room) {
			error = 'No hay conexión al servidor';
			return;
		}

		isPending = true;
		room.send('client:action', {
			type: 'create-mission',
			title: form.title,
			description: form.description,
			rewardItemType: form.rewardItemType ?? undefined,
			rewardItemQty: form.rewardItemQty ?? undefined,
		});
	}
</script>

{#snippet itemIcon(type: string)}
	{#if ITEM_ICONS[type]}
		<img src={ITEM_ICONS[type]} alt={type} class="h-8 w-8" />
	{:else}
		<span class="text-xs text-gray-300">{type}</span>
	{/if}
{/snippet}

<section class="w-full max-w-2xl mx-auto p-4">
	<div class="bg-gris-800 rounded-xl p-6">
		<div class="flex items-center gap-4 mb-6">
			<button
				class="text-gray-400 hover:text-white transition-colors"
				onclick={onBack}
			>
				← Volver
			</button>
			<h1 class="font-zen-dots text-gris-50 text-xl">Nueva Misión</h1>
		</div>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<div>
				<label class="block text-sm text-gray-300 mb-1" for="title">
					Título *
				</label>
				<InputText
					id="title"
					name="title"
					placeholder="Ej: Recolectar 10 manzanas"
					bind:value={form.title}
				/>
			</div>

			<div>
				<label class="block text-sm text-gray-300 mb-1" for="description">
					Descripción *
				</label>
				<textarea
					id="description"
					name="description"
					placeholder="Describe qué debe hacer quien acepte esta misión..."
					bind:value={form.description}
					class="w-full h-32 bg-gris-700 border border-gris-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
				></textarea>
			</div>

			<!-- Reward: drag item from inventory -->
			<div>
				<div class="block text-sm text-gray-300 mb-2">
					Recompensa (arrastra un item)
				</div>

				<!-- Reward drop zone -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed min-h-16 transition-colors {dragOverReward ? 'border-blue-500 bg-blue-900/20' : 'border-gris-600 bg-gris-700'}"
					ondragover={handleRewardDragOver}
					ondragleave={handleRewardDragLeave}
					ondrop={handleRewardDrop}
				>
					{#if rewardItem}
						<div class="flex items-center gap-2">
							{@render itemIcon(rewardItem.type)}
							<span class="text-white text-sm">{rewardItem.type} x{rewardItem.qty}</span>
							<button
								type="button"
								class="text-red-400 hover:text-red-300 text-xs ml-2"
								onclick={clearReward}
							>
								Quitar
							</button>
						</div>
					{:else}
						<span class="text-gray-500 text-sm">Arrastra un item aquí desde tu inventario</span>
					{/if}
				</div>

				<!-- Mini inventory grid -->
				<div class="mt-3">
					<span class="text-xs text-gray-400 mb-1 block">Tu inventario:</span>
					<div class="grid grid-cols-9 gap-1">
						{#each Array.from(itemState.entries()) as [slotId, item]}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="border border-gris-600 bg-gris-700 rounded flex flex-col items-center justify-center aspect-square cursor-grab hover:border-blue-500 transition-colors p-1"
								draggable="true"
								ondragstart={(e: DragEvent) => handleInventoryDragStart(e, slotId)}
							>
								{@render itemIcon(item.type)}
								{#if item.quantity > 1}
									<span class="text-[10px] text-gray-400">{item.quantity}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			{#if error}
				<div class="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-400 text-sm">
					{error}
				</div>
			{/if}

			<div class="flex justify-end gap-3 mt-4">
				<Button
					type="button"
					class="!bg-gris-600 hover:!bg-gris-500"
					onclick={onBack}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={isPending}
				>
					{isPending ? 'Creando...' : 'Crear Misión'}
				</Button>
			</div>
		</form>
	</div>
</section>
