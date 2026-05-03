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
import type { NPCState } from '#/state/game.state';

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
	private readonly npcState: NPCState;
	private room: Room = null!;

	private readonly sessions = new Map<string, DialogueSession>();
	private sequentialIndex = 0;
	private readonly disabledConversations = new Set<string>();
	private readonly completedBy = new Map<string, Set<string>>();
	private readonly completedOneShots = new Set<string>();

	constructor(config: DialogueConfig, room: Room, npcState: NPCState) {
		super();
		this.config = config;
		this.room = room;
		this.npcState = npcState;

		for (const c of config.conversations) {
			if (c.enabled === false) {
				this.disabledConversations.add(c.id);
			}
		}

		this.updateHasOneShotDialogue();
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

	public enableConversation(conversationId: string): void {
		this.disabledConversations.delete(conversationId);
	}

	public disableConversation(conversationId: string): void {
		this.disabledConversations.add(conversationId);
	}

	public isConversationEnabled(conversationId: string): boolean {
		return !this.disabledConversations.has(conversationId);
	}

	public updateVariables(vars: Record<string, string>): void {
		this.config.variables = () => vars;
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

		if (conversation.oneShot) {
			this.completedOneShots.add(conversation.id);
			this.updateHasOneShotDialogue();
		} else if (!conversation.reusable) {
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
		const oneShotAvailable = this.config.conversations.filter((c) => {
			if (!c.oneShot) return false;
			if (this.completedOneShots.has(c.id)) return false;
			if (this.disabledConversations.has(c.id)) return false;
			return true;
		});

		if (oneShotAvailable.length > 0) {
			return this.pickFromPool(oneShotAvailable);
		}

		const available = this.config.conversations.filter((c) => {
			if (this.disabledConversations.has(c.id)) return false;
			if (c.oneShot) return false;
			if (c.reusable) return true;
			return !this.completedBy.get(c.id)?.has(playerEntityId);
		});

		if (available.length === 0) return null;

		return this.pickFromPool(available);
	}

	private pickFromPool(pool: DialogueConversation[]): DialogueConversation {
		if (this.config.pickStrategy === 'sequential') {
			const conv = pool[this.sequentialIndex % pool.length];
			this.sequentialIndex++;
			return conv;
		}

		if (this.config.pickStrategy === 'weighted' && this.config.weights) {
			return this.pickWeighted(pool);
		}

		return pool[Math.floor(Math.random() * pool.length)];
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

	private updateHasOneShotDialogue(): void {
		const hasOneShot = this.config.conversations.some(
			(c) => c.oneShot && !this.completedOneShots.has(c.id) && !this.disabledConversations.has(c.id),
		);
		this.npcState.hasOneShotDialogue = hasOneShot;
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

	private resolveText(text: string): string {
		if (!this.config.variables) return text;
		const vars = this.config.variables();
		let result = text;
		for (const [key, value] of Object.entries(vars)) {
			result = result.replaceAll(`%${key}%`, value);
		}
		return result;
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
				text: this.resolveText(opt.text),
				index,
			}),
		);

		return {
			npcEntityId: this.parent!,
			conversationId: session.conversationId,
			statementId: session.currentStatementId,
			text: this.resolveText(statement.text),
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
