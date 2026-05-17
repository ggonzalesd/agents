<svelte:options runes />

<script lang="ts">
	import type { ExperimentStateResponse } from '#/schema/experiment.schema';

	interface Props {
		open: boolean;
		experiment: ExperimentStateResponse | null;
		onsave: (id: string, data: { status?: string; rating?: number | null; comment?: string | null }) => void;
		oncancel: () => void;
	}

	let { open = $bindable(false), experiment, onsave, oncancel }: Props = $props();

	let status = $state('');
	let rating = $state<string>('');
	let comment = $state('');

	$effect(() => {
		if (experiment) {
			status = experiment.status ?? 'NOT_STARTED';
			rating = experiment.rating !== null && experiment.rating !== undefined ? String(experiment.rating) : '';
			comment = experiment.comment ?? '';
		}
	});

	const handleSave = () => {
		if (!experiment) return;

		const data: {
			status?: string;
			rating?: number | null;
			comment?: string | null;
		} = {};

		if (status && status !== (experiment.status ?? 'NOT_STARTED')) {
			data.status = status;
		}

		if (rating === '') {
			if (experiment.rating !== null && experiment.rating !== undefined) {
				data.rating = null;
			}
		} else {
			const parsed = parseInt(rating, 10);
			if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
				data.rating = parsed;
			}
		}

		if (comment !== (experiment.comment ?? '')) {
			data.comment = comment || null;
		}

		onsave(experiment.id, data);
	};

	const inputClass = 'bg-gris-700 text-gris-200 rounded-sm px-3 py-2 text-sm w-full border border-gris-600 focus:border-magenta-500 focus:outline-none';
</script>

{#if open && experiment}
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
			<h2 class="text-gris-50 mb-4 text-lg font-bold">Editar Experimento</h2>
			<p class="text-gris-400 mb-4 text-xs">
				{experiment.experimentTitle} — {experiment.owner?.username ?? '-'}
			</p>

			<div class="flex flex-col gap-4">
				<div>
					<label for="edit-exp-status" class="text-gris-300 mb-1 block text-xs font-semibold">Estado</label>
					<select id="edit-exp-status" bind:value={status} class={inputClass}>
						<option value="NOT_STARTED">NOT_STARTED</option>
						<option value="IN_PROGRESS">IN_PROGRESS</option>
						<option value="AWAITING_FEEDBACK">AWAITING_FEEDBACK</option>
						<option value="COMPLETED">COMPLETED</option>
					</select>
				</div>

				<div>
					<label for="edit-exp-rating" class="text-gris-300 mb-1 block text-xs font-semibold">Rating (1-5, vacio = sin rating)</label>
					<input
						id="edit-exp-rating"
						type="number"
						min="1"
						max="5"
						placeholder="Sin rating"
						bind:value={rating}
						class={inputClass}
					/>
				</div>

				<div>
					<label for="edit-exp-comment" class="text-gris-300 mb-1 block text-xs font-semibold">Comentario</label>
					<textarea
						id="edit-exp-comment"
						rows="3"
						placeholder="Sin comentario"
						bind:value={comment}
						class={inputClass}
					></textarea>
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