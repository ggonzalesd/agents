import { classicNpcServerFactoryGenerator } from '../../../prefab/classicNpc.server';
import { ClassicNpcBehaviorType } from '$/models/ClassicNPC.model';
import { ClassicNpcDialogueEcs } from '../../classic-npc/dialogue/classic-npc-dialogue.ecs';
import type { DialogueConfig } from '../../classic-npc/dialogue/dialogue.types';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { ServerDataEcs } from '../../serverData.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';

const SENDER_NPC_ID = 'msg-sender-npc';
const RECEIVER_NPC_ID = 'msg-receiver-npc';
const NPC_SKIN = 'kanye';

const SENDER_CONV_ID = 'msg-sender-conv';
const RECEIVER_CONV_ID = 'msg-receiver-conv';

export class DeliverMessagePhaseEcs extends ExperimentPhaseEcs {
	private senderNpcName: string | null = null;
	private receiverNpcName: string | null = null;
	private accepted = false;

	protected onMountPhase(): void {
		this.accepted = false;

		const serverData = this.world.get(ServerDataEcs).raw();
		if (!serverData) return;

		const userId = this.runtime.userId;
		const slotPos = getSlotPosition(userId);
		const basePos = slotPos ?? { x: 0, y: 0, z: 0 };

		const senderPos = { x: basePos.x + 3, y: basePos.y, z: basePos.z + 3 };
		const receiverPos = { x: basePos.x + 8, y: basePos.y, z: basePos.z + 3 };

		this.spawnSenderNpc(userId, senderPos, serverData.room);
		this.spawnReceiverNpc(userId, receiverPos, serverData.room);
	}

	protected onUnmountPhase(): void {
		if (this.senderNpcName) {
			this.world.getEntity(this.senderNpcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.senderNpcName = null;
		}
		if (this.receiverNpcName) {
			this.world.getEntity(this.receiverNpcName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.receiverNpcName = null;
		}
	}

	private enableReceiverConversation(): void {
		if (!this.receiverNpcName) return;
		this.world.getEntity(this.receiverNpcName).ifSome((entity) => {
			entity.get(ClassicNpcDialogueEcs).raw()?.enableConversation(RECEIVER_CONV_ID);
		});
	}

	private handlePhaseSuccess(): void {
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(): void {
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, 'No aceptaste entregar el mensaje.');
		});
	}

	private spawnSenderNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${SENDER_NPC_ID}-${userId}`;
		this.senderNpcName = npcName;

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			conversations: [
				{
					id: SENDER_CONV_ID,
					rootStatementId: 's_root',
					reusable: false,
					resumable: false,
					oneShot: true,
					enabled: true,
					statements: {
						s_root: {
							id: 's_root',
							text: '¡Eh, tú! Tengo un mensaje urgente para mi compañero que vive al otro lado del campamento. ¿Podrías llevárselo?',
							options: {
								o_accept: {
									id: 'o_accept',
									text: 'Claro, ¿qué debo decirle?',
									nextStatementId: 's_details',
								},
								o_refuse: {
									id: 'o_refuse',
									text: 'Lo siento, no puedo ayudarte ahora.',
									nextStatementId: 's_refuse',
								},
							},
						},
						s_details: {
							id: 's_details',
							text: 'Dile exactamente esto: "El cuervo vuela al amanecer". Él entenderá. ¡Gracias, viajero!',
							options: {
								o_deliver: {
									id: 'o_deliver',
									text: 'Entendido, se lo diré.',
									nextStatementId: null,
								},
							},
						},
						s_refuse: {
							id: 's_refuse',
							text: 'Lo entiendo... Gracias de todos modos.',
							options: {
								o_refuse_end: {
									id: 'o_refuse_end',
									text: 'De acuerdo.',
									nextStatementId: null,
								},
							},
						},
					},
				},
			],
		};

		const config: DialogueConfig = {
			...dialogueConfig,
			conversations: dialogueConfig.conversations.map((conv) => ({
				...conv,
				onEnd: () => {
					if (this.accepted) {
						this.enableReceiverConversation();
					} else {
						this.handlePhaseFailure();
					}
				},
				statements: Object.fromEntries(
					Object.entries(conv.statements).map(([stmtId, stmt]) => [
						stmtId,
						{
							...stmt,
							options: Object.fromEntries(
								Object.entries(stmt.options).map(([optId, opt]) => [
									optId,
									{
										...opt,
										onSelect:
											optId === 'o_accept'
												? () => {
														this.accepted = true;
													}
												: undefined,
									},
								]),
							),
						},
					]),
				),
			})),
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Mensajero',
			description: 'Un aldeano que necesita entregar un mensaje urgente.',
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 0,
				attackRange: 0,
				detectionRange: 8,
				attackDurationSec: 0,
				attackCooldownMs: 0,
				fleeHealthPercent: null,
				patrolRadius: 0,
				extraConfig: {},
			},
			dialogueConfig: config,
			room,
		});

		this.world.addEntity(npcEntity);
	}

	private spawnReceiverNpc(
		userId: string,
		pos: { x: number; y: number; z: number },
		room: import('colyseus').Room,
	): void {
		const npcName = `${RECEIVER_NPC_ID}-${userId}`;
		this.receiverNpcName = npcName;

		const dialogueConfig: DialogueConfig = {
			pickStrategy: 'sequential',
			conversations: [
				{
					id: RECEIVER_CONV_ID,
					rootStatementId: 's_root',
					reusable: false,
					resumable: false,
					oneShot: true,
					enabled: false,
					onEnd: () => {
						this.handlePhaseSuccess();
					},
					statements: {
						s_root: {
							id: 's_root',
							text: '¿Pasa algo? ¿Traes algún mensaje para mí?',
							options: {
								o_deliver: {
									id: 'o_deliver',
									text: 'Sí, me envía tu compañero. Dice: "El cuervo vuela al amanecer".',
									nextStatementId: 's_thanks',
								},
							},
						},
						s_thanks: {
							id: 's_thanks',
							text: '¡Por fin! Llevo días esperando esas palabras. Gracias, viajero, no sabes lo mucho que significa esto.',
							options: {
								o_end: {
									id: 'o_end',
									text: 'De nada. Me alegra poder ayudar.',
									nextStatementId: null,
								},
							},
						},
					},
				},
			],
		};

		const factory = classicNpcServerFactoryGenerator(this.world);
		const npcEntity = factory({
			id: npcName,
			name: npcName,
			display: 'Receptor',
			description: 'Un aldeano que espera un mensaje importante.',
			skin: NPC_SKIN,
			pos,
			life: 100,
			maxLife: 100,
			config: {
				id: npcName,
				npcId: npcName,
				behaviorType: ClassicNpcBehaviorType.PASSIVE,
				aggroRange: 0,
				attackRange: 0,
				detectionRange: 8,
				attackDurationSec: 0,
				attackCooldownMs: 0,
				fleeHealthPercent: null,
				patrolRadius: 0,
				extraConfig: {},
			},
			dialogueConfig,
			room,
		});

		this.world.addEntity(npcEntity);
	}
}
