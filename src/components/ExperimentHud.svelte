<svelte:options runes />

<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import { getDebugContext } from '@/hooks/useDebug.svelte';

	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import type { GameState } from '#/state/game.state';
	import type { Room } from 'colyseus.js';
	import type { ExperimentListItem, ExperimentStateResponse } from '#/schema/experiment.schema';

	import { getExperimentByKey } from '#/experiments/guia-experimentacion-v4';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import {
		getMyAvailableExperimentsService,
		getMyExperimentService,
		getActiveExperimentService,
		profileService,
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
	let showFeedbackModal = $state(false);
	let feedbackRating = $state(5);
	let feedbackComment = $state('');
	let feedbackTextareaEl = $state<HTMLTextAreaElement | null>(null);
	let feedbackLinksClicked = $state<Set<string>>(new Set());
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

	const hasActiveExperiment = $derived(
		activeExperiment?.status === 'IN_PROGRESS' ||
			activeExperiment?.status === 'AWAITING_FEEDBACK',
	);

	const feedbackLinks = $derived(
		activeExperiment
			? (getExperimentByKey(activeExperiment.experimentKey)?.feedbackLinks ?? [])
			: [],
	);

	const allFeedbackLinksClicked = $derived(
		feedbackLinks.length === 0 || feedbackLinksClicked.size === feedbackLinks.length,
	);

	const currentPhase = $derived.by(() => {
		const exp = activeExperiment;
		if (!exp || exp.currentPhaseIndex === null) return null;
		return exp.phases.find((p) => p.phaseIndex === exp.currentPhaseIndex) ?? null;
	});

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

	function handleRepetir() {
		sendRoomMessage('experiment:fail-phase');
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
	feedbackLinksClicked = new Set();
	gameInputContext.setMode(InputMode.GAME);
	debugContext.success('Feedback enviado. Experimento completado.');
	sendRoomMessage('experiment:stop');
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
	<div class="pointer-events-none absolute bottom-0 left-0 z-20 flex max-w-sm flex-col gap-2 p-3">
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
				<div class="pointer-events-auto rounded-xl border border-zinc-700/60 bg-zinc-950/85 p-3 text-zinc-100 shadow-xl backdrop-blur-md">
					<p class="text-[10px] font-semibold tracking-[0.18em] text-cyan-300/70 uppercase">
						{activeExperiment.experimentTitle}
					</p>

					{#if currentPhase}
						<p class="mt-1 text-xs font-semibold text-zinc-400">
							Fase {currentPhase.phaseIndex + 1} / {activeExperiment.totalPhases}
						</p>
						<p class="mt-1 text-sm font-semibold text-white leading-snug">
							{currentPhase.title}
						</p>
						<p class="mt-1 text-xs leading-relaxed text-zinc-400">
							{currentPhase.description}
						</p>
						<p class="mt-2 text-xs text-zinc-500">
							Intento {currentPhase.currentAttemptNumber} · {currentPhase.failureCount} {currentPhase.failureCount === 1 ? 'fallo' : 'fallos'}
						</p>
					{/if}

					<div class="mt-3 flex gap-2">
						<button
							class="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:cursor-pointer hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={actionLoading}
							onclick={handleRepetir}
						>
							Repetir
						</button>
					</div>
				</div>
			{/if}

			<!-- Lista de experimentos disponibles (solo cuando no hay experimento activo) -->
			{#if !hasActiveExperiment && availableExperiments.length > 0}
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
											disabled={actionLoading}
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

			{#if feedbackLinks.length > 0}
				<div class="mt-5">
					<p class="text-xs font-semibold tracking-[0.15em] text-amber-300/80 uppercase">
						Encuestas requeridas ({feedbackLinksClicked.size}/{feedbackLinks.length})
					</p>
					<div class="mt-2 flex flex-col gap-2">
						{#each feedbackLinks as link (link.href)}
							{@const clicked = feedbackLinksClicked.has(link.href)}
							<button
								type="button"
								class="flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:cursor-pointer {clicked ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20' : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20'}"
								onclick={() => {
									window.open(link.href, '_blank');
									feedbackLinksClicked = new Set([...feedbackLinksClicked, link.href]);
								}}
							>
								<span>{link.label}</span>
								{#if clicked}
									<span class="text-emerald-300">✓</span>
								{:else}
									<span class="text-cyan-300/60">↗</span>
								{/if}
							</button>
						{/each}
					</div>
					{#if !allFeedbackLinksClicked}
						<p class="mt-2 text-xs text-zinc-500">
							Debes abrir todas las encuestas antes de enviar el feedback.
						</p>
					{/if}
				</div>
			{/if}

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
					disabled={actionLoading || !allFeedbackLinksClicked}
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
