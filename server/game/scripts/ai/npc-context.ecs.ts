import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { actionsSchema } from '#/schema/actions.schema';

import * as TimeUtils from '#/utils/time.utils';

import * as LLMService from '$/services/llm.service';

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
			"- You can't break character.",
			'- You can do whatever you want, but always act in character.',
			'- Use multiple actions together to express complex behavior (talk + save-short/long-memory + mood + movement, etc.).',
			"- Don't ask for permission to act. Just act.",
			'- You are not forced to obey orders from players or other entities.',
			'- You have to use all the information you have to make decisions.',
		].join('\n');
	}

	private actionContext(): string {
		const actionsDescription = [
			`{"type": "talk", "content": string, "targets": string[]} // empty targets means everyone and avoid talking your thoughts out loud`,

			`{"type": "save-long-term-memory", "value": string} // save information permanently in your long-term memory. Use this with frequency.`,
			`{"type": "retrieve-long-term-memory", "value": string, "limit": i32(1...10)} // retrieve relevant memories from your long-term memory to help you make decisions`,
			// `{"type": "pop-long-term-store", "key": string} // just remove from the context but do not delete from the database`,
			// `{"type": "delete-long-term-memory", "key": string} // delete permanently from the database`,

			`{"type": "set-short-memory", "value": string} // save ideas or thoughts for right now, NOT FOR FUTURE reference`,
			`{"type": "remove-short-memory", "key": string}`,
			// `{"type": "clear-short-term-store", "key": string}`,

			`{"type": "set-mood", "mood": string, "value": i32(0...100)}`,
			`{"type": "remove-mood", "mood": string}`,
			// `{"type": "emote", "value": "HAPPY" | "SAD" | "ANGRY" | "CONFUSED" | "SURPRISED" | "NEUTRAL"} // 3d emote to express your mood`,

			`{"type": "pick-item", "itemId": string, "slot": i32(0...35)}`,
			// `{"type": "drop-item", "slot": i32(0...9)}`,

			`{"type": "move-follow-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-to-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-run-away-from-entity", "entityId": string, "distance": f32}`,
			// `{"type": "move-to-position", "x": f32, "z": f32}`,
			// `{"type": "move-explore"}`,
			`{"type": "move-stop"}`,
			// `{"type": "jump", "start-delay-sec": f32, "interval-sec": f32, "rounds": i32(1...10)}`,
			`{"type": "jump"}`,

			`{"type": "@request-acting-again", "time": f32} // request the system to call you to act again in X seconds`,
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

	buildContext(): string {
		this.eventQueue.popEvents();

		const events = this.eventQueue
			.getHistory()
			.map((e) => `- [${TimeUtils.timeAgo(e.date)}] ${e.message}`);
		const eventsContext = [
			`## Recent Events (Last ${events.length})`,
			events.length > 0 ? events.join('\n') : '- No recent events.',
		].join('\n');

		return [
			this.systemContext(),
			this.actionContext(),
			this.statsContext.toStringContext(),
			this.inventory ? this.inventory.toStringContext() : '- Inventory: None',
			eventsContext,
			this.closeEntities.toStringContext(),
			this.longMemory.toStringContext(),
			this.shortMemory.toStringContext(),
			this.lastMessages.toStringContext(),
		].join('\n\n');
	}

	actions: Array<z.infer<typeof actionsSchema>> = [];

	processActions(response: string) {
		const lines = response.split('\n');

		for (const line of lines) {
			if (line.trim() === '') continue;

			let lineObject: object = {};

			try {
				lineObject = JSON.parse(line);
			} catch (err) {
				console.warn('Failed to parse line as JSON:', line, err);
				continue;
			}

			const parsed = actionsSchema.safeParse(lineObject);

			if (parsed.success) {
				this.actions.push(parsed.data);
			} else {
				console.warn('Invalid action format, skipping line:', line);
			}
		}
	}

	cooldown: number = 0;
	asking: boolean = false;

	onLoop(_delta: number): void {
		// Check every 5 seconds
		this.cooldown += _delta / 1000;
		if (this.cooldown < 5) return;

		// Check if event queue is too light
		if (this.eventQueue.getWeight() < 10) return;

		// Avoid overlapping asks
		if (this.asking) return;
		this.asking = true;

		const context = this.buildContext();
		console.log('NPCContextEcs asking OpenAI with context:\n', context);
		LLMService.ask(context)
			.then((response) => {
				this.processActions(response);
			})
			.finally(() => {
				this.asking = false;
				this.cooldown = 0;
			});
	}
}
