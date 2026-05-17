<svelte:options runes />

<script lang="ts">
	import type { ExperimentStateResponse } from '#/schema/experiment.schema';
	import type { OkResponse, ErrorResponse } from '#/utils/http-client.util';
	import type { AdminAssignmentResponse } from '#/schema/experiment.schema';
	import ProgressBar from './ProgressBar.svelte';

	interface Props {
		experiments: OkResponse<{ experiments: (ExperimentStateResponse | null)[] }> | ErrorResponse | undefined;
		assignments: OkResponse<{ assignments: AdminAssignmentResponse[] }> | ErrorResponse | undefined;
	}

	let { experiments, assignments }: Props = $props();

	type PlayerData = {
		userId: string;
		username: string;
		role: string;
		experimentEntries: {
			experimentKey: string;
			experimentTitle: string;
			hasProgress: boolean;
			status: string | null;
			completedPhases: number;
			totalPhases: number;
			rating: number | null;
			totalTimeMs: number;
			startedAt: string | null;
			completedAt: string | null;
			phases: ExperimentStateResponse['phases'];
		}[];
	};

	const players = $derived.by(() => {
		if (!experiments || !experiments.ok || !assignments || !assignments.ok) return [];

		const map = new Map<string, PlayerData>();

		for (const a of assignments.data.assignments) {
			if (!map.has(a.userId)) {
				map.set(a.userId, {
					userId: a.userId,
					username: a.username,
					role: a.role,
					experimentEntries: [],
				});
			}
		}

		const exps = experiments.data.experiments.filter(Boolean) as ExperimentStateResponse[];

		for (const exp of exps) {
			const userId = exp.owner?.userId;
			if (!userId) continue;

			if (!map.has(userId)) {
				map.set(userId, {
					userId,
					username: exp.owner?.username ?? '-',
					role: exp.owner?.role ?? '-',
					experimentEntries: [],
				});
			}

			const player = map.get(userId)!;

			const existingIdx = player.experimentEntries.findIndex(
				(e) => e.experimentKey === exp.experimentKey,
			);

			if (existingIdx === -1) {
				player.experimentEntries.push({
					experimentKey: exp.experimentKey,
					experimentTitle: exp.experimentTitle,
					hasProgress: true,
					status: exp.status ?? 'NOT_STARTED',
					completedPhases: exp.completedPhases,
					totalPhases: exp.totalPhases,
					rating: exp.rating,
					totalTimeMs: exp.phases.reduce((sum, p) => sum + p.totalTimeMs, 0),
					startedAt: exp.phases[0]?.mountedAt ?? null,
					completedAt: exp.phases.find((p) => p.completedAt)?.completedAt ?? null,
					phases: exp.phases,
				});
			}
		}

		for (const a of assignments.data.assignments) {
			const player = map.get(a.userId);
			if (!player) continue;

			const hasExp = player.experimentEntries.some(
				(e) => e.experimentKey === a.experimentKey,
			);

			if (!hasExp) {
				player.experimentEntries.push({
					experimentKey: a.experimentKey,
					experimentTitle: a.experimentKey,
					hasProgress: false,
					status: 'NOT_STARTED',
					completedPhases: 0,
					totalPhases: 0,
					rating: null,
					totalTimeMs: 0,
					startedAt: null,
					completedAt: null,
					phases: [],
				});
			}
		}

		return Array.from(map.values()).sort((a, b) =>
			a.username.localeCompare(b.username),
		);
	});

	const formatMs = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	};

	const statusBadge = (status: string | null): { text: string; classes: string } => {
		switch (status) {
			case 'COMPLETED':
				return { text: 'Completado', classes: 'bg-green-600/30 text-green-400 border-green-700' };
			case 'IN_PROGRESS':
				return { text: 'En progreso', classes: 'bg-blue-600/30 text-blue-400 border-blue-700' };
			case 'AWAITING_FEEDBACK':
				return { text: 'Feedback', classes: 'bg-yellow-600/30 text-yellow-400 border-yellow-700' };
			case 'NOT_STARTED':
				return { text: 'Sin iniciar', classes: 'bg-gris-600/30 text-gris-400 border-gris-700' };
			default:
				return { text: 'Sin iniciar', classes: 'bg-gris-600/30 text-gris-400 border-gris-700' };
		}
	};

	const progressBarColor = (status: string | null): string => {
		switch (status) {
			case 'COMPLETED': return 'bg-green-500';
			case 'IN_PROGRESS': return 'bg-blue-500';
			case 'AWAITING_FEEDBACK': return 'bg-yellow-500';
			default: return 'bg-gris-500';
		}
	};

	let expandedPlayer = $state<string | null>(null);
	let expandedExp = $state<string | null>(null);
</script>

{#if !experiments || !experiments.ok || !assignments || !assignments.ok}
	<div class="text-gris-500 p-8 text-center">Cargando datos...</div>
{:else if players.length === 0}
	<div class="text-gris-500 p-8 text-center">No hay jugadores asignados</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each players as player (player.userId)}
			{@const isExpanded = expandedPlayer === player.userId}
			<div class="bg-gris-750 border-gris-600 rounded-lg border">
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-gris-700/50"
					onclick={() => (expandedPlayer = expandedPlayer === player.userId ? null : player.userId)}
				>
					<div class="bg-magenta-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
						{player.username.charAt(0).toUpperCase()}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="text-gris-100 font-semibold">{player.username}</span>
							<span class="bg-gris-700 text-gris-400 rounded px-1.5 py-0.5 text-xs">{player.role}</span>
						</div>
						<div class="text-gris-400 mt-0.5 text-xs">
							{player.experimentEntries.length} experiment{player.experimentEntries.length !== 1 ? 's' : ''}
							—
							{player.experimentEntries.filter(e => e.status === 'COMPLETED').length} completado{player.experimentEntries.filter(e => e.status === 'COMPLETED').length !== 1 ? 's' : ''}
						</div>
					</div>
					<span class="text-gris-500 text-lg">{isExpanded ? '▾' : '▸'}</span>
				</button>

				{#if isExpanded}
					<div class="border-gris-600 border-t px-4 pb-4 pt-2">
						<div class="flex flex-col gap-3">
							{#each player.experimentEntries as entry (entry.experimentKey)}
								{@const expKey = `${player.userId}-${entry.experimentKey}`}
								{@const badge = statusBadge(entry.status)}
								{@const isExpExpanded = expandedExp === expKey}
								{@const barColor = progressBarColor(entry.status)}
								<div class="bg-gris-800 rounded-md p-3">
									<button
										type="button"
										class="flex w-full cursor-pointer items-start justify-between text-left"
										onclick={() => (expandedExp = expandedExp === expKey ? null : expKey)}
									>
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<span class="text-gris-200 truncate text-sm font-medium">{entry.experimentTitle}</span>
												<span class="border {badge.classes} rounded px-1.5 py-0.5 text-[10px] font-semibold">
													{badge.text}
												</span>
											</div>
											{#if entry.hasProgress && entry.totalPhases > 0}
												<div class="mt-2">
													<ProgressBar
														value={entry.completedPhases}
														max={entry.totalPhases}
														colorClass={barColor}
													/>
												</div>
												<div class="text-gris-400 mt-1 flex gap-3 text-xs">
													{#if entry.rating}
														<span>⭐ {entry.rating}/5</span>
													{/if}
													{#if entry.totalTimeMs > 0}
														<span>⏱ {formatMs(entry.totalTimeMs)}</span>
													{/if}
												</div>
											{:else}
												<div class="text-gris-500 mt-1 text-xs">Sin progreso registrado</div>
											{/if}
										</div>
										<span class="text-gris-500 ml-2 text-sm">{isExpExpanded ? '▾' : '▸'}</span>
									</button>

									{#if isExpExpanded && entry.hasProgress && entry.phases.length > 0}
										<div class="border-gris-700 mt-2 border-t pt-2">
											<div class="grid gap-1 text-xs" style="grid-template-columns: 2fr 1fr 1fr 1fr 2fr;">
												<div class="text-gris-500 font-semibold">Fase</div>
												<div class="text-gris-500 font-semibold">Estado</div>
												<div class="text-gris-500 font-semibold">Intentos</div>
												<div class="text-gris-500 font-semibold">Fallos</div>
												<div class="text-gris-500 font-semibold">Tiempo</div>
												{#each entry.phases as phase (phase.phaseKey)}
													<div class="truncate">{phase.title}</div>
													<div class="{phase.status === 'COMPLETED' ? 'text-green-400' : phase.status === 'ACTIVE' ? 'text-blue-400' : 'text-gris-500'}">
														{phase.status}
													</div>
													<div>{phase.attemptCount}</div>
													<div class={phase.failureCount > 0 ? 'text-red-400' : ''}>{phase.failureCount}</div>
													<div>{formatMs(phase.totalTimeMs)}</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}