<svelte:options runes />

<script lang="ts">
	import { Chart, registerables } from 'chart.js';
	import type { ExperimentStateResponse } from '#/schema/experiment.schema';
	import type { AdminAssignmentResponse } from '#/schema/experiment.schema';

	Chart.register(...registerables);

	interface Props {
		experiments: { ok: boolean; data?: { experiments: (ExperimentStateResponse | null)[] } } | undefined;
		assignments: { ok: boolean; data?: { assignments: AdminAssignmentResponse[] } } | undefined;
	}

	let { experiments, assignments }: Props = $props();

	const CHART_COLORS = [
		'rgba(236, 72, 153, 0.85)',
		'rgba(59, 130, 246, 0.85)',
		'rgba(34, 197, 94, 0.85)',
		'rgba(234, 179, 8, 0.85)',
		'rgba(168, 85, 247, 0.85)',
		'rgba(239, 68, 68, 0.85)',
		'rgba(20, 184, 166, 0.85)',
		'rgba(249, 115, 22, 0.85)',
	];

	const LIGHT_COLORS = [
		'rgba(236, 72, 153, 0.2)',
		'rgba(59, 130, 246, 0.2)',
		'rgba(34, 197, 94, 0.2)',
		'rgba(234, 179, 8, 0.2)',
		'rgba(168, 85, 247, 0.2)',
		'rgba(239, 68, 68, 0.2)',
		'rgba(20, 184, 166, 0.2)',
		'rgba(249, 115, 22, 0.2)',
	];

	const exps = $derived(
		experiments && experiments.ok && experiments.data
			? (experiments.data.experiments.filter(Boolean) as ExperimentStateResponse[])
			: [],
	);

	const byExperimentKey = $derived.by(() => {
		const map = new Map<string, ExperimentStateResponse[]>();
		for (const e of exps) {
			const arr = map.get(e.experimentKey) ?? [];
			arr.push(e);
			map.set(e.experimentKey, arr);
		}
		return map;
	});

	const experimentKeys = $derived(Array.from(byExperimentKey.keys()).sort());

	const CHART_DEFAULTS = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { labels: { color: '#9ca3af', font: { size: 12 } } },
		},
		scales: {
			x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
			y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
		},
	};

	// ── Time per experiment ──
	const avgTimePerExperiment = $derived.by(() => {
		const labels: string[] = [];
		const data: number[] = [];
		for (const key of experimentKeys) {
			const entries = byExperimentKey.get(key) ?? [];
			const completedPhases = entries.flatMap((e) => e.phases.filter((p) => p.status === 'COMPLETED'));
			const avgMs = completedPhases.length > 0
				? completedPhases.reduce((s, p) => s + p.totalTimeMs, 0) / completedPhases.length
				: 0;
			labels.push(entries[0]?.experimentTitle ?? key);
			data.push(Math.round(avgMs / 1000));
		}
		return { labels, data };
	});

	let timeChartCanvas: HTMLCanvasElement;
	let timeChartInstance: Chart | null = null;

	$effect(() => {
		if (!timeChartCanvas) return;
		if (timeChartInstance) timeChartInstance.destroy();

		timeChartInstance = new Chart(timeChartCanvas, {
			type: 'bar',
			data: {
				labels: avgTimePerExperiment.labels,
				datasets: [{
					label: 'Tiempo promedio por fase (segundos)',
					data: avgTimePerExperiment.data,
					backgroundColor: CHART_COLORS.slice(0, experimentKeys.length),
					borderColor: CHART_COLORS.slice(0, experimentKeys.length),
					borderWidth: 1,
					borderRadius: 4,
				}],
			},
			options: {
				...CHART_DEFAULTS,
				plugins: {
					...CHART_DEFAULTS.plugins,
					legend: { display: false },
				},
			},
		});

		return () => { timeChartInstance?.destroy(); };
	});

	// ── Rating per experiment ──
	const avgRatingPerExperiment = $derived.by(() => {
		const labels: string[] = [];
		const data: number[] = [];
		for (const key of experimentKeys) {
			const entries = byExperimentKey.get(key) ?? [];
			const withRating = entries.filter((e) => e.rating !== null && e.rating !== undefined);
			const avg = withRating.length > 0
				? withRating.reduce((s, e) => s + (e.rating ?? 0), 0) / withRating.length
				: 0;
			labels.push(entries[0]?.experimentTitle ?? key);
			data.push(Math.round(avg * 10) / 10);
		}
		return { labels, data };
	});

	let ratingChartCanvas: HTMLCanvasElement;
	let ratingChartInstance: Chart | null = null;

	$effect(() => {
		if (!ratingChartCanvas) return;
		if (ratingChartInstance) ratingChartInstance.destroy();

		ratingChartInstance = new Chart(ratingChartCanvas, {
			type: 'bar',
			data: {
				labels: avgRatingPerExperiment.labels,
				datasets: [{
					label: 'Rating promedio (1-5)',
					data: avgRatingPerExperiment.data,
					backgroundColor: CHART_COLORS.slice(0, experimentKeys.length),
					borderColor: CHART_COLORS.slice(0, experimentKeys.length),
					borderWidth: 1,
					borderRadius: 4,
				}],
			},
			options: {
				...CHART_DEFAULTS,
				scales: {
					...CHART_DEFAULTS.scales,
					y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 5 },
				},
				plugins: {
					...CHART_DEFAULTS.plugins,
					legend: { display: false },
				},
			},
		});

		return () => { ratingChartInstance?.destroy(); };
	});

	// ── Progress per player (horizontal stacked bar) ──
	// Includes assigned players with NO progress (shows as 0 completadas, fases totales pendientes)
	const progressPerPlayer = $derived.by(() => {
		const playerMap = new Map<string, { username: string; completed: number; pending: number }>();
		for (const e of exps) {
			const name = e.owner?.username ?? 'Unknown';
			if (!playerMap.has(name)) {
				playerMap.set(name, { username: name, completed: 0, pending: 0 });
			}
			const entry = playerMap.get(name)!;
			entry.completed += e.completedPhases;
			entry.pending += e.totalPhases - e.completedPhases;
		}

		// Add assigned players without any progress
		const allAssignments = (assignments && assignments.ok && assignments.data)
			? assignments.data.assignments
			: [];
		for (const a of allAssignments) {
			if (!playerMap.has(a.username)) {
				playerMap.set(a.username, { username: a.username, completed: 0, pending: 0 });
			}
		}

		return Array.from(playerMap.values()).sort((a, b) => b.completed - a.completed);
	});

	let progressChartCanvas: HTMLCanvasElement;
	let progressChartInstance: Chart | null = null;

	$effect(() => {
		if (!progressChartCanvas) return;
		if (progressChartInstance) progressChartInstance.destroy();

		progressChartInstance = new Chart(progressChartCanvas, {
			type: 'bar',
			data: {
				labels: progressPerPlayer.map((p) => p.username),
				datasets: [
					{
						label: 'Fases completadas',
						data: progressPerPlayer.map((p) => p.completed),
						backgroundColor: 'rgba(34, 197, 94, 0.8)',
						borderColor: 'rgba(34, 197, 94, 1)',
						borderWidth: 1,
						borderRadius: 2,
					},
					{
						label: 'Fases pendientes',
						data: progressPerPlayer.map((p) => p.pending),
						backgroundColor: 'rgba(107, 114, 128, 0.5)',
						borderColor: 'rgba(107, 114, 128, 0.8)',
						borderWidth: 1,
						borderRadius: 2,
					},
				],
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { labels: { color: '#9ca3af', font: { size: 12 } } },
				},
				scales: {
					x: {
						stacked: true,
						ticks: { color: '#9ca3af' },
						grid: { color: 'rgba(156, 163, 175, 0.1)' },
					},
					y: {
						stacked: true,
						ticks: { color: '#9ca3af' },
						grid: { color: 'rgba(156, 163, 175, 0.1)' },
					},
				},
			},
		});

		return () => { progressChartInstance?.destroy(); };
	});
</script>

{#if exps.length === 0}
	<div class="text-gris-500 p-8 text-center">No hay datos de experimentos</div>
{:else}
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Time per experiment -->
		<div class="bg-gris-750 border-gris-600 rounded-lg border p-4">
			<h3 class="text-gris-200 mb-3 text-sm font-semibold">Tiempo promedio por fase (segundos)</h3>
			<div class="h-64">
				<canvas bind:this={timeChartCanvas}></canvas>
			</div>
		</div>

		<!-- Rating per experiment -->
		<div class="bg-gris-750 border-gris-600 rounded-lg border p-4">
			<h3 class="text-gris-200 mb-3 text-sm font-semibold">Rating promedio por experimento</h3>
			<div class="h-64">
				<canvas bind:this={ratingChartCanvas}></canvas>
			</div>
		</div>

		<!-- Progress per player (full width) -->
		<div class="bg-gris-750 border-gris-600 lg:col-span-2 rounded-lg border p-4">
			<h3 class="text-gris-200 mb-3 text-sm font-semibold">Progreso por jugador (fases completadas vs pendientes)</h3>
			<div style="height: {Math.max(200, progressPerPlayer.length * 32)}px">
				<canvas bind:this={progressChartCanvas}></canvas>
			</div>
		</div>
	</div>
{/if}