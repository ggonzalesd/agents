<svelte:options runes />

<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		variant?: 'danger' | 'warning' | 'default';
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirmar',
		variant = 'danger',
		onconfirm,
		oncancel,
	}: Props = $props();

	const variantClasses: Record<string, string> = {
		danger: 'bg-red-700 hover:bg-red-600',
		warning: 'bg-yellow-700 hover:bg-yellow-600',
		default: 'bg-magenta-700 hover:bg-magenta-600',
	};
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
		onclick={oncancel}
		onkeydown={(e) => e.key === 'Escape' && oncancel()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-gris-800 w-full max-w-md rounded-lg border border-gris-600 p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			<h2 class="text-gris-50 mb-2 text-lg font-bold">{title}</h2>
			<p class="text-gris-300 mb-6 text-sm">{message}</p>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					class="bg-gris-700 hover:bg-gris-600 text-gris-200 cursor-pointer rounded-sm px-4 py-2 text-sm transition-colors"
					onclick={oncancel}
				>
					Cancelar
				</button>
				<button
					type="button"
					class="{variantClasses[variant] ?? variantClasses.default} text-gris-50 cursor-pointer rounded-sm px-4 py-2 text-sm font-bold transition-colors"
					onclick={onconfirm}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}