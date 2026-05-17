<svelte:options runes />

<script lang="ts">
	import type { ExperimentPhaseResponse } from '#/schema/experiment.schema';

	interface Props {
		open: boolean;
		phase: ExperimentPhaseResponse | null;
		onsave: (id: string, data: { status?: string; failureCount?: number; attemptCount?: number }) => void;
		oncancel: () => void;
	}

	let { open = $bindable(false), phase, onsave, oncancel }: Props = $props();

	let status = $state('');
	let failureCount = $state('');
	let attemptCount = $state('');

	$effect(() => {
		if (phase) {
			status = phase.status;
			failureCount = String(phase.failureCount);
			attemptCount = String(phase.attemptCount);
		}
	});

	const handleSave = () => {
		if (!phase) return;

		const data: { status?: string; failureCount?: number; attemptCount?: number } = {};

		if (status && status !== phase.status) {
			data.status = status;
		}

		const parsedFailure = parseInt(failureCount, 10);
		if (!isNaN(parsedFailure) && parsedFailure !== phase.failureCount) {
			data.failureCount = parsedFailure;
		}

		const parsedAttempt = parseInt(attemptCount, 10);
		if (!isNaN(parsedAttempt) && parsedAttempt !== phase.attemptCount) {
			data.attemptCount = parsedAttempt;
		}

		onsave(phase.phaseKey, data);
	};

	const inputClass = 'bg-gris-700 text-gris-200 rounded-sm px-3 py-2 text-sm w-full border border-gris-600 focus:border-magenta-500 focus:outline-none';
</script>

{#if open && phase}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
		onclick={oncancel}
		onkeydown={(e) => e.key === 'Escape' && oncancel()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-gris-800 w-full max-w-lg rounded-lg border border-gris-600 p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<h2 class="text-gris-50 mb-4 text-lg font-bold">Editar Fase</h2>
			<p class="text-gris-400 mb-4 text-xs">
				{phase.title} — Fase #{phase.phaseIndex}
			</p>

			<div class="flex flex-col gap-4">
				<div>
					<label for="edit-phase-status" class="text-gris-300 mb-1 block text-xs font-semibold">Estado</label>
					<select id="edit-phase-status" bind:value={status} class={inputClass}>
						<option value="PENDING">PENDING</option>
						<option value="ACTIVE">ACTIVE</option>
						<option value="COMPLETED">COMPLETED</option>
					</select>
				</div>

				<div>
					<label for="edit-phase-attempts" class="text-gris-300 mb-1 block text-xs font-semibold">Intentos (attemptCount)</label>
					<input
						id="edit-phase-attempts"
						type="number"
						min="0"
						bind:value={attemptCount}
						class={inputClass}
					/>
				</div>

				<div>
					<label for="edit-phase-failures" class="text-gris-300 mb-1 block text-xs font-semibold">Fallos (failureCount)</label>
					<input
						id="edit-phase-failures"
						type="number"
						min="0"
						bind:value={failureCount}
						class={inputClass}
					/>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					type="button"
					class="bg-gris-700 hover:bg-gris-600 text-gris-200 cursor-pointer rounded-sm px-4 py-2 text-sm transition-colors"
					onclick={oncancel}
				>
					Cancelar
				</button>
				<button
					type="button"
					class="bg-magenta-700 hover:bg-magenta-600 text-gris-50 cursor-pointer rounded-sm px-4 py-2 text-sm font-bold transition-colors"
					onclick={handleSave}
				>
					Guardar
				</button>
			</div>
		</div>
	</div>
{/if}