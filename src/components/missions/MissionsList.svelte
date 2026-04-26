<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { standarError } from '#/error/standar-error';
	import type { MissionResponse, MissionWithAcceptances } from '#/schema/mission.schema';
	import {
		getOpenMissionsService,
		getMyCreatedMissionsService,
		getMyAcceptedMissionsService,
	} from '@/services/api.service';
	import Button from '@/components/ui/Button.svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';

	import cookieSvgSrc from '@/assets/items/cookie.svg';
	import potionSvgSrc from '@/assets/items/potion.svg';
	import seedsSvgSrc from '@/assets/items/seeds.svg';
	import swordSvgSrc from '@/assets/items/sword.svg';
	import coinSvgSrc from '@/assets/items/coin.svg';

	const ITEM_ICONS: Record<string, string> = {
		cookie: cookieSvgSrc,
		potion: potionSvgSrc,
		seeds: seedsSvgSrc,
		sword: swordSvgSrc,
		coin: coinSvgSrc,
	};

	type Tab = 'open' | 'created' | 'accepted';
	let activeTab = $state<Tab>('open');

	interface Props {
		onCreateMission: () => void;
	}
	let { onCreateMission }: Props = $props();

	const queryClient = useQueryClient();
	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	let pendingAction = $state<string | null>(null);

	function getRoom(): Room<GameState> | null {
		return worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
	}

	function sendAction(type: string, payload: Record<string, string> = {}) {
		const room = getRoom();
		if (!room) return;
		pendingAction = type;
		room.send('client:action', { type, ...payload });
	}

	onMount(() => {
		const room = getRoom();
		if (!room) return;

		const onResult = (_msg: { success: boolean; event?: string; error?: string }) => {
			pendingAction = null;
			queryClient.invalidateQueries({ queryKey: ['missions'] });
		};

		const onEvent = (_msg: Record<string, unknown>) => {
			queryClient.invalidateQueries({ queryKey: ['missions'] });
		};

		room.onMessage('mission:result', onResult);
		room.onMessage('mission:event', onEvent);

		for (const evt of ['mission:created', 'mission:accepted', 'mission:completed', 'mission:cancelled'] as const) {
			room.onMessage(evt, () => {
				queryClient.invalidateQueries({ queryKey: ['missions'] });
			});
		}
	});

	const queryOpen = createQuery(() => ({
		queryKey: ['missions', 'open'],
		queryFn: () => getOpenMissionsService(),
		enabled: activeTab === 'open',
	}));

	const queryCreated = createQuery(() => ({
		queryKey: ['missions', 'created'],
		queryFn: () => getMyCreatedMissionsService(),
		enabled: activeTab === 'created',
	}));

	const queryAccepted = createQuery(() => ({
		queryKey: ['missions', 'accepted'],
		queryFn: () => getMyAcceptedMissionsService(),
		enabled: activeTab === 'accepted',
	}));

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			OPEN: 'text-green-400',
			IN_PROGRESS: 'text-yellow-400',
			COMPLETED: 'text-blue-400',
			CANCELLED: 'text-gray-400',
			ACTIVE: 'text-yellow-400',
			FAILED: 'text-red-400',
			ABANDONED: 'text-gray-400',
		};
		return colors[status] || 'text-gray-300';
	}
</script>

{#snippet errorHandler(_error: unknown)}
	{@const error = standarError(_error)}
	<div class="p-4 text-red-500">
		<span>Error: {error.message}</span>
	</div>
{/snippet}

{#snippet missionCard(mission: MissionResponse, actions: 'accept' | 'created' | 'accepted')}
	<div class="bg-gris-700 rounded-lg p-4 mb-3">
		<div class="flex justify-between items-start mb-2">
			<h3 class="text-lg font-semibold text-white">{mission.title}</h3>
			<span class="text-xs px-2 py-1 rounded {getStatusColor(mission.status)} bg-gris-800">
				{mission.status}
			</span>
		</div>

		<p class="text-gray-300 text-sm mb-3">{mission.description}</p>

		{#if mission.rewardItemType}
			<div class="text-sm text-amber-400 mb-2 flex items-center gap-1">
				{#if ITEM_ICONS[mission.rewardItemType]}
					<img src={ITEM_ICONS[mission.rewardItemType]} alt={mission.rewardItemType} class="h-5 w-5 inline" />
				{/if}
				Recompensa: {mission.rewardItemType} x{mission.rewardItemQty ?? 1}
			</div>
		{/if}

		<div class="text-xs text-gray-400 mb-3">
			Creador: {mission.creatorType} • {formatDate(mission.createdAt)}
		</div>

		<div class="flex gap-2">
			{#if actions === 'accept' && mission.status === 'OPEN'}
				<Button
					type="button"
					class="!h-8 !px-3 !text-sm"
					onclick={() => sendAction('accept-mission', { missionId: mission.id })}
					disabled={pendingAction === 'accept-mission'}
				>
					{pendingAction === 'accept-mission' ? 'Aceptando...' : 'Aceptar Misión'}
				</Button>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet createdMissionCard(mission: MissionWithAcceptances)}
	<div class="bg-gris-700 rounded-lg p-4 mb-3">
		<div class="flex justify-between items-start mb-2">
			<h3 class="text-lg font-semibold text-white">{mission.title}</h3>
			<span class="text-xs px-2 py-1 rounded {getStatusColor(mission.status)} bg-gris-800">
				{mission.status}
			</span>
		</div>

		<p class="text-gray-300 text-sm mb-3">{mission.description}</p>

		{#if mission.rewardItemType}
			<div class="text-sm text-amber-400 mb-2 flex items-center gap-1">
				{#if ITEM_ICONS[mission.rewardItemType]}
					<img src={ITEM_ICONS[mission.rewardItemType]} alt={mission.rewardItemType} class="h-5 w-5 inline" />
				{/if}
				Recompensa: {mission.rewardItemType} x{mission.rewardItemQty ?? 1}
			</div>
		{/if}

		{#if mission.acceptances.length > 0}
			<div class="mt-3 border-t border-gris-600 pt-3">
				<h4 class="text-sm font-semibold text-gray-300 mb-2">Aceptantes:</h4>
				{#each mission.acceptances as acceptance}
					<div class="flex justify-between items-center bg-gris-800 p-2 rounded mb-2">
						<div class="text-sm">
							<span class="text-gray-300">{acceptance.acceptorType}</span>
							<span class="text-xs text-gray-500 ml-2">{acceptance.acceptorId.slice(0, 8)}...</span>
							<span class="ml-2 {getStatusColor(acceptance.status)}">{acceptance.status}</span>
						</div>
						{#if acceptance.status === 'ACTIVE'}
							<Button
								type="button"
								class="!h-7 !px-2 !text-xs"
								onclick={() => sendAction('complete-mission', { missionId: mission.id, acceptorId: acceptance.acceptorId })}
								disabled={pendingAction === 'complete-mission'}
							>
								Completar
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-sm text-gray-500 italic">Nadie ha aceptado esta misión aún</div>
		{/if}

		{#if mission.status === 'OPEN' || mission.status === 'IN_PROGRESS'}
			<div class="mt-3 flex justify-end">
				<Button
					type="button"
					class="!h-8 !px-3 !text-sm !bg-red-600 hover:!bg-red-700"
					onclick={() => sendAction('cancel-mission', { missionId: mission.id })}
					disabled={pendingAction === 'cancel-mission'}
				>
					Cancelar Misión
				</Button>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet acceptedMissionCard(mission: MissionWithAcceptances)}
	{@const myAcceptance = mission.acceptances[0]}
	<div class="bg-gris-700 rounded-lg p-4 mb-3">
		<div class="flex justify-between items-start mb-2">
			<h3 class="text-lg font-semibold text-white">{mission.title}</h3>
			<span class="text-xs px-2 py-1 rounded {getStatusColor(myAcceptance?.status || mission.status)} bg-gris-800">
				{myAcceptance?.status || mission.status}
			</span>
		</div>

		<p class="text-gray-300 text-sm mb-3">{mission.description}</p>

		{#if mission.rewardItemType}
			<div class="text-sm text-amber-400 mb-2 flex items-center gap-1">
				{#if ITEM_ICONS[mission.rewardItemType]}
					<img src={ITEM_ICONS[mission.rewardItemType]} alt={mission.rewardItemType} class="h-5 w-5 inline" />
				{/if}
				Recompensa: {mission.rewardItemType} x{mission.rewardItemQty ?? 1}
			</div>
		{/if}

		<div class="text-xs text-gray-400 mb-3">
			Aceptada: {myAcceptance ? formatDate(myAcceptance.acceptedAt) : 'N/A'}
		</div>

		{#if myAcceptance?.status === 'ACTIVE'}
			<div class="flex gap-2">
				<Button
					type="button"
					class="!h-8 !px-3 !text-sm !bg-orange-600 hover:!bg-orange-700"
					onclick={() => sendAction('abandon-mission', { missionId: mission.id })}
					disabled={pendingAction === 'abandon-mission'}
				>
					Abandonar
				</Button>
			</div>
		{/if}
	</div>
{/snippet}

<section class="w-full max-w-4xl mx-auto p-4">
	<div class="flex justify-between items-center mb-6">
		<h1 class="font-zen-dots text-gris-50 text-2xl">Misiones</h1>
		<Button type="button" class="!h-10" onclick={onCreateMission}>
			+ Nueva Misión
		</Button>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 mb-6 border-b border-gris-600">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'open' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}"
			onclick={() => activeTab = 'open'}
		>
			Disponibles
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'created' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}"
			onclick={() => activeTab = 'created'}
		>
			Mis Misiones Creadas
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'accepted' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}"
			onclick={() => activeTab = 'accepted'}
		>
			Misiones Aceptadas
		</button>
	</div>

	<!-- Content -->
	<div class="min-h-100">
		{#if activeTab === 'open'}
			{#if queryOpen.isLoading}
				<div class="text-gray-400 text-center py-8">Cargando misiones...</div>
			{:else if queryOpen.isError}
				{@render errorHandler(queryOpen.error)}
			{:else if queryOpen.isSuccess && queryOpen.data.ok}
				{#if queryOpen.data.data.missions.length === 0}
					<div class="text-gray-500 text-center py-8">No hay misiones disponibles</div>
				{:else}
					{#each queryOpen.data.data.missions as mission}
						{@render missionCard(mission, 'accept')}
					{/each}
				{/if}
			{/if}
		{:else if activeTab === 'created'}
			{#if queryCreated.isLoading}
				<div class="text-gray-400 text-center py-8">Cargando tus misiones...</div>
			{:else if queryCreated.isError}
				{@render errorHandler(queryCreated.error)}
			{:else if queryCreated.isSuccess && queryCreated.data.ok}
				{#if queryCreated.data.data.missions.length === 0}
					<div class="text-gray-500 text-center py-8">No has creado ninguna misión</div>
				{:else}
					{#each queryCreated.data.data.missions as mission}
						{@render createdMissionCard(mission)}
					{/each}
				{/if}
			{/if}
		{:else if activeTab === 'accepted'}
			{#if queryAccepted.isLoading}
				<div class="text-gray-400 text-center py-8">Cargando misiones aceptadas...</div>
			{:else if queryAccepted.isError}
				{@render errorHandler(queryAccepted.error)}
			{:else if queryAccepted.isSuccess && queryAccepted.data.ok}
				{#if queryAccepted.data.data.missions.length === 0}
					<div class="text-gray-500 text-center py-8">No tienes misiones aceptadas</div>
				{:else}
					{#each queryAccepted.data.data.missions as mission}
						{@render acceptedMissionCard(mission)}
					{/each}
				{/if}
			{/if}
		{/if}
	</div>
</section>
