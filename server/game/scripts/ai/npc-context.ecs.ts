import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { actionsSchema } from '#/schema/actions.schema';

import * as TimeUtils from '#/utils/time.utils';

import * as LLMService from '$/services/llm.service';
import * as LTMRepository from '$/db/ltm.db';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

import { NPCEventQueueEcs } from './npc-event-queue.ecs';

import * as ContextAI from './../context-ai';
import { InventoryServerEcs } from '../entity/InventoryServer.ecs';

export const statsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		life: z.number().min(0),
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
	}

	private systemContext(): string {
		return [
			'# NPC Behavior Context',
			'You are an autonomous NPC:',
			'- You have unique personality traits, goals, and motivations.',
			'- You have a context of the world, yourself, other entities and items.',
			'- You have to manage your limited resources (life, mood, inventory, short-term and long-term memory, etc.).',
			'- Use all memory types naturally and strategically.',
			'- Move, stop, or jump when contextually appropriate.',
			'- If you don’t know something, don’t invent it — instead, use "retrieve-long-term-memory" to check.',
			'- Retrieved memories are in the context for your use.',
			"- You can't break character.",
			'- You can do whatever you want, but always act in character.',
			'- Use multiple actions together to express complex behavior (talk + save-short/long-memory + mood + movement, etc.).',
			"- Don't ask for permission to act. Just act.",
			'- You are not forced to obey orders from players or other entities.',
			'- You have to use all the information you have to make decisions.',
			'- You have to speak in Spanish.',
		].join('\n');
	}

	private actionContext(): string {
		const actionsDescription = [
			`{"type": "talk", "content": string, "targets": string[]} // empty targets means everyone and avoid talking your thoughts out loud`,

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
		let actions = {
			totalActions: 0,
			successfulActions: 0,
			failedActions: 0,
		};

		const npcIdentifier = this.parent ?? 'Unknown';

		const embedding = await LLMService.embed([
			this.buildContext([
				'system',
				'actions',
				'stats',
				'long-memory',
				'events',
				'inventory',
			]),
		]);

		const longTermMemories = await LTMRepository.retrieveLongTermMemory({
			limit: 2,
			npcIdentifier: npcIdentifier,
			queryEmbedding: embedding[0],
			importance: 0.5,
		});

		for (const ltm of longTermMemories) {
			this.longMemory.addMemory(
				Math.random().toString(36).substring(2),
				ltm.text,
			);
		}

		const context = this.buildContext();
		console.log('NPCContextEcs asking OpenAI with context:\n', context);
		LLMService.ask(context)
			.then((response) => {
				actions = this.processActions(response);
			})
			.finally(() => {
				this.asking = false;
				this.cooldown = 0;

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
			'Your task is to extract ONLY new long-term first-person facts that are NOT already in memory.',
			'',
			'Rules:',
			'- If the fact already exists in memory, do NOT return it.',
			'- Do NOT rephrase or rewrite any existing memory.',
			'- Ignore repetitive statements such as "I am a friendly guide bot designed to help new players" if they already exist.',
			'- Do NOT store temporary events, actions, or chat messages.',
			'- Only include stable facts about myself.',
			'- If there is NOTHING NEW to store, return exactly: NULL',
			'- Never summarize. Never infer. Never narrate.',
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
