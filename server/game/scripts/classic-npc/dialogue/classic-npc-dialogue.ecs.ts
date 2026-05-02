import type { Room } from 'colyseus';

import { ComponentEcs } from '#/ecs';
import {
	dialogueResponseMessageSchema,
	type DialogueCancelPayload,
	type DialogueEndPayload,
	type DialogueNextPayload,
	type DialogueStartPayload,
	type DialogueUnavailablePayload,
} from '#/schema/dialogue.schema';

import { ClassicNPCStateMachineEcs } from '../classic-npc-state-machine.ecs';
import type {
	ConversationEventCtx,
	DialogueConfig,
	DialogueConversation,
	DialogueOption,
	DialogueSession,
	DialogueStatement,
	OptionEventCtx,
	ResolveNextCtx,
	StatementEventCtx,
} from './dialogue.types';

export class ClassicNpcDialogueEcs extends ComponentEcs {
	private readonly config: DialogueConfig;
	private room: Room = null!;

	// sesiones activas: playerEntityId → session
	private readonly sessions = new Map<string, DialogueSession>();

	// índice secuencial para pickStrategy 'sequential'
	private sequentialIndex = 0;

	// jugadores que completaron cada conversación (para reusable: false)
	private readonly completedBy = new Map<string, Set<string>>();

	constructor(config: DialogueConfig, room: Room) {
		super();
		this.config = config;
		this.room = room;
	}

	private getStateMachine(): ClassicNPCStateMachineEcs | null {
		return this.world
			.getEntity(this.parent!)
			.map((e) => e.get(ClassicNPCStateMachineEcs))
			.collapse()
			.raw() ?? null;
	}

	// ── API pública ────────────────────────────────────────────────────────────

	public startDialogue(playerEntityId: string): void {
		if (this.sessions.has(playerEntityId)) {
			this.cancelDialogue(playerEntityId, true);
		}

		const conversation = this.pickConversation(playerEntityId);
		if (!conversation) {
			const payload: DialogueUnavailablePayload = { npcEntityId: this.parent! };
			this.sendToPlayer(playerEntityId, 'dialogue:unavailable', payload);
			return;
		}

		const session: DialogueSession = {
			conversationId: conversation.id,
			currentStatementId: this.resolveStartStatement(conversation, playerEntityId),
			playerEntityId,
			startedAt: Date.now(),
		};

		this.sessions.set(playerEntityId, session);
		this.getStateMachine()?.disable(playerEntityId);

		const ctx: ConversationEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: conversation.id,
		};

		conversation.onStart?.(ctx);

		this.sendStatementToPlayer(playerEntityId, session, conversation);
	}

	public receiveResponse(playerEntityId: string, rawMessage: unknown): void {
		const parsed = dialogueResponseMessageSchema.safeParse(rawMessage);
		if (!parsed.success) return;

		const { optionId } = parsed.data;
		const session = this.sessions.get(playerEntityId);
		if (!session) return;

		const conversation = this.getConversation(session.conversationId);
		if (!conversation) return;

		const statement = conversation.statements[session.currentStatementId];
		if (!statement) return;

		const option = statement.options[optionId];
		if (!option) return;

		const optionIndex = Object.keys(statement.options).indexOf(optionId);

		const ctx: OptionEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: session.conversationId,
			statementId: session.currentStatementId,
			optionId,
			optionIndex,
			nextStatementId: option.nextStatementId,
		};

		option.onSelect?.(ctx);
		statement.onResponse?.(ctx);

		const npcEntityOp = this.world.getEntity(this.parent!);
		const playerEntityOp = this.world.getEntity(playerEntityId);

		const resolvedNext: string | null = (option.resolveNext && npcEntityOp.isSome() && playerEntityOp.isSome())
			? option.resolveNext({
				...ctx,
				world: this.world,
				npcEntity: npcEntityOp.unwrap(),
				playerEntity: playerEntityOp.unwrap(),
			} satisfies ResolveNextCtx)
			: option.nextStatementId;

		if (resolvedNext === null) {
			this.endDialogue(playerEntityId, conversation);
			return;
		}

		const nextStatement = conversation.statements[resolvedNext];
		if (!nextStatement) {
			this.endDialogue(playerEntityId, conversation);
			return;
		}

		session.currentStatementId = resolvedNext;

		const stmtCtx: StatementEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: session.conversationId,
			statementId: resolvedNext,
		};

		nextStatement.onAsk?.(stmtCtx);

		this.sendNextToPlayer(playerEntityId, session, conversation);
	}

	public cancelDialogue(playerEntityId: string, silent = false): void {
		const session = this.sessions.get(playerEntityId);
		if (!session) return;

		const conversation = this.getConversation(session.conversationId);

		const ctx: ConversationEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: session.conversationId,
		};

		conversation?.onCancel?.(ctx);

		this.sessions.delete(playerEntityId);
		this.getStateMachine()?.enable();

		if (!silent) {
			const payload: DialogueCancelPayload = {
				npcEntityId: this.parent!,
				conversationId: session.conversationId,
			};
			this.sendToPlayer(playerEntityId, 'dialogue:cancel', payload);
		}
	}

	public hasActiveSession(playerEntityId: string): boolean {
		return this.sessions.has(playerEntityId);
	}

	// ── Internos ───────────────────────────────────────────────────────────────

	private endDialogue(playerEntityId: string, conversation: DialogueConversation): void {
		const session = this.sessions.get(playerEntityId);
		if (!session) return;

		const ctx: ConversationEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: conversation.id,
		};

		conversation.onEnd?.(ctx);

		if (!conversation.reusable) {
			const set = this.completedBy.get(conversation.id) ?? new Set<string>();
			set.add(playerEntityId);
			this.completedBy.set(conversation.id, set);
		}

		this.sessions.delete(playerEntityId);
		this.getStateMachine()?.enable();

		const payload: DialogueEndPayload = {
			npcEntityId: this.parent!,
			conversationId: conversation.id,
		};

		this.sendToPlayer(playerEntityId, 'dialogue:end', payload);
	}

	private pickConversation(playerEntityId: string): DialogueConversation | null {
		const available = this.config.conversations.filter((c) => {
			if (c.reusable) return true;
			return !this.completedBy.get(c.id)?.has(playerEntityId);
		});

		if (available.length === 0) return null;

		if (this.config.pickStrategy === 'sequential') {
			const conv = available[this.sequentialIndex % available.length];
			this.sequentialIndex++;
			return conv;
		}

		if (this.config.pickStrategy === 'weighted' && this.config.weights) {
			return this.pickWeighted(available);
		}

		// random (default)
		return available[Math.floor(Math.random() * available.length)];
	}

	private pickWeighted(available: DialogueConversation[]): DialogueConversation {
		const weights = this.config.weights ?? [];
		const totalWeight = available.reduce((sum, conv) => {
			const idx = this.config.conversations.indexOf(conv);
			return sum + (weights[idx] ?? 1);
		}, 0);

		let rand = Math.random() * totalWeight;

		for (const conv of available) {
			const idx = this.config.conversations.indexOf(conv);
			rand -= weights[idx] ?? 1;
			if (rand <= 0) return conv;
		}

		return available[available.length - 1];
	}

	private resolveStartStatement(
		conversation: DialogueConversation,
		_playerEntityId: string,
	): string {
		if (conversation.resumable) {
			// No hay sesión guardada aún, se empieza desde el root
			// En una implementación con persistencia se podría retomar aquí
		}
		return conversation.rootStatementId;
	}

	private getConversation(conversationId: string): DialogueConversation | null {
		return this.config.conversations.find((c) => c.id === conversationId) ?? null;
	}

	private buildStatementPayload(
		session: DialogueSession,
		conversation: DialogueConversation,
		_event: 'dialogue:start' | 'dialogue:next',
	): DialogueStartPayload | DialogueNextPayload {
		const statement = conversation.statements[session.currentStatementId] as DialogueStatement;

		const options = Object.values(statement.options).map(
			(opt: DialogueOption, index: number) => ({
				id: opt.id,
				text: opt.text,
				index,
			}),
		);

		return {
			npcEntityId: this.parent!,
			conversationId: session.conversationId,
			statementId: session.currentStatementId,
			text: statement.text,
			options,
		};
	}

	private sendStatementToPlayer(
		playerEntityId: string,
		session: DialogueSession,
		conversation: DialogueConversation,
	): void {
		const statement = conversation.statements[session.currentStatementId] as DialogueStatement;

		const stmtCtx: StatementEventCtx = {
			npcEntityId: this.parent!,
			playerEntityId,
			conversationId: session.conversationId,
			statementId: session.currentStatementId,
		};

		statement.onAsk?.(stmtCtx);

		const payload = this.buildStatementPayload(session, conversation, 'dialogue:start');
		this.sendToPlayer(playerEntityId, 'dialogue:start', payload);
	}

	private sendNextToPlayer(
		playerEntityId: string,
		session: DialogueSession,
		conversation: DialogueConversation,
	): void {
		const payload = this.buildStatementPayload(session, conversation, 'dialogue:next');
		this.sendToPlayer(playerEntityId, 'dialogue:next', payload);
	}

	private sendToPlayer(playerEntityId: string, event: string, payload: unknown): void {
		const client = this.room.clients.find(
			(c) => c.userData?.userInfo?.agent?.identifier === playerEntityId,
		);
		client?.send(event, payload);
	}
}
