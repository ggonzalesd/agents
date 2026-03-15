<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import InputText from '@/components/InputText.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import type { CreateMissionInput } from '#/schema/mission.schema';
	import { WorldEcs } from '#/ecs/World.ecs';
	import { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type { Room } from 'colyseus.js';
	import type { GameState } from '#/state/game.state';

	interface Props {
		onBack: () => void;
		onSuccess: () => void;
	}
	let { onBack, onSuccess }: Props = $props();

	const queryClient = useQueryClient();
	const worldEcsContext = getContext<Option<WorldEcs>>(WorldEcs.name);

	const form = $state<CreateMissionInput>({
		title: '',
		description: '',
		reward: null,
	});

	let error = $state<string | null>(null);
	let isPending = $state(false);

	function getRoom(): Room<GameState> | null {
		return worldEcsContext
			.map((w) => w.getUnsafe(ColyseusClientEcs))
			.pick('connection')
			.collapse()
			.map((c) => c.room)
			.raw();
	}

	onMount(() => {
		const room = getRoom();
		if (!room) return;

		const handler = (msg: { success: boolean; event?: string; error?: string }) => {
			if (msg.event !== 'mission:created') return;
			isPending = false;
			if (msg.success) {
				queryClient.invalidateQueries({ queryKey: ['missions'] });
				onSuccess();
			} else {
				error = msg.error ?? 'Error al crear la misión';
			}
		};

		room.onMessage('mission:result', handler);
		return () => room.onMessage('mission:result', () => {});
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (form.title.length < 3) {
			error = 'El título debe tener al menos 3 caracteres';
			return;
		}
		if (form.description.length < 10) {
			error = 'La descripción debe tener al menos 10 caracteres';
			return;
		}

		const room = getRoom();
		if (!room) {
			error = 'No hay conexión al servidor';
			return;
		}

		isPending = true;
		room.send('client:action', {
			type: 'create-mission',
			title: form.title,
			description: form.description,
			reward: form.reward ?? undefined,
		});
	}
</script>

<section class="w-full max-w-2xl mx-auto p-4">
	<div class="bg-gris-800 rounded-xl p-6">
		<div class="flex items-center gap-4 mb-6">
			<button
				class="text-gray-400 hover:text-white transition-colors"
				onclick={onBack}
			>
				← Volver
			</button>
			<h1 class="font-zen-dots text-gris-50 text-xl">Nueva Misión</h1>
		</div>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<div>
				<label class="block text-sm text-gray-300 mb-1" for="title">
					Título *
				</label>
				<InputText
					id="title"
					name="title"
					placeholder="Ej: Recolectar 10 manzanas"
					bind:value={form.title}
				/>
			</div>

			<div>
				<label class="block text-sm text-gray-300 mb-1" for="description">
					Descripción *
				</label>
				<textarea
					id="description"
					name="description"
					placeholder="Describe qué debe hacer quien acepte esta misión..."
					bind:value={form.description}
					class="w-full h-32 bg-gris-700 border border-gris-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
				></textarea>
			</div>

			<div>
				<label class="block text-sm text-gray-300 mb-1" for="reward">
					Recompensa (opcional)
				</label>
				<input
					id="reward"
					name="reward"
					type="text"
					placeholder="Ej: 100 monedas de oro, acceso VIP, etc."
					value={form.reward ?? ''}
					onchange={(e) => form.reward = e.currentTarget.value || null}
					class="w-full bg-gris-700 border border-gris-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
				/>
			</div>

			{#if error}
				<div class="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-400 text-sm">
					{error}
				</div>
			{/if}

			<div class="flex justify-end gap-3 mt-4">
				<Button
					type="button"
					class="!bg-gris-600 hover:!bg-gris-500"
					onclick={onBack}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={isPending}
				>
					{isPending ? 'Creando...' : 'Crear Misión'}
				</Button>
			</div>
		</form>
	</div>
</section>
