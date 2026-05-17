<svelte:options runes />

<script lang="ts">
	import { standarError } from '#/error/standar-error';
	import type { ExperimentStateResponse, ExperimentPhaseResponse } from '#/schema/experiment.schema';

	import {
		getAllExperimentsAdminService,
		getAdminAssignmentsService,
		deleteAdminAssignmentService,
		updateAdminExperimentService,
		resetAdminExperimentProgressService,
		updateAdminPhaseService,
		deleteAdminPhaseService,
		resetAdminPhaseProgressService,
		exportAdminExcelService,
	} from '@/services/api.service';
	import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

	import ConfirmModal from './ConfirmModal.svelte';
	import EditExperimentModal from './EditExperimentModal.svelte';
	import EditPhaseModal from './EditPhaseModal.svelte';
	import PlayersView from './PlayersView.svelte';
	import DashboardView from './DashboardView.svelte';

	const queryClient = useQueryClient();

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ['adminExperimentsList'] });
		queryClient.invalidateQueries({ queryKey: ['adminAssignments'] });
	};

	let queryExperiments = createQuery(() => ({
		queryKey: ['adminExperimentsList'],
		queryFn: () => getAllExperimentsAdminService(),
		gcTime: 0,
		staleTime: 0,
	}));

	let queryAssignments = createQuery(() => ({
		queryKey: ['adminAssignments'],
		queryFn: () => getAdminAssignmentsService(),
		gcTime: 0,
		staleTime: 0,
	}));

	let activeTab = $state<'experiments' | 'assignments' | 'players' | 'dashboard'>('experiments');
	let expandedExperiment = $state<string | null>(null);
	let expandedPhase = $state<string | null>(null);

	let showConfirmModal = $state(false);
	let confirmTitle = $state('');
	let confirmMessage = $state('');
	let confirmAction = $state<(() => void) | null>(null);

	let showEditExperimentModal = $state(false);
	let editingExperiment = $state<ExperimentStateResponse | null>(null);

	let showEditPhaseModal = $state(false);
	let editingPhase = $state<ExperimentPhaseResponse | null>(null);

	const openConfirm = (title: string, message: string, action: () => void) => {
		confirmTitle = title;
		confirmMessage = message;
		confirmAction = action;
		showConfirmModal = true;
	};

	const toggleExperiment = (key: string) => {
		expandedPhase = null;
		expandedExperiment = expandedExperiment === key ? null : key;
	};

	const togglePhase = (key: string) => {
		expandedPhase = expandedPhase === key ? null : key;
	};

	const formatMs = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	const formatDate = (date: string | Date | null): string => {
		if (!date) return '-';
		return new Date(date).toLocaleString();
	};

	const statusColor = (status: string | null): string => {
		switch (status) {
			case 'COMPLETED': return 'text-green-400';
			case 'IN_PROGRESS':
			case 'ACTIVE': return 'text-blue-400';
			case 'AWAITING_FEEDBACK': return 'text-yellow-400';
			case 'FAILED':
			case 'ABORTED': return 'text-red-400';
			case 'PENDING': return 'text-gris-400';
			default: return 'text-gris-400';
		}
	};

	// ── Mutations ──

	const deleteAssignmentMutation = createMutation(() => ({
		mutationFn: (id: string) => deleteAdminAssignmentService(id),
		onSuccess: () => { invalidateAll(); showConfirmModal = false; },
	}));

	const updateExperimentMutation = createMutation(() => ({
		mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
			updateAdminExperimentService(id, data),
		onSuccess: () => { invalidateAll(); showEditExperimentModal = false; },
	}));

	const resetExperimentProgressMutation = createMutation(() => ({
		mutationFn: (id: string) => resetAdminExperimentProgressService(id),
		onSuccess: () => { invalidateAll(); showConfirmModal = false; },
	}));

	const updatePhaseMutation = createMutation(() => ({
		mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
			updateAdminPhaseService(id, data),
		onSuccess: () => { invalidateAll(); showEditPhaseModal = false; },
	}));

	const deletePhaseMutation = createMutation(() => ({
		mutationFn: (id: string) => deleteAdminPhaseService(id),
		onSuccess: () => { invalidateAll(); showConfirmModal = false; },
	}));

	const resetPhaseProgressMutation = createMutation(() => ({
		mutationFn: (id: string) => resetAdminPhaseProgressService(id),
		onSuccess: () => { invalidateAll(); showConfirmModal = false; },
	}));

	const exportExcelMutation = createMutation(() => ({
		mutationFn: () => exportAdminExcelService(),
		onSuccess: (result) => {
			if (result.ok && result.data?.url) {
				window.open(result.data.url, '_blank');
			}
		},
	}));
</script>

{#snippet errorHandler(_error: unknown)}
	{@const error = standarError(_error)}
	<div class="border-b border-gray-700 p-2 text-left text-nowrap text-red-500">
		<span>Error: {error.message}</span>
		{#each Object.keys(error.errors) as key}
			<div class="text-red-500">{key}: {error.errors[key].join(', ')}</div>
		{/each}
	</div>
{/snippet}

{#snippet tableHeader(name: string)}
	<div class="border-gris-700 border-b p-2 text-left font-semibold">{name}</div>
{/snippet}

{#snippet actionBtn(label: string, colorClass: string, onclick: () => void, disabled?: boolean)}
	<button
		type="button"
		class="{colorClass} cursor-pointer rounded-sm px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		{disabled}
		{onclick}
	>
		{label}
	</button>
{/snippet}

<ConfirmModal
	bind:open={showConfirmModal}
	title={confirmTitle}
	message={confirmMessage}
	confirmLabel="Eliminar"
	variant="danger"
	onconfirm={() => confirmAction?.()}
	oncancel={() => (showConfirmModal = false)}
/>

<EditExperimentModal
	bind:open={showEditExperimentModal}
	experiment={editingExperiment}
	onsave={(id, data) => updateExperimentMutation.mutate({ id, data })}
	oncancel={() => (showEditExperimentModal = false)}
/>

<EditPhaseModal
	bind:open={showEditPhaseModal}
	phase={editingPhase}
	onsave={(id, data) => updatePhaseMutation.mutate({ id, data })}
	oncancel={() => (showEditPhaseModal = false)}
/>

<section
	class="flex h-full w-full flex-col items-center justify-center px-8 py-4 lg:px-10 xl:px-30 2xl:px-0"
>
	<div
		class="bg-gris-800 flex w-full flex-col gap-4 rounded-[12px] shadow-lg max-xl:h-full max-sm:justify-center md:gap-6 2xl:w-[1200px]"
	>
		<div class="flex w-full flex-col justify-center gap-4 px-4 py-10 max-md:py-4 max-sm:gap-2">
			<div class="flex items-center justify-between">
				<h1 class="font-zen-dots text-gris-50 text-xl">Admin Experimentos</h1>
				<button
					type="button"
					class="bg-green-700 hover:bg-green-600 cursor-pointer rounded-sm px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					disabled={exportExcelMutation.isPending}
					onclick={() => exportExcelMutation.mutate()}
				>
					{exportExcelMutation.isPending ? 'Generando...' : 'Exportar Excel'}
				</button>
			</div>

			<!-- ── Tabs ── -->
			<div class="flex gap-2 border-b border-gris-700">
				<button
					type="button"
					class="cursor-pointer px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'experiments' ? 'text-magenta-400 border-b-2 border-magenta-400' : 'text-gris-400 hover:text-gris-200'}"
					onclick={() => (activeTab = 'experiments')}
				>
					Progreso
				</button>
				<button
					type="button"
					class="cursor-pointer px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'assignments' ? 'text-magenta-400 border-b-2 border-magenta-400' : 'text-gris-400 hover:text-gris-200'}"
					onclick={() => (activeTab = 'assignments')}
				>
					Asignaciones
				</button>
				<button
					type="button"
					class="cursor-pointer px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'players' ? 'text-magenta-400 border-b-2 border-magenta-400' : 'text-gris-400 hover:text-gris-200'}"
					onclick={() => (activeTab = 'players')}
				>
					Jugadores
				</button>
				<button
					type="button"
					class="cursor-pointer px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'dashboard' ? 'text-magenta-400 border-b-2 border-magenta-400' : 'text-gris-400 hover:text-gris-200'}"
					onclick={() => (activeTab = 'dashboard')}
				>
					Estadísticas
				</button>
			</div>

			<!-- ── Assignments Tab ── -->
			{#if activeTab === 'assignments'}
				{#if queryAssignments.isLoading}
					<div class="text-gris-400 p-8 text-center">Loading...</div>
				{:else if queryAssignments.isError}
					{@render errorHandler(queryAssignments.error)}
				{:else if queryAssignments.isSuccess && queryAssignments.data.ok}
					{@const assignments = queryAssignments.data.data.assignments}
					{#if assignments.length === 0}
						<div class="text-gris-500 p-8 text-center">No hay asignaciones</div>
					{:else}
						<div class="w-full overflow-x-auto">
							<div class="grid w-full min-w-[800px] text-sm" style="grid-template-columns: 5% 18% 18% 20% 10% 12% 17%;">
								{#each ['#', 'User ID', 'Username', 'Experimento', 'Rol', 'Activo', 'Acciones'] as header}
									{@render tableHeader(header)}
								{/each}
								{#each assignments as assignment, i (assignment.id)}
									<div class="border-gris-700 truncate border-b p-2 text-xs">{i + 1}</div>
									<div class="border-gris-700 truncate border-b p-2 text-xs" title={assignment.userId}>{assignment.userId.slice(0, 8)}...</div>
									<div class="border-gris-700 truncate border-b p-2 text-xs">{assignment.username}</div>
									<div class="border-gris-700 truncate border-b p-2 text-xs">{assignment.experimentKey}</div>
									<div class="border-gris-700 border-b p-2 text-xs">{assignment.role}</div>
									<div class="border-gris-700 border-b p-2 text-xs">
										{#if assignment.enabled}<span class="text-green-400">Si</span>{:else}<span class="text-red-400">No</span>{/if}
									</div>
									<div class="border-gris-700 border-b p-2">
										{@render actionBtn('Eliminar', 'bg-red-700 hover:bg-red-600 text-white', () => openConfirm(
											'Eliminar Asignacion',
											`Eliminar asignacion de ${assignment.username} a ${assignment.experimentKey}?`,
											() => deleteAssignmentMutation.mutate(assignment.id),
										))}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			{/if}

			<!-- ── Experiments Tab ── -->
			{#if activeTab === 'experiments'}
				{#if queryExperiments.isLoading}
					<div class="text-gris-400 p-8 text-center">Loading...</div>
				{:else if queryExperiments.isError}
					{@render errorHandler(queryExperiments.error)}
				{:else if queryExperiments.isSuccess && queryExperiments.data.ok}
					{@const experiments = queryExperiments.data.data.experiments.filter(Boolean) as ExperimentStateResponse[]}
					{#if experiments.length === 0}
						<div class="text-gris-500 p-8 text-center">No hay experimentos registrados</div>
					{:else}
						<div class="w-full overflow-x-auto">
							<div class="grid w-full min-w-[1100px] text-sm" style="grid-template-columns: 15% 17% 11% 11% 8% 8% 12% 12% 6%;">
								{#each ['Usuario', 'Experimento', 'Estado', 'Progreso', 'Rating', 'Fases', 'Inicio', 'Fin', 'Acciones'] as header}
									{@render tableHeader(header)}
								{/each}
								{#each experiments as experiment (experiment.experimentKey + (experiment.owner?.userId ?? ''))}
									{@const expKey = `${experiment.owner?.userId}-${experiment.experimentKey}`}
									{@const isExpanded = expandedExperiment === expKey}
									<button type="button"
										class="border-gris-700 col-span-full grid cursor-pointer border-b transition-colors hover:bg-gris-700/30 {isExpanded ? 'bg-gris-700/20' : ''}"
										style="grid-template-columns: 15% 17% 11% 11% 8% 8% 12% 12% 6%;"
										onclick={() => toggleExperiment(expKey)}
									>
										<div class="border-gris-700 truncate border-r p-2 text-left">
											{experiment.owner?.username ?? '-'}
											<span class="text-gris-500 text-xs">({experiment.owner?.role ?? '-'})</span>
										</div>
										<div class="border-gris-700 truncate border-r p-2 text-left">{experiment.experimentTitle}</div>
										<div class="border-gris-700 border-r p-2 text-left {statusColor(experiment.status)}">{experiment.status ?? 'NOT_STARTED'}</div>
										<div class="border-gris-700 border-r p-2 text-left">{experiment.completedPhases}/{experiment.totalPhases}</div>
										<div class="border-gris-700 border-r p-2 text-left">{experiment.rating ? `${experiment.rating}/5` : '-'}</div>
										<div class="border-gris-700 border-r p-2 text-left text-xs">{experiment.phases.filter(p => p.status === 'COMPLETED').length}/{experiment.totalPhases}</div>
										<div class="border-gris-700 truncate border-r p-2 text-left text-xs">{formatDate(experiment.phases[0]?.mountedAt ?? null)}</div>
										<div class="border-gris-700 truncate border-r p-2 text-left text-xs">{formatDate(experiment.phases.find(p => p.completedAt)?.completedAt ?? null)}</div>
										<div class="flex items-center gap-1 p-1">
											{@render actionBtn('E', 'bg-blue-700 hover:bg-blue-600 text-white', () => {
												editingExperiment = experiment;
												showEditExperimentModal = true;
											})}
										</div>
									</button>

									{#if isExpanded}
										<div class="border-gris-600 bg-gris-850 col-span-full border-b px-4 py-3">
											<div class="mb-2 flex items-center justify-between">
												<h3 class="text-gris-200 text-sm font-semibold">Fases de {experiment.experimentTitle}</h3>
												<div class="flex items-center gap-2">
													{#if experiment.comment}
														<div class="text-gris-400 max-w-md truncate text-xs">Comentario: {experiment.comment}</div>
													{/if}
													{@render actionBtn('Reset Progreso', 'bg-yellow-700 hover:bg-yellow-600 text-white', () => openConfirm(
														'Reset Experimento',
														`Borrar todo el progreso del experimento de ${experiment.owner?.username}? Se eliminaran todos los intentos y se reiniciaran las fases.`,
														() => resetExperimentProgressMutation.mutate(experiment.id),
													))}
												</div>
											</div>

											<div class="rounded-md border border-gris-600">
												<div class="grid text-xs font-semibold" style="grid-template-columns: 6% 16% 10% 10% 8% 10% 14% 14% 22%;">
													<div class="border-gris-700 border-r border-b p-2">#</div>
													<div class="border-gris-700 border-r border-b p-2">Fase</div>
													<div class="border-gris-700 border-r border-b p-2">Estado</div>
													<div class="border-gris-700 border-r border-b p-2">Intentos</div>
													<div class="border-gris-700 border-r border-b p-2">Fallos</div>
													<div class="border-gris-700 border-r border-b p-2">Tiempo</div>
													<div class="border-gris-700 border-r border-b p-2">Montado</div>
													<div class="border-gris-700 border-r border-b p-2">Completado</div>
													<div class="border-gris-700 border-b p-2">Acciones</div>
												</div>

												{#each experiment.phases as phase (phase.phaseKey)}
													{@const isPhaseExpanded = expandedPhase === phase.phaseKey}
													<button type="button"
														class="grid w-full cursor-pointer text-left transition-colors hover:bg-gris-700/30 {isPhaseExpanded ? 'bg-gris-700/20' : ''}"
														style="grid-template-columns: 6% 16% 10% 10% 8% 10% 14% 14% 22%;"
														onclick={() => togglePhase(phase.phaseKey)}
													>
														<div class="border-gris-700/50 border-r border-b p-2">{phase.phaseIndex}</div>
														<div class="border-gris-700/50 truncate border-r border-b p-2">{phase.title}</div>
														<div class="border-gris-700/50 border-r border-b p-2 {statusColor(phase.status)}">{phase.status}</div>
														<div class="border-gris-700/50 border-r border-b p-2">{phase.attemptCount}</div>
														<div class="border-gris-700/50 border-r border-b p-2 {phase.failureCount > 0 ? 'text-red-400' : ''}">{phase.failureCount}</div>
														<div class="border-gris-700/50 border-r border-b p-2">{formatMs(phase.totalTimeMs)}</div>
														<div class="border-gris-700/50 border-r border-b p-2 text-xs">{formatDate(phase.mountedAt)}</div>
														<div class="border-gris-700/50 border-r border-b p-2 text-xs">{formatDate(phase.completedAt)}</div>
														<div class="border-gris-700/50 flex flex-wrap items-center gap-1 border-b p-1 text-xs">
															{@render actionBtn('E', 'bg-blue-700 hover:bg-blue-600 text-white', () => {
																editingPhase = phase;
																showEditPhaseModal = true;
															})}
															{@render actionBtn('Reset', 'bg-yellow-700 hover:bg-yellow-600 text-white', () => openConfirm(
																'Reset Fase',
																`Borrar intentos y resetear la fase "${phase.title}"?`,
																() => resetPhaseProgressMutation.mutate(phase.id),
															))}
															{@render actionBtn('X Fase', 'bg-red-700 hover:bg-red-600 text-white', () => openConfirm(
																'Eliminar Fase',
																`Eliminar la fase "${phase.title}" completamente? Se eliminaran todos los intentos y se reindexaran las fases restantes.`,
																() => deletePhaseMutation.mutate(phase.id),
															))}
														</div>
													</button>

													{#if isPhaseExpanded && phase.attempts.length > 0}
														<div class="bg-gris-900 col-span-full px-6 py-2">
															<div class="grid rounded-t-md bg-gris-800 text-xs font-semibold" style="grid-template-columns: 10% 15% 15% 20% 20% 20%;">
																<div class="border-gris-700 border-r border-b p-2">Intento</div>
																<div class="border-gris-700 border-r border-b p-2">Estado</div>
																<div class="border-gris-700 border-r border-b p-2">Fallos</div>
																<div class="border-gris-700 border-r border-b p-2">Tiempo</div>
																<div class="border-gris-700 border-r border-b p-2">Inicio</div>
																<div class="border-gris-700 border-b p-2">Fin</div>
															</div>
															{#each phase.attempts as attempt (attempt.attemptNumber)}
																<div class="col-span-full grid border-b border-gris-700/50 bg-gris-850" style="grid-template-columns: 10% 15% 15% 20% 20% 20%;">
																	<div class="border-gris-700/30 border-r p-2 text-xs">#{attempt.attemptNumber}</div>
																	<div class="border-gris-700/30 border-r p-2 text-xs {statusColor(attempt.status)}">{attempt.status}</div>
																	<div class="border-gris-700/30 border-r p-2 text-xs">{attempt.failureCount}</div>
																	<div class="border-gris-700/30 border-r p-2 text-xs">{formatMs(attempt.elapsedMs)}</div>
																	<div class="border-gris-700/30 border-r p-2 text-xs">{formatDate(attempt.startedAt)}</div>
																	<div class="p-2 text-xs">{formatDate(attempt.endedAt)}</div>
																</div>
															{/each}
														</div>
													{/if}

													{#if isPhaseExpanded && phase.attempts.length === 0}
														<div class="bg-gris-900 col-span-full px-6 py-2">
															<div class="text-gris-500 p-2 text-xs">Sin intentos registrados</div>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			{/if}

			<!-- ── Players Tab ── -->
			{#if activeTab === 'players'}
				<PlayersView experiments={queryExperiments.data ?? undefined} assignments={queryAssignments.data ?? undefined} />
			{/if}

			<!-- ── Dashboard Tab ── -->
			{#if activeTab === 'dashboard'}
				<DashboardView experiments={queryExperiments.data ?? undefined} assignments={queryAssignments.data ?? undefined} />
			{/if}
		</div>
	</div>
</section>