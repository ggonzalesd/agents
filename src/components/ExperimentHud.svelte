<svelte:options runes />

<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import { getDebugContext } from '@/hooks/useDebug.svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import type { GameState } from '#/state/game.state';
	import type { Room } from 'colyseus.js';
	import type { ExperimentListItem, ExperimentStateResponse } from '#/schema/experiment.schema';

	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import {
		getMyAvailableExperimentsService,
		getMyExperimentService,
		getActiveExperimentService,
		profileService,
		resetExperimentService,
		submitExperimentFeedbackService,
	} from '@/services/api.service';
	import {
		phaseCountdownEvent,
		awaitingFeedbackEvent,
		phaseMessageEvent,
		type PhaseMessageEvent,
	} from '@/game/scripts/experiment/experiment-hud-events.store';
	import { GameInput } from '@/utils/input.utils';
	import { InputMode } from '@/utils/inputMode';

	let availableExperiments = $state<ExperimentListItem[]>([]);
	let activeExperiment = $state<ExperimentStateResponse | null>(null);
	let adminExperiments = $state<ExperimentStateResponse[]>([]);
	let isAdmin = $state(false);
	let myUserId = $state<string | null>(null);
	let loading = $state(true);
	let actionLoading = $state(false);
	let nowMs = $state(Date.now());
	let showFeedbackModal = $state(false);
	let feedbackRating = $state(5);
	let feedbackComment = $state('');
	let feedbackTextareaEl = $state<HTMLTextAreaElement | null>(null);
	let phaseCountdown = $state<number | null>(null);
	let phaseMessage = $state<PhaseMessageEvent | null>(null);
	let phaseMessageTimeout: ReturnType<typeof setTimeout> | null = null;

	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);
	const debugContext = getDebugContext();
	const gameInputContext = getContext<GameInput>(GameInput.name);

	function getRoom(): Room<GameState> | null {
		return worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
	}

	const currentPhase = $derived.by(() => {
		const exp = activeExperiment;
		if (!exp || exp.currentPhaseIndex === null) return null;
		return exp.phases.find((p) => p.phaseIndex === exp.currentPhaseIndex) ?? null;
	});

	const currentAttemptElapsedMs = $derived.by(() => {
		if (!currentPhase) return 0;
		if (!currentPhase.currentAttemptStartedAt) return currentPhase.currentAttemptElapsedMs;
		const startedAt = Date.parse(currentPhase.currentAttemptStartedAt);
		return currentPhase.currentAttemptElapsedMs + Math.max(0, nowMs - startedAt);
	});

	const currentPhaseTotalTimeMs = $derived.by(() => {
		if (!currentPhase) return 0;
		if (!currentPhase.currentAttemptStartedAt) return currentPhase.totalTimeMs;
		const startedAt = Date.parse(currentPhase.currentAttemptStartedAt);
		return currentPhase.totalTimeMs + Math.max(0, nowMs - startedAt);
	});

	const hasActiveExperiment = $derived(
		activeExperiment?.status === 'IN_PROGRESS' ||
			activeExperiment?.status === 'AWAITING_FEEDBACK',
	);

	function formatDuration(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
		const seconds = (totalSeconds % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	}

	function sendRoomMessage(type: string, payload: Record<string, unknown> = {}) {
		const room = getRoom();
		if (!room) {
			debugContext.error('No hay conexión con la sala');
			return;
		}
		room.send(type, payload);
	}

	async function refreshData() {
		if (isAdmin) {
			const res = await getActiveExperimentService();
			if (res.ok) {
				adminExperiments = res.data.experiments.filter(
					(e): e is ExperimentStateResponse => e !== null,
				);
			}
		} else {
			const listRes = await getMyAvailableExperimentsService();
			if (listRes.ok) availableExperiments = listRes.data.experiments;

			const inProgress = availableExperiments.find(
				(e) => e.status === 'IN_PROGRESS' || e.status === 'AWAITING_FEEDBACK',
			);

			if (inProgress) {
				const stateRes = await getMyExperimentService(inProgress.experimentKey);
				if (stateRes.ok) activeExperiment = stateRes.data.experiment;
			} else {
				activeExperiment = null;
			}
		}
		loading = false;
	}

	function handleStartExperiment(experimentKey: string) {
		sendRoomMessage('experiment:start', { experimentKey });
	}

	function handleStopExperiment(experimentKey: string) {
		sendRoomMessage('experiment:stop', { experimentKey });
	}

	async function handleReset(experimentKey: string) {
		actionLoading = true;
		const res = await resetExperimentService(experimentKey);
		actionLoading = false;
		if (!res.ok) {
		debugContext.error(res.error?.message ?? res.message);
		return;
	}
	await refreshData();
	debugContext.success('Experimento reseteado.');
	}

	async function submitFeedback() {
	if (!feedbackComment.trim()) {
		debugContext.error('Debes dejar un comentario para completar el experimento.');
			return;
		}
		if (!activeExperiment) return;

		actionLoading = true;
		const res = await submitExperimentFeedbackService({
			experimentKey: activeExperiment.experimentKey,
			rating: feedbackRating,
			comment: feedbackComment.trim(),
		});
		actionLoading = false;

	if (!res.ok) {
		debugContext.error(res.error?.message ?? res.message);
		return;
	}

	activeExperiment = res.data.experiment;
	showFeedbackModal = false;
	feedbackRating = 5;
	feedbackComment = '';
	gameInputContext.setMode(InputMode.GAME);
	debugContext.success('Feedback enviado. Experimento completado.');
	handleStopExperiment(activeExperiment!.experimentKey);
	}

	onMount(() => {
		let countdownInterval: ReturnType<typeof setInterval> | null = null;

		const unsubCountdown = phaseCountdownEvent.subscribe((event) => {
			if (!event) return;
			if (myUserId !== null && event.userId !== myUserId) return;

			if (countdownInterval) clearInterval(countdownInterval);
			phaseCountdown = 3;
			countdownInterval = setInterval(() => {
				if (phaseCountdown === null) {
					clearInterval(countdownInterval!);
					countdownInterval = null;
					return;
				}
				phaseCountdown -= 1;
				if (phaseCountdown < 0) {
					phaseCountdown = null;
					clearInterval(countdownInterval!);
					countdownInterval = null;
				}
			}, 1000);
		});

		const unsubFeedback = awaitingFeedbackEvent.subscribe((event) => {
			if (!event) return;
			if (myUserId === null || event.userId !== myUserId) return;
			showFeedbackModal = true;
			gameInputContext.setMode(InputMode.UI);
			void tick().then(() => feedbackTextareaEl?.focus());
		});

		const unsubPhaseMessage = phaseMessageEvent.subscribe((event) => {
			if (!event) return;
			if (myUserId !== null && event.userId !== myUserId) return;

			phaseMessage = event;
			if (phaseMessageTimeout) clearTimeout(phaseMessageTimeout);
			phaseMessageTimeout = setTimeout(() => {
				phaseMessage = null;
				phaseMessageTimeout = null;
			}, event.durationMs);
		});

		let pollInterval: ReturnType<typeof setInterval> | null = null;
		const clockInterval = setInterval(() => {
			nowMs = Date.now();
		}, 1000);

		profileService()
			.then((response) => {
				if (response.ok) {
					isAdmin = response.data.user.role === 'ADMIN';
					myUserId = response.data.user.id;
				}
			})
			.finally(async () => {
				await refreshData();
				pollInterval = setInterval(() => {
					void refreshData();
				}, 2500);
			});

		return () => {
			unsubCountdown();
			unsubFeedback();
			unsubPhaseMessage();
			if (countdownInterval) clearInterval(countdownInterval);
			if (phaseMessageTimeout) clearTimeout(phaseMessageTimeout);
			clearInterval(clockInterval);
			if (pollInterval) clearInterval(pollInterval);
		};
	});

	$effect(() => {
		if (activeExperiment?.status === 'AWAITING_FEEDBACK') {
			showFeedbackModal = true;
			gameInputContext.setMode(InputMode.UI);
		}
	});
</script>

{#if !loading}
	<div class="pointer-events-none absolute top-0 right-0 z-20 flex max-w-md flex-col gap-2 p-3">
		{#if isAdmin}
			<!-- Admin: lista de experimentos activos -->
			{#if adminExperiments.length > 0}
				<div class="pointer-events-auto rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
					<p class="text-xs font-semibold tracking-[0.2em] text-cyan-300/80 uppercase">
						Experimentos activos
					</p>
					<div class="mt-3 flex flex-col gap-2">
						{#each adminExperiments as exp (exp.experimentKey + exp.owner?.userId)}
							<div class="rounded-lg border border-zinc-700/50 bg-zinc-900/80 px-3 py-2">
								<div class="flex items-center justify-between gap-2">
									<span class="text-sm font-semibold text-white">{exp.owner?.username ?? '—'}</span>
									<span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
										{exp.status}
									</span>
								</div>
								<p class="mt-0.5 text-xs text-zinc-400">{exp.experimentTitle}</p>
								{#if exp.currentPhaseIndex !== null}
									<p class="mt-0.5 text-xs text-zinc-500">
										Fase {exp.currentPhaseIndex + 1} / {exp.totalPhases}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- Usuario: HUD del experimento activo -->
			{#if hasActiveExperiment && activeExperiment}
				<div class="pointer-events-auto rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs font-semibold tracking-[0.2em] text-cyan-300/80 uppercase">
								Experimento activo
							</p>
							<p class="mt-1 text-sm font-semibold text-white">
								{activeExperiment.experimentTitle}
							</p>
						</div>
						<span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
							{activeExperiment.status}
						</span>
					</div>

					{#if currentPhase}
						<div class="mt-4 space-y-1">
							<p class="text-sm font-semibold text-white">
								Fase {currentPhase.phaseIndex + 1} / {activeExperiment.totalPhases}
							</p>
							<p class="text-sm text-zinc-200">{currentPhase.title}</p>
							<p class="text-xs leading-relaxed text-zinc-400">{currentPhase.description}</p>
						</div>

						<div class="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-300">
							<div class="rounded-lg bg-zinc-900/90 p-3">
								<p class="text-zinc-500">Intento actual</p>
								<p class="mt-1 text-lg font-semibold text-white">
									{currentPhase.currentAttemptNumber}
								</p>
							</div>
							<div class="rounded-lg bg-zinc-900/90 p-3">
								<p class="text-zinc-500">Fallos fase</p>
								<p class="mt-1 text-lg font-semibold text-white">
									{currentPhase.failureCount}
								</p>
							</div>
							<div class="rounded-lg bg-zinc-900/90 p-3">
								<p class="text-zinc-500">Tiempo intento</p>
								<p class="mt-1 text-lg font-semibold text-white">
									{formatDuration(currentAttemptElapsedMs)}
								</p>
							</div>
							<div class="rounded-lg bg-zinc-900/90 p-3">
								<p class="text-zinc-500">Tiempo fase</p>
								<p class="mt-1 text-lg font-semibold text-white">
									{formatDuration(currentPhaseTotalTimeMs)}
								</p>
							</div>
						</div>
					{/if}

					<div class="mt-4 flex flex-wrap gap-2">
						<button
							class="rounded-lg bg-zinc-700/60 px-3 py-2 text-xs font-semibold text-zinc-100 hover:cursor-pointer hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={actionLoading}
							onclick={() => handleStopExperiment(activeExperiment!.experimentKey)}
						>
							Detener
						</button>
						<button
							class="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-100 hover:cursor-pointer hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={actionLoading}
							onclick={() => handleReset(activeExperiment!.experimentKey)}
						>
							Reset
						</button>
					</div>

					{#if activeExperiment.status === 'COMPLETED'}
						<p class="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
							Experimento completado.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Lista de experimentos disponibles -->
			{#if availableExperiments.length > 0}
				<div class="pointer-events-auto rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
					<p class="text-xs font-semibold tracking-[0.2em] text-cyan-300/80 uppercase">
						Mis experimentos
					</p>
					<div class="mt-3 flex flex-col gap-2">
						{#each availableExperiments as exp (exp.experimentKey)}
							<div class="rounded-lg border border-zinc-700/50 bg-zinc-900/80 px-3 py-2">
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-sm font-semibold text-white">
											{exp.experimentTitle}
										</p>
										<p class="mt-0.5 text-xs text-zinc-400">
											{exp.completedPhases} / {exp.totalPhases} fases
										</p>
									</div>
									{#if exp.status === 'COMPLETED'}
										<span class="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
											Completado
										</span>
									{:else if exp.status === 'IN_PROGRESS' || exp.status === 'AWAITING_FEEDBACK'}
										<span class="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
											En curso
										</span>
									{:else}
										<button
											class="shrink-0 rounded-lg bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100 hover:cursor-pointer hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
											disabled={hasActiveExperiment || actionLoading}
											onclick={() => handleStartExperiment(exp.experimentKey)}
										>
											Iniciar
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
{/if}

{#if phaseCountdown !== null}
	<div class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
		<span class="text-[8rem] font-black leading-none text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]">
			{phaseCountdown === 0 ? '¡YA!' : phaseCountdown}
		</span>
	</div>
{/if}

{#if phaseMessage}
	<div class="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
		<span class="text-[8rem] font-black leading-none text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]">
			{phaseMessage.title}
		</span>
		{#if phaseMessage.subtitle}
			<span class="mt-4 text-2xl font-semibold text-zinc-200 drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
				{phaseMessage.subtitle}
			</span>
		{/if}
	</div>
{/if}

{#if showFeedbackModal}
	<div class="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
		<div class="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 shadow-2xl">
			<p class="text-xs font-semibold tracking-[0.2em] text-cyan-300/80 uppercase">
				Cerrar experimento
			</p>
			<h2 class="mt-2 text-xl font-semibold text-white">
				Califica el experimento y deja un comentario
			</h2>
			<p class="mt-1 text-sm text-zinc-400">
				El experimento fue completado. Falta registrar tu feedback para finalizar.
			</p>

			<div class="mt-5 flex gap-2">
				{#each Array.from({ length: 5 }) as _, index}
					<button
						type="button"
						class="text-3xl transition hover:cursor-pointer"
						class:text-amber-300={index < feedbackRating}
						class:text-zinc-600={index >= feedbackRating}
						onclick={() => {
							feedbackRating = index + 1;
						}}
					>
						★
					</button>
				{/each}
			</div>

		<textarea
			class="mt-4 h-32 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-cyan-400"
			bind:this={feedbackTextareaEl}
			bind:value={feedbackComment}
			placeholder="Describe cómo te fue en el experimento"
		></textarea>

			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 hover:cursor-pointer hover:bg-zinc-700"
					onclick={() => {
						showFeedbackModal = false;
						gameInputContext.setMode(InputMode.GAME);
					}}
				>
					Cancelar
				</button>
				<button
					type="button"
					class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:cursor-pointer hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={actionLoading}
					onclick={() => {
						void submitFeedback();
					}}
				>
					Guardar y completar
				</button>
			</div>
		</div>
	</div>
{/if}
