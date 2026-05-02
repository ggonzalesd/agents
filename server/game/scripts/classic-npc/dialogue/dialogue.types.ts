import type {
	DialogueOptionData,
	DialogueStatementData,
	DialogueConversationData,
	DialogueConfigData,
} from '#/schema/dialogue.schema';

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

export type DialogueOption = DialogueOptionData & {
	onSelect?: (ctx: OptionEventCtx) => void;
	onHover?: (ctx: OptionEventCtx) => void;
};

export type DialogueStatement = Omit<DialogueStatementData, 'options'> & {
	options: Record<OptionId, DialogueOption>;
	onAsk?: (ctx: StatementEventCtx) => void;
	onResponse?: (ctx: OptionEventCtx) => void;
};

export type DialogueConversation = Omit<DialogueConversationData, 'statements'> & {
	statements: Record<StatementId, DialogueStatement>;
	onStart?: (ctx: ConversationEventCtx) => void;
	onEnd?: (ctx: ConversationEventCtx) => void;
	onCancel?: (ctx: ConversationEventCtx) => void;
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
