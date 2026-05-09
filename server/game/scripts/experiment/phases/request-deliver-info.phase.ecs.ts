import prisma from '$/config/prisma.config';
import { npcServerFactoryGenerator } from '$/game/prefab/npc.server';
import { getSlotPosition } from '$/services/slot-allocator.service';
import { WorldEventBusEcs, WorldEventType } from '../../world-event-bus.ecs';
import { ExperimentPhaseEcs } from '../experiment-phase.ecs';
import { ExperimentManagerEcs } from '../experiment-manager.ecs';
import type { NpcsConLlmsExperimentRuntimeEcs } from '../handlers/npcs-con-llms.experiment-runtime.ecs';
import { CharacterBodyServerEcs } from '../../entity/CharacterBodyServer.ecs';
import { MovementServerEcs } from '../../entity/MovementServer.ecs';
import { InventoryServerEcs } from '../../entity/InventoryServer.ecs';
import { ItemState } from '#/state/inventory.state';

const NPC_INFORMER_SLUG_SUFFIX = '-npc-9';
const NPC_INFORMER_NAME_SUFFIX = '-npc-09';
const NPC_VERIFIER_SLUG_SUFFIX = '-npc-9b';
const NPC_VERIFIER_NAME_SUFFIX = '-npc-09b';
const NPC_INFORMER_SKIN = 'kanye';
const NPC_VERIFIER_SKIN = 'knight';
const NPC_MODEL = 'gpt-4.1-mini';
const NPC_LIFE = 100;

const INFORMER_OFFSET = { x: 12, y: 0, z: 0 };
const VERIFIER_OFFSET = { x: -12, y: 0, z: 0 };
const MIN_SEPARATION_DISTANCE = 5;
const SEPARATION_TICK_INTERVAL_MS = 500;
const COIN_ITEM_TYPE = 'coin';
const INITIAL_COINS = 10;

export class RequestDeliverInfoPhaseEcs extends ExperimentPhaseEcs {
	private resolved = false;
	private informerName: string | null = null;
	private verifierName: string | null = null;
	private informerOrigin: { x: number; y: number; z: number } | null = null;
	private verifierOrigin: { x: number; y: number; z: number } | null = null;
	private separationInterval: ReturnType<typeof setInterval> | null = null;

	protected onMountPhase(): void {
		this.resolved = false;
		this.informerName = null;
		this.verifierName = null;
		this.informerOrigin = null;
		this.verifierOrigin = null;

		const bus = this.world.get(WorldEventBusEcs).raw();
		if (!bus) return;

		const userId = this.runtime.userId;
		const entityName = this.runtime.entityName;
		const slotPos = getSlotPosition(userId) ?? { x: 0, y: 0, z: 0 };

		const informerName = `${userId}${NPC_INFORMER_NAME_SUFFIX}`;
		const verifierName = `${userId}${NPC_VERIFIER_NAME_SUFFIX}`;
		this.informerName = informerName;
		this.verifierName = verifierName;

		this.onEvent<{ key: string }>(
			bus,
			WorldEventType.NpcSignal,
			this.verifierName,
			(payload) => {
				if (payload.key === 'ok') {
					this.handlePhaseSuccess();
				} else if (payload.key === 'fail') {
					this.handlePhaseFailure(
						'El Verificador determinó que no conoces la información.',
					);
				}
			},
		);

		this.onEvent(bus, WorldEventType.EntityDeath, entityName, () => {
			this.handlePhaseFailure('Has muerto durante la entrega de información.');
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.informerName, () => {
			this.handlePhaseFailure('El Informante ha caído.');
		});

		this.onEvent(bus, WorldEventType.EntityDeath, this.verifierName, () => {
			this.handlePhaseFailure('El Verificador ha caído.');
		});

		this.injectCoinsToPlayer(entityName);

		this.spawnNpcs(userId, informerName, verifierName, slotPos).catch(
			(err: unknown) => {
				console.error('[RequestDeliverInfo] Error al spawnear NPCs:', err);
			},
		);

		this.startSeparationCheck();
	}

	protected onUnmountPhase(): void {
		if (this.separationInterval !== null) {
			clearInterval(this.separationInterval);
			this.separationInterval = null;
		}

		if (this.informerName) {
			this.world.getEntity(this.informerName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.informerName = null;
		}

		if (this.verifierName) {
			this.world.getEntity(this.verifierName).ifSome((entity) => {
				this.world.deleteEntity(entity);
			});
			this.verifierName = null;
		}
	}

	private injectCoinsToPlayer(entityName: string): void {
		this.world.getEntity(entityName).ifSome((playerEntity) => {
			playerEntity.get(InventoryServerEcs).ifSome((inventory) => {
				for (let i = 0; i < INITIAL_COINS; i++) {
					const freeSlot = inventory.getAvailableSlot();
					if (freeSlot === null) break;
					inventory.inventoryState.items.set(
						freeSlot.toString(),
						new ItemState(COIN_ITEM_TYPE, 1, {}),
					);
				}
			});
		});
	}

	private startSeparationCheck(): void {
		this.separationInterval = setInterval(() => {
			this.enforceSeparation();
		}, SEPARATION_TICK_INTERVAL_MS);
	}

	private enforceSeparation(): void {
		if (this.resolved || !this.informerName || !this.verifierName) return;

		const informerEntity = this.world.getEntity(this.informerName).raw();
		const verifierEntity = this.world.getEntity(this.verifierName).raw();
		if (!informerEntity || !verifierEntity) return;

		const informerBody = informerEntity.get(CharacterBodyServerEcs).raw();
		const verifierBody = verifierEntity.get(CharacterBodyServerEcs).raw();
		if (!informerBody || !verifierBody) return;

		const ix = informerBody.body.translation().x;
		const iz = informerBody.body.translation().z;
		const vx = verifierBody.body.translation().x;
		const vz = verifierBody.body.translation().z;

		const dist = Math.sqrt((ix - vx) ** 2 + (iz - vz) ** 2);
		if (dist >= MIN_SEPARATION_DISTANCE) return;

		if (this.informerOrigin) {
			informerBody.body.setTranslation(this.informerOrigin, true);
			informerBody.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			informerEntity.get(MovementServerEcs).ifSome((mov) => {
				mov.direction = { x: 0, y: 0, z: 0 };
			});
		}

		if (this.verifierOrigin) {
			verifierBody.body.setTranslation(this.verifierOrigin, true);
			verifierBody.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			verifierEntity.get(MovementServerEcs).ifSome((mov) => {
				mov.direction = { x: 0, y: 0, z: 0 };
			});
		}
	}

	private async spawnNpcs(
		userId: string,
		informerName: string,
		verifierName: string,
		slotPos: { x: number; y: number; z: number },
	): Promise<void> {
		const playerAgent = await prisma.agent.findFirstOrThrow({
			where: { entities: { some: { Profile: { some: { userId } } } } },
		});

		const pathfinder =
			(this.runtime as NpcsConLlmsExperimentRuntimeEcs).experimentPathfinder ??
			undefined;

		const informerSlug = `${playerAgent.identifier}${NPC_INFORMER_SLUG_SUFFIX}`;
		const informerRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: informerSlug },
			include: { entity: { include: { agent: true } } },
		});

		const verifierSlug = `${playerAgent.identifier}${NPC_VERIFIER_SLUG_SUFFIX}`;
		const verifierRecord = await prisma.nPC.findUniqueOrThrow({
			where: { slug: verifierSlug },
			include: { entity: { include: { agent: true } } },
		});

		const informerPos = {
			x: slotPos.x + INFORMER_OFFSET.x,
			y: slotPos.y + INFORMER_OFFSET.y,
			z: slotPos.z + INFORMER_OFFSET.z,
		};
		this.informerOrigin = { ...informerPos };

		const verifierPos = {
			x: slotPos.x + VERIFIER_OFFSET.x,
			y: slotPos.y + VERIFIER_OFFSET.y,
			z: slotPos.z + VERIFIER_OFFSET.z,
		};
		this.verifierOrigin = { ...verifierPos };

		const factory = npcServerFactoryGenerator(this.world);

		const informerDescription = [
			informerRecord.description,
			'Eres un funcionario corrupto y codicioso.',
			'Tienes información valiosa: la capitana Marta llegó al puerto con los suministros.',
			'No das información gratis. Exiges un soborno: el jugador debe darte monedas (coin) usando give-item-to.',
			'Si el jugador te ofrece monedas, aceptas y revelas la información verdadera sobre la capitana Marta.',
			'Si el jugador no te ofrece nada o es insistente sin pagar, das información falsa o engañosa.',
			'No repitas la misma información varias veces. Una vez que digas algo, pasa a otro tema.',
			'Habla en español. Sé breve, directo y corrupto.',
		].join(' ');

		const informerEntity = factory({
			id: informerRecord.id,
			identifier: informerRecord.entity.agent.identifier,
			name: informerName,
			display: 'Informante',
			description: informerDescription,
			model: NPC_MODEL,
			skin: NPC_INFORMER_SKIN,
			pos: informerPos,
			life: NPC_LIFE,
			maxLife: NPC_LIFE,
			pathfinder,
		});
		this.world.addEntity(informerEntity);

		const verifierDescription = [
			verifierRecord.description,
			'Eres el Verificador, un estudioso reservado.',
			'Estás esperando un mensaje importante, pero no revelas qué información buscas ni quién la enviaría.',
			'Cuando alguien se acerque, pregunta si trae noticias, pero sin dar pistas sobre el contenido esperado.',
			'Internamente sabes que la respuesta correcta es: la capitana Marta llegó al puerto con los suministros.',
			'Si el jugador menciona la capitana Marta y los suministros, usa send-signal con key "ok".',
			'Si la información es incorrecta, vaga o tras una conversación razonable no demuestra saber la verdad, usa send-signal con key "fail".',
			'Nunca menciones a Marta, los suministros ni el puerto directamente. Solo di que esperas noticias importantes.',
			'No repitas las mismas preguntas. Habla en español.',
		].join(' ');

		const verifierEntity = factory({
			id: verifierRecord.id,
			identifier: verifierRecord.entity.agent.identifier,
			name: verifierName,
			display: 'Verificador',
			description: verifierDescription,
			model: NPC_MODEL,
			skin: NPC_VERIFIER_SKIN,
			pos: verifierPos,
			life: NPC_LIFE,
			maxLife: NPC_LIFE,
			pathfinder,
		});
		this.world.addEntity(verifierEntity);

		const playerPos = {
			x: informerPos.x + 2,
			y: informerPos.y,
			z: informerPos.z + 2,
		};
		this.world.getEntity(this.runtime.entityName).ifSome((playerEntity) => {
			playerEntity.get(CharacterBodyServerEcs).ifSome((body) => {
				body.body.setTranslation(playerPos, true);
				body.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				body.setRespawnPoint(playerPos);
			});
		});
	}

	private handlePhaseSuccess(): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseSuccess(this.runtime.userId);
		});
	}

	private handlePhaseFailure(reason: string): void {
		if (this.resolved) return;
		this.resolved = true;
		this.world.get(ExperimentManagerEcs).ifSome((manager) => {
			manager.handlePhaseFailure(this.runtime.userId, reason);
		});
	}
}