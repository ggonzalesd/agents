<svelte:options runes />

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
	import type { CreateMissionInput } from '#/schema/mission.schema';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';

	type Tab = 'open' | 'created' | 'accepted';
	type View = 'list' | 'create';

	let activeTab = $state<Tab>('open');
	let currentView = $state<View>('list');
	let pendingAction = $state<string | null>(null);

	const queryClient = useQueryClient();
	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

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

		room.onMessage('mission:result', (msg: { success: boolean; event?: string; error?: string }) => {
			pendingAction = null;
			if (msg.success) {
				queryClient.invalidateQueries({ queryKey: ['missions'] });
				if (msg.event === 'mission:created') {
					currentView = 'list';
					form.title = '';
					form.description = '';
					form.reward = null;
				}
			} else {
				formError = msg.error ?? 'Error en la acción';
			}
		});

		room.onMessage('mission:event', () => {
			queryClient.invalidateQueries({ queryKey: ['missions'] });
		});

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

	const form = $state<CreateMissionInput>({
		title: '',
		description: '',
		reward: null,
	});
	let formError = $state<string | null>(null);

	function handleSubmit(e: Event) {
		e.preventDefault();
		formError = null;
		if (form.title.length < 3) {
			formError = 'El título debe tener al menos 3 caracteres';
			return;
		}
		if (form.description.length < 10) {
			formError = 'La descripción debe tener al menos 10 caracteres';
			return;
		}
		sendAction('create-mission', {
			title: form.title,
			description: form.description,
			...(form.reward ? { reward: form.reward } : {}),
		});
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}

	function getStatusBadge(status: string): string {
		const colors: Record<string, string> = {
			OPEN: 'bg-green-600',
			IN_PROGRESS: 'bg-yellow-600',
			COMPLETED: 'bg-blue-600',
			CANCELLED: 'bg-gray-600',
			ACTIVE: 'bg-yellow-600',
			FAILED: 'bg-red-600',
			ABANDONED: 'bg-gray-600',
		};
		return colors[status] || 'bg-gray-600';
	}
</script>

{#snippet errorSnippet(_error: unknown)}
	{@const error = standarError(_error)}
	<div class="p-4 text-red-400 text-sm">Error: {error.message}</div>
{/snippet}

{#snippet missionCard(mission: MissionResponse)}
	<div class="bg-zinc-700 rounded p-3 mb-2">
		<div class="flex justify-between items-start mb-1">
			<span class="font-medium text-sm">{mission.title}</span>
			<span class="text-xs px-2 py-0.5 rounded {getStatusBadge(mission.status)}">{mission.status}</span>
		</div>
		<p class="text-gray-300 text-xs mb-2">{mission.description}</p>
		{#if mission.reward}
			<div class="text-xs text-amber-400 mb-2">🏆 {mission.reward}</div>
		{/if}
		{#if mission.status === 'OPEN'}
			<Button type="button" class="h-7 px-2 text-xs" onclick={() => sendAction('accept-mission', { missionId: mission.id })} disabled={pendingAction === 'accept-mission'}>
				{pendingAction === 'accept-mission' ? 'Aceptando...' : 'Aceptar'}
			</Button>
		{/if}
	</div>
{/snippet}

{#snippet createdCard(mission: MissionWithAcceptances)}
	<div class="bg-zinc-700 rounded p-3 mb-2">
		<div class="flex justify-between items-start mb-1">
			<span class="font-medium text-sm">{mission.title}</span>
			<span class="text-xs px-2 py-0.5 rounded {getStatusBadge(mission.status)}">{mission.status}</span>
		</div>
		<p class="text-gray-300 text-xs mb-2">{mission.description}</p>
		{#if mission.acceptances.length > 0}
			<div class="mt-2 border-t border-zinc-600 pt-2">
				<div class="text-xs text-gray-400 mb-1">Aceptantes:</div>
				{#each mission.acceptances as acceptance}
					<div class="flex justify-between items-center bg-zinc-800 p-2 rounded mb-1">
						<div class="text-xs">
							<span class="text-gray-300">{acceptance.acceptorType}</span>
							<span class="text-gray-500 ml-1">{acceptance.acceptorId.slice(0, 8)}...</span>
							<span class="ml-1 {acceptance.status === 'ACTIVE' ? 'text-yellow-400' : acceptance.status === 'COMPLETED' ? 'text-blue-400' : 'text-gray-400'}">{acceptance.status}</span>
						</div>
						{#if acceptance.status === 'ACTIVE'}
							<Button
								type="button"
								class="h-6 px-2 text-xs"
								onclick={() => sendAction('complete-mission', { missionId: mission.id, acceptorId: acceptance.acceptorId })}
								disabled={pendingAction === 'complete-mission'}
							>
								{pendingAction === 'complete-mission' ? '...' : 'Completar'}
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-xs text-gray-500 italic">Sin aceptantes aún</div>
		{/if}
		{#if mission.status === 'OPEN' || mission.status === 'IN_PROGRESS'}
			<div class="mt-2 flex justify-end">
				<Button type="button" class="h-6 px-2 text-xs bg-red-600 hover:bg-red-700" onclick={() => sendAction('cancel-mission', { missionId: mission.id })} disabled={pendingAction === 'cancel-mission'}>
					Cancelar
				</Button>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet acceptedCard(mission: MissionWithAcceptances)}
	{@const myAcceptance = mission.acceptances[0]}
	<div class="bg-zinc-700 rounded p-3 mb-2">
		<div class="flex justify-between items-start mb-1">
			<span class="font-medium text-sm">{mission.title}</span>
			<span class="text-xs px-2 py-0.5 rounded {getStatusBadge(myAcceptance?.status || 'ACTIVE')}">{myAcceptance?.status || 'N/A'}</span>
		</div>
		<p class="text-gray-300 text-xs mb-2">{mission.description}</p>
		{#if myAcceptance?.status === 'ACTIVE'}
			<Button type="button" class="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700" onclick={() => sendAction('abandon-mission', { missionId: mission.id })} disabled={pendingAction === 'abandon-mission'}>
				{pendingAction === 'abandon-mission' ? 'Abandonando...' : 'Abandonar'}
			</Button>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-3 rounded-lg p-4 text-white" style="background-color: #27272a; width: 500px; max-height: 80vh;">
	<h1 class="font-zen-dots text-center text-xl">MISIONES</h1>

	{#if currentView === 'list'}
		<div class="flex gap-1 border-b border-zinc-600 pb-2">
			<button
				class="px-3 py-1 text-xs font-medium rounded {activeTab === 'open' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}"
				onclick={() => activeTab = 'open'}
			>Disponibles</button>
			<button
				class="px-3 py-1 text-xs font-medium rounded {activeTab === 'created' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}"
				onclick={() => activeTab = 'created'}
			>Creadas</button>
			<button
				class="px-3 py-1 text-xs font-medium rounded {activeTab === 'accepted' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}"
				onclick={() => activeTab = 'accepted'}
			>Aceptadas</button>
			<div class="flex-1"></div>
			<Button type="button" class="h-7 px-2 text-xs" onclick={() => currentView = 'create'}>+ Nueva</Button>
		</div>

		<div class="overflow-y-auto max-h-96 pr-1">
			{#if activeTab === 'open'}
				{#if queryOpen.isLoading}
					<div class="text-gray-400 text-center py-4 text-sm">Cargando...</div>
				{:else if queryOpen.isError}
					{@render errorSnippet(queryOpen.error)}
				{:else if queryOpen.isSuccess && queryOpen.data.ok}
					{#if queryOpen.data.data.missions.length === 0}
						<div class="text-gray-500 text-center py-4 text-sm">No hay misiones</div>
					{:else}
						{#each queryOpen.data.data.missions as mission}
							{@render missionCard(mission)}
						{/each}
					{/if}
				{/if}
			{:else if activeTab === 'created'}
				{#if queryCreated.isLoading}
					<div class="text-gray-400 text-center py-4 text-sm">Cargando...</div>
				{:else if queryCreated.isError}
					{@render errorSnippet(queryCreated.error)}
				{:else if queryCreated.isSuccess && queryCreated.data.ok}
					{#if queryCreated.data.data.missions.length === 0}
						<div class="text-gray-500 text-center py-4 text-sm">No has creado misiones</div>
					{:else}
						{#each queryCreated.data.data.missions as mission}
							{@render createdCard(mission)}
						{/each}
					{/if}
				{/if}
			{:else if activeTab === 'accepted'}
				{#if queryAccepted.isLoading}
					<div class="text-gray-400 text-center py-4 text-sm">Cargando...</div>
				{:else if queryAccepted.isError}
					{@render errorSnippet(queryAccepted.error)}
				{:else if queryAccepted.isSuccess && queryAccepted.data.ok}
					{#if queryAccepted.data.data.missions.length === 0}
						<div class="text-gray-500 text-center py-4 text-sm">No tienes misiones aceptadas</div>
					{:else}
						{#each queryAccepted.data.data.missions as mission}
							{@render acceptedCard(mission)}
						{/each}
					{/if}
				{/if}
			{/if}
		</div>
	{:else}
		<div class="flex items-center gap-2 mb-2">
			<button class="text-gray-400 hover:text-white text-sm" onclick={() => currentView = 'list'}>← Volver</button>
			<span class="text-sm">Nueva Misión</span>
		</div>

		<form onsubmit={handleSubmit} class="flex flex-col gap-3">
			<div>
				<label class="block text-xs text-gray-400 mb-1" for="title">Título *</label>
				<input id="title" type="text" placeholder="Título de la misión" bind:value={form.title}
					class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
			</div>
			<div>
				<label class="block text-xs text-gray-400 mb-1" for="description">Descripción *</label>
				<textarea id="description" placeholder="Descripción..." bind:value={form.description}
					class="w-full h-24 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"></textarea>
			</div>
			<div>
				<label class="block text-xs text-gray-400 mb-1" for="reward">Recompensa</label>
				<input id="reward" type="text" placeholder="Opcional" value={form.reward ?? ''}
					onchange={(e) => form.reward = e.currentTarget.value || null}
					class="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
			</div>
			{#if formError}
				<div class="bg-red-900/50 border border-red-600 rounded p-2 text-red-400 text-xs">{formError}</div>
			{/if}
			<div class="flex justify-end gap-2">
				<Button type="button" class="h-8 px-3 text-sm bg-zinc-600 hover:bg-zinc-500" onclick={() => currentView = 'list'}>Cancelar</Button>
				<Button type="submit" class="h-8 px-3 text-sm" disabled={pendingAction === 'create-mission'}>
					{pendingAction === 'create-mission' ? 'Creando...' : 'Crear'}
				</Button>
			</div>
		</form>
	{/if}
</div>
