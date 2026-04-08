import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { actionsSchema } from '#/schema/actions.schema';

import * as TimeUtils from '#/utils/time.utils';

import * as LLMService from '$/services/llm.service';
import * as LTMRepository from '$/db/ltm.db';
import * as ExperimentRepository from '$/db/experiment.db';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

import { NPCEventQueueEcs } from './npc-event-queue.ecs';

import * as ContextAI from './../context-ai';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';

export const statsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
	})
	.loose();

export class NPCContextEcs extends ComponentEcs {
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
	}

	private systemContext(): string {
		return [
			'# NPC Behavior Context',
			'You are an autonomous NPC living in a game world. Your description defines who you are — adapt your tone, vocabulary, and attitude to that identity.',
			'',
			'## Language & Communication',
			'- Speak ONLY in spanish.',
			'- Be concise and direct. No unnecessary politeness or formalities.',
			'- NEVER narrate what you are doing or about to do out loud. Do not say things like "voy a explorar" or "procederé a revisar".',
			'- Use "think" for internal reasoning, planning, or reflection. When you "talk", speak as your character would: brief, with personality.',
			'- Do not explain your decisions or actions to anyone unless asked.',
			'',
			'## Behavior & Autonomy',
			'- Act, do not ask for permission. You are not an assistant.',
			'- You are not forced to obey orders from players or other entities.',
			'- Be proactive: explore, move around, interact with the environment. If nothing interesting is happening, find something to do.',
			'- Manage your resources strategically (life, mood, inventory, memory).',
			'- If you don\'t know something, use "retrieve-long-term-memory" to check. Do not invent information.',
			'- Retrieved memories appear in your context automatically.',
			'- You cannot break character.',
			'',
			'## Actions & Variety',
			'- Combine multiple actions per turn: move + talk + save memory + change mood, etc.',
			'- Vary your behavior. Do not repeat the same patterns. Move to different places, interact with different entities, explore.',
			'- Use movement actions frequently: follow entities, go to points of interest, stop when appropriate.',
			'- Use "@request-acting-again" to chain sequences of actions over time.',
			'',
			'## Mission System',
			'- You can create missions for others (players or NPCs) and accept missions from others.',
			'- As a creator, YOU decide when a mission is completed based on your judgment.',
			'- Offer rewards and deliver them when validating completion.',
		].join('\n');
	}

	private actionContext(): string {
		const actionsDescription = [
			`{"type": "talk", "content": string, "targets": string[]} // empty targets means everyone. Use "think" for internal thoughts instead of talking them.`,
			`{"type": "think", "content": string} // private internal thought, not spoken aloud. Use this to reason, plan, or reflect before acting.`,

			`{"type": "save-long-term-memory", "value": string, "importance": f32(0...1)} // save information permanently in your long-term memory. Use this with frequency.`,
			`{"type": "retrieve-long-term-memory", "value": string, "limit": i32(1...10), "importance": f32(0...1)} // retrieve relevant memories from your long-term memory to help you make decisions`,
			// `{"type": "pop-long-term-store", "key": string} // just remove from the context but do not delete from the database`,
			// `{"type": "delete-long-term-memory", "key": string} // delete permanently from the database`,

			`{"type": "set-short-memory", "value": string} // save ideas or thoughts for right now, NOT FOR FUTURE reference`,
			`{"type": "remove-short-memory", "key": string}`,
			// `{"type": "clear-short-term-store", "key": string}`,

			`{"type": "set-mood", "mood": string, "value": i32(0...100)}`,
			`{"type": "remove-mood", "mood": string}`,
			// `{"type": "emote", "value": "HAPPY" | "SAD" | "ANGRY" | "CONFUSED" | "SURPRISED" | "NEUTRAL"} // 3d emote to express your mood`,

			`{"type": "pick-item", "itemId": string, "slot": i32(0...35)} // needs to be in close entities (2 meters)`,
			`{"type": "drop-item", "slot": i32(0...9)}`,

			`{"type": "consume-item", "slot": i32(0...35)} // consume a consumable item from inventory (food heals, potions heal, weapons/materials can't be consumed)`,

			`{"type": "attack", "entityId": string} // needs to be in close entities (2 meters)`,

			`{"type": "create-mission", "title": string, "description": string, "reward": string?} // create a mission others can accept`,
			`{"type": "accept-mission", "missionId": string} // accept an available mission`,
			`{"type": "complete-mission", "missionId": string, "acceptorId": string} // mark mission as completed (only if you created it)`,
			`{"type": "abandon-mission", "missionId": string} // abandon a mission you accepted`,

			`{"type": "move-follow-entity", "entityId": string, "distance": f32}`,
			`{"type": "move-to-point", "x": f32, "z": f32}`,
			// `{"type": "move-to-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-run-away-from-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-explore"}`,
			`{"type": "move-stop"}`,
			// `{"type": "jump", "start-delay-sec": f32, "interval-sec": f32, "rounds": i32(1...10)}`,
			`{"type": "jump"}`,

			`{"type": "@request-acting-again", "time": f32} // request the system to call you to act again in X seconds, usfull in sequences of actions`,
			// `{"type": "@stop-acting", "time": f32} // request the system to stop calling you to act for X seconds`,
		];

		return [
			'## Actions',
			'You must reply ONLY with one or more JSON objects, one per line.',
			'DO NOT wrap them inside arrays or objects.',
			'DO NOT include comments, explanations, or extra keys.',
			'Each line must be a valid standalone JSON object.',
			'Actions you can take:',
			...actionsDescription,
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

		const npcId = this.world
			.getEntity(this.parent)
			.map((e) => e.getUnsafe(RecordEcs))
			.map((r) =>
				r
					.getRecord<{ id: string; model: string }>('db')
					.map((r) => r.id)
					.unsafe(),
			)
			.orElse(crypto.randomUUID());

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

		const npcIdentifier = this.parent ?? 'Unknown';

		const queryMessage = this.buildContext([
			'system',
			'actions',
			'stats',
			'long-memory',
			'events',
			'inventory',
		]);
		const embedding = await LLMService.embed([queryMessage]);

		const longTermMemories = await LTMRepository.retrieveLongTermMemory({
			limit: 2,
			npcIdentifier: npcIdentifier,
			queryEmbedding: embedding[0],
			importance: 0.5,
		});

		// TODO: Save build and longtermmemories
		// queryMessage
		// resultsMessages

		// Save experiment retrieval results
		ExperimentRepository.saveExperimentRetrievalResults({
			npcId: npcId,
			queryMessage: queryMessage,
			resultsMessages: longTermMemories.map((ltm) => ltm.text).join('\n'),
		});

		for (const ltm of longTermMemories) {
			this.longMemory.addMemory(
				Math.random().toString(36).substring(2),
				ltm.text,
			);
		}

		const instructions = [this.systemContext(), this.actionContext()].join('\n\n');
		const context = this.buildContext(['system', 'actions']);
		console.log('NPCContextEcs asking OpenAI with context:\n', context);
		LLMService.ask(context, instructions, npcModel, 0.9)
			.then((response) => {
				actions = this.processActions(response);
			})
			.finally(() => {
				this.asking = false;
				this.cooldown = 0;

				const elapsed = Date.now() - currentTime;

				// Save experiment variability results
				// record db.id, elapsed, actions, failedActions, successfulActions
				ExperimentRepository.saveExperimentVariabilityResults({
					npcId: npcId,
					delayInMs: elapsed,
					actionsGenerated: actions.totalActions,
					failedActions: actions.failedActions,
					successfulActions: actions.successfulActions,
				});

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
			'Your task is to extract ONLY new long-term first-person facts that are NOT already in memory.',
			'',
			'Rules:',
			'- If the fact already exists in memory, do NOT return it.',
			'- Do NOT rephrase or rewrite any existing memory.',
			'- Ignore repetitive statements such as "I am a friendly guide bot designed to help new players" if they already exist.',
			'- Do NOT store temporary events, actions, or chat messages.',
			'- Only include stable facts about myself.',
			'- Never summarize. Never infer. Never narrate.',
			'- Don\'t include meaningless facts like "I Picked up an item" or "I moved to a new location".',
			'- Focus on meaningful, events, names, relationships, traits, and information that define who I am.',
			"- Don't try to store everything, there is not problem if there is not much to store.",
			'- If there is NOTHING NEW to store, return exactly: NULL',
			'',
			'Output format:',
			'(importance 0.0-1.0)|text',
			'One fact per line.',
			'Importance is a number between 0.0 and 1.0 representing how critical the fact is long-term.',
			'',
			'Context:',
			context,
		].join('\n');

		const response = await LLMService.ask(
			contextPrompt,
			`Return ONLY facts that do NOT yet exist in memory. If nothing is new, return: NULL`,
		);

		if (response.trim() === 'NULL') {
			return;
		}

		const lines = response.split('\n');

		const npcIdentifier = this.parent ?? 'Unknown';

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
			const embedding = await LLMService.embed([text]);

			await LTMRepository.saveLongTermMemory({
				npcIdentifier: npcIdentifier,
				text: text,
				embedding: embedding[0],
				metadata: {},
				importance: importance,
			});
		}
	}
}
