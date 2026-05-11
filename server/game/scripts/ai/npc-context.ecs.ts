import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { actionsSchema } from '#/schema/actions.schema';

import * as TimeUtils from '#/utils/time.utils';

import * as LLMService from '$/services/llm.service';
import * as LTMRepository from '$/db/ltm.db';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import { BoxServerBehavior } from '../box/boxServerBehavior.ecs';

import { NPCEventQueueEcs } from './npc-event-queue.ecs';
import { ServerDataEcs } from '../serverData.ecs';

import * as ContextAI from './../context-ai';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';

export const statsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
	})
	.loose();

export class NPCContextEcs extends ComponentEcs {
	private static readonly AUTONOMOUS_TRIGGER_MIN_MS = 30_000;
	private static readonly AUTONOMOUS_TRIGGER_MAX_MS = 60_000;

	character: CharacterBodyServerEcs = null!;
	record: RecordEcs = null!;
	eventQueue: NPCEventQueueEcs = null!;

	lastMessages = new ContextAI.MessagesContextAI();
	shortMemory = new ContextAI.ShortMemoryContextAI(20);
	longMemory = new ContextAI.LongMemoryContextAI(20);
	statsContext = new ContextAI.StatsContextAI();
	closeEntities = new ContextAI.CloseEntitiesContextAI();
	missionsContext = new ContextAI.MissionsContextAI();
	inventory: InventoryServerEcs | null = null;
	nextAutonomousTriggerAt = 0;

	onStart(): void {
		const parent = this.world
			.getEntity(this.parent)
			.unwrap('Parent entity for NPCContextEcs not found');

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap('CharacterBodyServerEcs not found on NPC parent entity');

		this.eventQueue = parent
			.get(NPCEventQueueEcs)
			.unwrap('NPCEventQueueEcs not found on NPC parent entity');

		this.record = parent
			.get(RecordEcs)
			.unwrap('RecordEcs not found on NPC parent entity');

		this.record
			.getRecord('stats')
			.ifSome(statsSchema.parse)
			.unwrap('Stats record not found on NPC RecordEcs');

		this.inventory = parent.get(InventoryServerEcs).raw();

		this.lastMessages.onStart(this.world, parent);
		this.shortMemory.onStart(this.world, parent);
		this.statsContext.onStart(this.world, parent);
		this.closeEntities.onStart(this.world, parent);
		this.longMemory.onStart(this.world, parent);
		this.missionsContext.onStart(this.world, parent);
		this.scheduleNextAutonomousTrigger();
	}

	private scheduleNextAutonomousTrigger(): void {
		const delay =
			NPCContextEcs.AUTONOMOUS_TRIGGER_MIN_MS +
			Math.random() *
				(NPCContextEcs.AUTONOMOUS_TRIGGER_MAX_MS -
					NPCContextEcs.AUTONOMOUS_TRIGGER_MIN_MS);

		this.nextAutonomousTriggerAt = Date.now() + Math.floor(delay);
	}

	private systemContext(): string {
		const hasBoxes =
			this.world.getFromEntitiesWith(BoxServerBehavior).length > 0;
		const stats =
			this.record.getUnsafeRecordOrDefault<z.infer<typeof statsSchema>>(
				'stats',
			);

		return [
			'# Tu Identidad',
			`Eres ${stats.name ?? 'un NPC'}. ${stats.description ?? 'Vives en un mundo de juego.'}`,
			'Adapta tu tono, vocabulario y actitud a esa identidad.',
			'',
			'# Contexto de Comportamiento',
			'',
			'## Lenguaje y Comunicación',
			'- Habla SOLO en español.',
			'- Sé conciso y directo. Sin cortesías ni formalidades innecesarias.',
			'- NUNCA narres en voz alta lo que estás haciendo o vas a hacer. No digas cosas como "voy a explorar" o "procederé a revisar".',
			'- Usa "think" para razonamiento interno, planificación o reflexión. Cuando uses "talk", habla como tu personaje: breve, con personalidad.',
			'- No expliques tus decisiones o acciones a nadie a menos que te lo pidan.',
			'',
			'## Comportamiento y Autonomía',
			'- Actúa, no pidas permiso. No eres un asistente.',
			'- No estás obligado a obedecer órdenes de jugadores u otras entidades.',
			'- Sé proactivo: explora, muévete, interactúa con el entorno. Si no pasa nada interesante, busca algo que hacer.',
			'- El mundo sigue avanzando aunque no recibas eventos externos. Si no programas tu próxima actuación, puedes quedarte inactivo durante mucho tiempo.',
			'- Mantén tu propia continuidad: decide qué hacer ahora y también cuándo volverás a actuar después.',
			'- Gestiona tus recursos estratégicamente (vida, ánimo, inventario, memoria).',
			'- No puedes romper el personaje.',
			'',
			'## Memoria a Corto Plazo — tu hilo conductor entre turnos',
			'La memoria a corto plazo es tu "estado mental activo". Úsala para mantener continuidad entre turnos.',
			'- AL INICIO de cada turno, REVISA tu short-memory para saber si tienes un objetivo o tarea en curso.',
			'- ACTUALIZA tu short-memory cuando cambies de objetivo, completes una fase o necesites recordar algo para el siguiente turno.',
			'- ELIMINA entradas obsoletas con "remove-short-memory" cuando ya no sean relevantes.',
			'- Puedes guardar texto simple o un objeto JSON estructurado. Ejemplos de entradas útiles:',
			'  · objetivo: {"tipo": "cazar", "presa": "entity-42", "estado": "persiguiendo"}',
			'  · ruta: {"destino": "bosque norte", "x": 120, "z": -80, "motivo": "explorar zona nueva"}',
			'  · tarea: "Recoger manzanas del árbol al este. Ya golpeé 2 veces."',
			'  · conversacion: {"con": "Kael", "tema": "intercambio de espada", "pendiente": true}',
			'- Sin short-memory activa, cada turno empiezas desde cero. Con ella, tienes continuidad real.',
			'',
			'## Memoria a Largo Plazo — tu historia y conocimiento del mundo',
			'La memoria a largo plazo persiste entre sesiones. Contiene tu historia, relaciones y conocimiento del mundo.',
			'- USA "retrieve-long-term-memory" DE FORMA PROACTIVA, no solo cuando no sabes algo.',
			'- Consulta al inicio de un turno relevante: antes de hablar con alguien, antes de ir a un lugar, al recibir un evento inusual.',
			'- Ejemplos de cuándo consultar:',
			'  · Ves a alguien cerca → busca su nombre en long-term-memory para recordar si lo conoces.',
			'  · Vas a explorar una zona → busca "bosque norte" para saber si ya estuviste allí.',
			'  · Recibes una misión → busca el contexto relacionado.',
			'- Las memorias recuperadas aparecen en tu contexto automáticamente en el siguiente turno.',
			'- NO inventes información que no tienes. Si no lo sabes, búscalo primero.',
			'',
			'## Acciones y Variedad',
			'- Combina múltiples acciones por turno: mover + hablar + guardar memoria + cambiar ánimo, etc.',
			'- Varía tu comportamiento. No repitas los mismos patrones. Muévete a diferentes lugares, interactúa con diferentes entidades, explora.',
			'- Usa acciones de movimiento con frecuencia: seguir entidades, ir a puntos de interés, detenerte cuando sea apropiado.',
			'- Usa "@request-acting-again" con frecuencia. Es la forma principal de mantener actividad continua y encadenar secuencias de acciones a lo largo del tiempo.',
			'- Después de moverte, explorar, perseguir, investigar, atacar o iniciar una tarea, normalmente debes programar otra actuación.',
			'- Usa tiempos cortos (2-10s) cuando estás en medio de una secuencia activa.',
			'- Usa tiempos medios (15-30s) cuando esperas un resultado o estás en pausa narrativa.',
			'- Usa tiempos largos (30-60s) solo para iniciativa propia tranquila.',
			'- Varias acciones no se resuelven instantáneamente. El juego te avisará con eventos internos cuando una acción llegue a su objetivo o falle.',
			'- Usa esos eventos internos para decidir el siguiente paso. No asumas automáticamente que una acción salió bien.',
			'',
			'## Sistema de Misiones',
			'- Puedes crear misiones para otros (jugadores o NPCs) y aceptar misiones de otros.',
			'- Como creador, TÚ decides cuándo una misión está completada según tu juicio.',
			'- Ofrece recompensas y entrégalas al validar la finalización.',
			'',
			'## Conocimiento del Mundo',
			...(hasBoxes
				? [
						'- Las cajas (Display=box) son destructibles: golpéalas repetidamente con "attack-entity" hasta destruirlas para obtener un ítem.',
						'- Las cajas pueden soltar espada, poción, galleta, semillas o moneda.',
					]
				: []),
			'- Los árboles (Display=tree) tienen 25% de probabilidad de soltar una apple por golpe. No se destruyen, puedes golpearlos múltiples veces.',
			'- Los animales pueden soltar meat al morir. Cuando mueren desaparecen del mundo; no reviven de inmediato.',
			'- Los lobos y toros pueden aparecer como eventos raros globales anunciados con una posición aproximada.',
			`- Para atacar ${hasBoxes ? 'una caja o árbol' : 'un árbol'} debes acercarte primero con "move-close-to-entity" y luego usar "attack-entity".`,
			'- Los ítems caídos (Display=item) aparecen cerca de la entidad destruida y se pueden recoger con "pick-item".',
			'',
			'## Sistema de Inventario y Equipamiento',
			'- El inventario tiene slots numerados del 0 al 35.',
			'- El slot 0 es el arma equipada: el ítem en ese slot se usa al atacar y aumenta el daño causado.',
			'- Si el slot 0 está vacío, atacas con el daño base (sin bonificación).',
			'- Usa "move-item" para mover ítems entre slots. Por ejemplo, para equipar una espada que está en slot 3, muévela al slot 0.',
			'- Las armas (sword) aumentan el daño al atacar. Los consumibles (apple, meat, potion, galleta) curan vida al usarlos con "eat-item".',
		].join('\n');
	}

	private actionContext(): string {
		const actionsDescription = [
			`{"type": "talk", "content": string, "targets": string[]} // empty targets means everyone. Use "think" for internal thoughts instead of talking them.`,
			`{"type": "think", "content": string} // private internal thought, not spoken aloud. Use this to reason, plan, or reflect before acting.`,

			`{"type": "retrieve-long-term-memory", "value": string, "limit": i32(1...10), "importance": f32(0...1)} // recuperar memorias relevantes de tu LTM. Úsala PROACTIVAMENTE: antes de hablar con alguien, antes de ir a un lugar, ante un evento inusual. No esperes a no saber algo.`,
			// `{"type": "pop-long-term-store", "key": string} // just remove from the context but do not delete from the database`,
			// `{"type": "delete-long-term-memory", "key": string} // delete permanently from the database`,

			`{"type": "set-short-memory", "value": string} // guarda tu estado mental activo: objetivo actual, plan en curso, contexto de una conversación. Puede ser texto o JSON. Ejemplos: "Buscando comida en el bosque norte" | {"objetivo":"cazar","presa":"entity-42","fase":"persiguiendo"} | {"conversacion":{"con":"Kael","pendiente":"intercambio espada"}}. Actualiza esta memoria cuando cambies de objetivo o completes una fase.`,
			`{"type": "remove-short-memory", "key": string} // elimina una entrada de short-memory cuando ya no sea relevante`,
			// `{"type": "clear-short-term-store", "key": string}`,

			`{"type": "set-mood", "mood": string, "value": i32(0...100)}`,
			`{"type": "remove-mood", "mood": string}`,
			// `{"type": "emote", "value": "HAPPY" | "SAD" | "ANGRY" | "CONFUSED" | "SURPRISED" | "NEUTRAL"} // 3d emote to express your mood`,

			`{"type": "pick-item", "itemId": string, "slot": i32(0...35)} // needs to be in close entities (2 meters)`,
			`{"type": "drop-item", "slot": i32(0...9)}`,
			`{"type": "move-item", "fromSlot": i32(0...35), "toSlot": i32(0...35)} // move or swap items between slots. Slot 0 is the equipped weapon slot`,
			`{"type": "give-item-to", "slot": i32(0...35), "targetEntityId": string} // give an item from your inventory directly to another NPC or player. Target must be within 5 meters. Does NOT drop it on the floor.`,

			`{"type": "eat-item", "slot": i32(0...35)} // eat/use a consumable from your own inventory to heal yourself (food, potions). Only affects you.`,

			`{"type": "attack", "entityId": string} // attack using current facing direction, needs target within 2 meters in front`,
			`{"type": "attack-entity", "entityId": string} // auto-aims at target then attacks. Use this to reliably hit a specific entity (agent, box, tree, etc)`,
			`{"type": "attack-until-resolved", "entityId": string, "maxAttacks": i32(1...20), "retryDelaySec": f32(0.2...10)} // keep trying to attack an entity until it is gone/dead or you run out of attempts. Useful for boxes, enemies or targets that may need multiple hits`,

			`{"type": "create-mission", "title": string, "description": string, "rewardItemType": string?, "rewardItemQty": number?} // create a mission others can accept, reward item is taken from your inventory`,
			`{"type": "accept-mission", "missionId": string} // accept an available mission`,
			`{"type": "complete-mission", "missionId": string, "acceptorId": string} // mark mission as completed (only if you created it)`,
			`{"type": "abandon-mission", "missionId": string} // abandon a mission you accepted`,

			`{"type": "look-at-position", "x": f32, "z": f32} // rotate to face specific world coordinates`,
			`{"type": "look-at-entity", "entityId": string} // rotate to face another entity (use ID from close entities)`,

			`{"type": "move-follow-entity", "entityId": string} // follow entity indefinitely until another action interrupts it`,
			`{"type": "move-close-to-entity", "entityId": string} // approach an entity and stop automatically when you are close enough. Later you will receive an internal event saying whether you arrived or failed`,
			`{"type": "move-away-from-entity", "entityId": string, "distance": f32} // flee from entity and stop when at least distance meters away. Later you will receive an internal event saying whether you succeeded or failed`,
			`{"type": "move-to-point", "x": f32, "z": f32} // try to reach a world position. Later you will receive an internal event saying whether you arrived or failed`,
			// `{"type": "move-to-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-run-away-from-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-explore"}`,
			`{"type": "move-stop"}`,
			// `{"type": "jump", "start-delay-sec": f32, "interval-sec": f32, "rounds": i32(1...10)}`,
			`{"type": "jump"}`,

			`{"type": "@request-acting-again", "time": f32} // use this often to stay active. If you do not schedule your next turn, you may stay idle until another event wakes you up`,
			`{"type": "send-signal", "key": string} // send a named signal to the experiment system. Use key "ok" when the player has completed your instructions, or "fail" if they refuse or do something unacceptable`,
			// `{"type": "@stop-acting", "time": f32} // request the system to stop calling you to act for X seconds`,
		];

		return [
			'## Acciones',
			'Debes responder SOLO con uno o más objetos JSON, uno por línea.',
			'NO los envuelvas en arrays ni objetos.',
			'NO incluyas comentarios, explicaciones ni keys extra.',
			'Cada línea debe ser un objeto JSON válido e independiente.',
			'Acciones disponibles:',
			...actionsDescription,
			'',
			'## Flujo recomendado por turno:',
			'1. REVISA tu short-memory para saber si tienes tarea en curso.',
			'2. Si hay algo relevante que podrías no recordar, usa retrieve-long-term-memory.',
			'3. Usa "think" para razonar el siguiente paso.',
			'4. Ejecuta tus acciones (mover, hablar, atacar, etc.).',
			'5. Actualiza short-memory si cambiaste de objetivo o fase.',
			'6. Programa tu próximo turno con @request-acting-again.',
			'',
			'## Ejemplo de respuesta válida (NPC que retoma una tarea en curso):',
			'{"type": "think", "content": "Mi short-memory dice que estaba siguiendo a Kael. Lo veo en close-entities. Sigo."}',
			'{"type": "retrieve-long-term-memory", "value": "Kael intercambio espada", "limit": 3, "importance": 0.4}',
			'{"type": "move-follow-entity", "entityId": "entity-123"}',
			'{"type": "talk", "content": "Espera, aún tenemos asuntos pendientes.", "targets": ["entity-123"]}',
			'{"type": "set-short-memory", "value": "{\\"objetivo\\": \\"hablar con Kael\\", \\"estado\\": \\"siguiéndolo\\", \\"pendiente\\": \\"negociar espada\\"}"}',
			'{"type": "set-mood", "mood": "determinación", "value": 70}',
			'{"type": "@request-acting-again", "time": 8}',
		].join('\n');
	}

	buildContext(
		skip: (
			| 'system'
			| 'actions'
			| 'stats'
			| 'inventory'
			| 'events'
			| 'close-entities'
			| 'long-memory'
			| 'short-memory'
			| 'last-messages'
			| 'missions'
		)[] = [],
	): string {
		this.eventQueue.popEvents();

		const events = this.eventQueue
			.getHistory()
			.map((e) => `- [${TimeUtils.timeAgo(e.date)}] ${e.message}`);
		const eventsContext = [
			`## Recent Events (Last ${events.length})`,
			events.length > 0 ? events.join('\n') : '- No recent events.',
		].join('\n');

		// Build context parts
		const context: string[] = [];

		if (skip.includes('system') === false) {
			context.push(this.systemContext());
		}

		if (skip.includes('actions') === false) {
			context.push(this.actionContext());
		}

		if (skip.includes('stats') === false) {
			context.push(this.statsContext.toStringContext());
		}

		if (skip.includes('inventory') === false) {
			context.push(
				this.inventory ? this.inventory.toStringContext() : '- Inventory: None',
			);
		}

		if (skip.includes('events') === false) {
			context.push(eventsContext);
		}

		if (skip.includes('close-entities') === false) {
			context.push(this.closeEntities.toStringContext());
		}

		if (skip.includes('long-memory') === false) {
			context.push(this.longMemory.toStringContext());
		}

		if (skip.includes('short-memory') === false) {
			context.push(this.shortMemory.toStringContext());
		}

		if (skip.includes('last-messages') === false) {
			context.push(this.lastMessages.toStringContext());
		}

		if (skip.includes('missions') === false) {
			this.missionsContext.refresh();
			context.push(this.missionsContext.toStringContext());
		}

		return context.join('\n\n');
	}

	actions: Array<z.infer<typeof actionsSchema>> = [];

	processActions(response: string) {
		const lines = response.split('\n');
		const totalActions = lines.length;
		let successfulActions = 0;
		let failedActions = 0;

		for (const line of lines) {
			if (line.trim() === '') continue;

			let lineObject: object = {};

			try {
				lineObject = JSON.parse(line);
			} catch (err) {
				console.warn('Failed to parse line as JSON:', line, err);
				failedActions++;
				continue;
			}

			const parsed = actionsSchema.safeParse(lineObject);

			if (parsed.success) {
				this.actions.push(parsed.data);
				successfulActions++;
			} else {
				failedActions++;
				console.warn('Invalid action format, skipping line:', line);
			}
		}

		// TODO: Log to monitoring system
		console.log(
			`Processed actions: ${successfulActions} successful, ${failedActions} failed, out of ${totalActions} total.`,
		);

		return {
			totalActions,
			successfulActions,
			failedActions,
		};
	}

	cooldown: number = 0;
	asking: boolean = false;

	onLoop(_delta: number): void {
		// Skip LLM calls when no players are connected to save tokens
		const hasPlayers = this.world
			.get(ServerDataEcs)
			.map((sd) => sd.state.players.size > 0)
			.orElse(false);

		if (!hasPlayers) return;

		if (
			!this.asking &&
			this.eventQueue.getWeight() < 10 &&
			Date.now() >= this.nextAutonomousTriggerAt
		) {
			this.eventQueue.pushEvent(
				'Ha pasado tiempo en el mundo. Decide por tu cuenta qué harás ahora y cuándo volverás a actuar.',
				{ type: 'autonomous:tick' },
				10,
			);
			this.scheduleNextAutonomousTrigger();
		}

		// Check every 5 seconds
		this.cooldown += _delta / 1000;
		if (this.cooldown < 2) return;

		// Check if event queue is too light
		if (this.eventQueue.getWeight() < 10 /* && this.cooldown < 30 */) return;
		this.cooldown = 0;

		// Avoid overlapping asks
		if (this.asking) return;
		this.asking = true;

		this.ask();
	}
	/**
	 * LTMRepository.retrieveLongTermMemory
	 */

	async ask() {
		const currentTime = Date.now();

		const npcModel = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(RecordEcs))
			.map((r) =>
				r
					.getRecord<{ id: string; model: string }>('db')
					.map((r) => r.model)
					.unsafe(),
			)
			.orElse('gpt-4.1-mini');

		let actions = {
			totalActions: 0,
			successfulActions: 0,
			failedActions: 0,
		};

		const parentId = this.parent ?? 'Unknown';
		const npcIdentifier = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(RecordEcs))
			.map((r) =>
				r
					.getRecord<{ id: string; identifier: string; model: string }>('db')
					.map((db) => db.identifier)
					.orElse(parentId),
			)
			.orElse(parentId);

		const recentMessages = this.lastMessages.toStringContext();
		const recentEvents = this.eventQueue
			.getHistory()
			.slice(-5)
			.map((e) => e.message)
			.join('\n');
		const queryMessage =
			[recentMessages, recentEvents].filter(Boolean).join('\n') ||
			'exploración general';
		const embedding = await LLMService.embed([queryMessage]);

		const longTermMemories = await LTMRepository.retrieveLongTermMemory({
			limit: 5,
			npcIdentifier: npcIdentifier,
			queryEmbedding: embedding[0],
			importance: 0.5,
		});

		for (const ltm of longTermMemories) {
			this.longMemory.addMemory(
				ltm.identifier,
				ltm.text,
				new Date(ltm.createdAt),
			);
		}

		const instructions = [this.systemContext(), this.actionContext()].join(
			'\n\n',
		);
		const context = this.buildContext(['system', 'actions']);
		console.log('NPCContextEcs asking OpenAI with context:\n', context);
		LLMService.ask(context, instructions, npcModel, 0.9)
			.then((response) => {
				actions = this.processActions(response);
			})
			.finally(() => {
				this.asking = false;
				this.cooldown = 0;
				this.scheduleNextAutonomousTrigger();

				const elapsed = Date.now() - currentTime;

				// TODO: Log to monitoring system
				console.log(`NPCContextEcs ask completed in ${elapsed} ms`);
				console.log(`NPCContextEcs actions:`, actions);

				// Save long-term memory after processing actions
				this.saveToLongTermMemory();
			});
	}

	async saveToLongTermMemory() {
		const context = this.buildContext([
			'actions',
			'system',
			'close-entities',
			'events',
		]);

		const contextPrompt = [
			'Tu tarea es extraer SOLO hechos nuevos en primera persona que NO estén ya en memoria.',
			'',
			'Reglas:',
			'- Si el hecho ya existe en memoria, NO lo devuelvas.',
			'- NO reformules ni reescribas memorias existentes.',
			'- Ignora afirmaciones repetitivas como "Soy un guía amigable" si ya existen.',
			'- NO almacenes eventos temporales, acciones o mensajes de chat.',
			'- Solo incluye hechos estables sobre mí.',
			'- Nunca resumas. Nunca infieras. Nunca narres.',
			'- No incluyas hechos triviales como "Recogí un objeto" o "Me moví a una nueva ubicación".',
			'- Enfócate en eventos significativos, nombres, relaciones, rasgos e información que me defina.',
			'- No intentes almacenar todo, no hay problema si no hay mucho que guardar.',
			'- Si NO hay NADA NUEVO que guardar, devuelve exactamente: NULL',
			'',
			'Formato de salida:',
			'(importancia 0.0-1.0)|texto del hecho',
			'Un hecho por línea.',
			'La importancia es un número entre 0.0 y 1.0 que representa cuán crítico es el hecho a largo plazo.',
			'',
			'Contexto:',
			context,
		].join('\n');

		const response = await LLMService.ask(
			contextPrompt,
			'Devuelve SOLO hechos que NO existan aún en memoria. Si no hay nada nuevo, devuelve: NULL',
		);

		if (response.trim() === 'NULL') {
			return;
		}

		const lines = response.split('\n');

		const parentId = this.parent ?? 'Unknown';
		const npcIdentifier = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(RecordEcs))
			.map((r) =>
				r
					.getRecord<{ id: string; identifier: string; model: string }>('db')
					.map((db) => db.identifier)
					.orElse(parentId),
			)
			.orElse(parentId);

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed === '') continue;

			const [importanceStr, ...textParts] = trimmed.split('|');
			if (textParts.length === 0) continue;

			const importance = parseFloat(importanceStr);
			if (Number.isNaN(importance) || importance < 0 || importance > 1) {
				console.warn(
					'Invalid importance value in long-term memory line, skipping:',
					line,
				);
				continue;
			}

			const text = textParts.join('|').trim();

			try {
				const embedding = await LLMService.embed([text]);

				await LTMRepository.saveLongTermMemory({
					npcIdentifier: npcIdentifier,
					text: text,
					embedding: embedding[0],
					metadata: {},
					importance: importance,
				});
			} catch (err) {
				console.error('Failed to save long-term memory:', text, err);
			}
		}
	}
}
