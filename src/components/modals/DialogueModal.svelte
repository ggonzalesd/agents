<svelte:options runes />

<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { GameInput } from '@/utils/input.utils';
	import { getGameStateContext } from '@/hooks/useGameState.svelte';
	import { WorldEcs } from '#/ecs/World.ecs';
	import type { Option } from '#/utils/Option';
	import { ColyseusClientEcs } from '@/game/scripts/colyseus-client.ecs';
	import type {
		DialogueStartPayload,
		DialogueEndPayload,
		DialogueCancelPayload,
		DialogueUnavailablePayload,
	} from '#/schema/dialogue.schema';

	type DialogueOption = { id: string; text: string; index: number };

	type DialogueState = {
		npcEntityId: string;
		conversationId: string;
		statementId: string;
		text: string;
		options: DialogueOption[];
	} | null;

	let gameState = getGameStateContext();
	let inputs = getContext<GameInput>(GameInput.name);
	let worldOp = getContext<Option<WorldEcs>>(WorldEcs.name);

	let dialogue = $state<DialogueState>(null);
	let hoveredOptionId = $state<string | null>(null);
	let roomRef: { send: (type: string, data: unknown) => void } | null = null;

	onMount(() => {
		const world = worldOp.raw();
		if (!world) return () => {};

		const colyseusClient = world.get(ColyseusClientEcs).raw();
		if (!colyseusClient) return () => {};

		const connection = colyseusClient.connection.collapse().raw();
		if (!connection) return () => {};

		const { room } = connection;
		roomRef = room;

		let active = true;

		const onStart = (payload: DialogueStartPayload) => {
			if (!active) return;
			dialogue = {
				npcEntityId: payload.npcEntityId,
				conversationId: payload.conversationId,
				statementId: payload.statementId,
				text: payload.text,
				options: payload.options,
			};
		};

		const onNext = (payload: DialogueStartPayload) => {
			if (!active) return;
			dialogue = {
				npcEntityId: payload.npcEntityId,
				conversationId: payload.conversationId,
				statementId: payload.statementId,
				text: payload.text,
				options: payload.options,
			};
			hoveredOptionId = null;
		};

		const onEnd = (_payload: DialogueEndPayload) => {
			if (!active) return;
			closeModal();
		};

		const onCancel = (_payload: DialogueCancelPayload) => {
			if (!active) return;
			closeModal();
		};

		const onUnavailable = (_payload: DialogueUnavailablePayload) => {
			if (!active) return;
			closeModal();
		};

		room.onMessage('dialogue:start', onStart);
		room.onMessage('dialogue:next', onNext);
		room.onMessage('dialogue:end', onEnd);
		room.onMessage('dialogue:cancel', onCancel);
		room.onMessage('dialogue:unavailable', onUnavailable);

		return () => {
			active = false;
		};
	});

	function selectOption(option: DialogueOption) {
		if (!dialogue) return;
		roomRef?.send('dialogue:response', {
			npcEntityId: dialogue.npcEntityId,
			optionId: option.id,
		});
	}

	function cancelDialogue() {
		if (!dialogue) return;
		roomRef?.send('dialogue:cancel', { npcEntityId: dialogue.npcEntityId });
		closeModal();
	}

	function closeModal() {
		dialogue = null;
		hoveredOptionId = null;
		gameState.continueGame();
		gameState.setDialogueNpc(null);
		inputs.disabled = false;
	}
</script>

<div
	class="flex w-[480px] max-w-[95vw] flex-col gap-4 rounded-xl bg-zinc-900/95 p-6 shadow-2xl ring-1 ring-white/10"
	role="dialog"
	aria-modal="true"
>
	{#if dialogue}
		<div class="flex items-start justify-between gap-4">
			<p class="font-zen-dots text-sm leading-relaxed text-white/90">
				{dialogue.text}
			</p>
		</div>

		<div class="flex flex-col gap-2">
			{#each dialogue.options as option (option.id)}
				<!-- svelte-ignore a11y_interactive_supports_focus -->
				<button
					class={`cursor-pointer rounded-lg border border-white/10 px-4 py-3 text-left text-sm transition-colors ${hoveredOptionId === option.id ? 'bg-[#8965F2] text-white' : 'bg-zinc-800 text-white/70'}`}
					onmouseenter={() => (hoveredOptionId = option.id)}
					onmouseleave={() => (hoveredOptionId = null)}
					onclick={() => selectOption(option)}
				>
					{option.index + 1}. {option.text}
				</button>
			{/each}
		</div>

		<div class="flex justify-end">
			<button
				class="rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-2 text-xs text-red-300 transition-colors hover:bg-red-900/50"
				onclick={cancelDialogue}
			>
				Cancelar
			</button>
		</div>
	{:else}
		<p class="text-center text-sm text-white/50">Conectando...</p>
	{/if}
</div>
