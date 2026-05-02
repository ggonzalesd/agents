import type {
	DialogueOptionData,
	DialogueStatementData,
	DialogueConversationData,
	DialogueConfigData,
} from '#/schema/dialogue.schema';
import type { EntityEcs } from '#/ecs/Entity.ecs';
import type { WorldEcs } from '#/ecs/World.ecs';

export type ConversationId = string;
export type StatementId = string;
export type OptionId = string;

export type ConversationEventCtx = {
	npcEntityId: string;
	playerEntityId: string;
	conversationId: ConversationId;
};

export type StatementEventCtx = ConversationEventCtx & {
	statementId: StatementId;
};

export type OptionEventCtx = StatementEventCtx & {
	optionId: OptionId;
	optionIndex: number;
	nextStatementId: StatementId | null;
};

export type ResolveNextCtx = OptionEventCtx & {
	world: WorldEcs;
	npcEntity: EntityEcs;
	playerEntity: EntityEcs;
};

export type ResolveNextFn = (ctx: ResolveNextCtx) => StatementId | null;

export type ConversationHooks = {
	onStart?: (ctx: ConversationEventCtx) => void;
	onEnd?: (ctx: ConversationEventCtx) => void;
	onCancel?: (ctx: ConversationEventCtx) => void;
};

export type StatementHooks = {
	onAsk?: (ctx: StatementEventCtx) => void;
	onResponse?: (ctx: OptionEventCtx) => void;
};

export type OptionHooks = {
	onSelect?: (ctx: OptionEventCtx) => void;
	onHover?: (ctx: OptionEventCtx) => void;
	resolveNext?: ResolveNextFn;
};

export type DialogueOption = DialogueOptionData & OptionHooks;

export type DialogueStatement = Omit<DialogueStatementData, 'options'> & StatementHooks & {
	options: Record<OptionId, DialogueOption>;
};

export type DialogueConversation = Omit<DialogueConversationData, 'statements'> & ConversationHooks & {
	statements: Record<StatementId, DialogueStatement>;
};

export type DialogueConfig = Omit<DialogueConfigData, 'conversations'> & {
	conversations: DialogueConversation[];
};

export type DialogueSession = {
	conversationId: ConversationId;
	currentStatementId: StatementId;
	playerEntityId: string;
	startedAt: number;
};
