import { z } from 'zod';

import { ComponentEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { actionsSchema } from '#/schema/actions.schema';

import * as LLMService from '$/services/llm.service';

import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';

import { NPCEventQueueEcs } from './npc-event-queue.ecs';
import { MessagesContextAI } from '../context-ai/messages.context';
import { ShortMemoryContextAI } from '../context-ai/short-memory.context';

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

	lastMessages = new MessagesContextAI();
	shortMemory = new ShortMemoryContextAI(20);

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

		this.lastMessages.onStart(this.world, this.parent);
		this.shortMemory.onStart(this.world, this.parent);
	}

	private systemContext(): string {
		return [
			'# NPC Behavior Context',
			'You are an autonomous NPC:',
			'- You have unique personality traits, goals, and motivations.',
			'- You have a context of the world, yourself, other entities and items.',
			'- You have to manage your limited resources (life, mood, inventory, short-term and long-term memory, etc.).',
			"- You can't break character.",
			'- You have to use all the information you have to make decisions.',
		].join('\n');
	}

	private actionContext(): string {
		const actionsDescription = [
			`{"type": "talk", "content": string, "targets": string[]} // empty targets means everyone`,
			// `{"type": "long-term-store", "value": string}`,
			// `{"type": "get-long-term-store", "value": string}`,
			// `{"type": "clear-long-term-store", "key": string}`,
			`{"type": "set-short-memory", "value": string} // save ideas, thoughts, goals or concepts in your short-term memory`,
			`{"type": "remove-short-memory", "key": string}`,
			// `{"type": "clear-short-term-store", "key": string}`,
			// `{"type": "emote", "value": "HAPPY" | "SAD" | "ANGRY" | "CONFUSED" | "SURPRISED" | "NEUTRAL"} // 3d emote to express your mood`,
			// `{"type": "pick-item", "itemId": string, "slot": i32(0...9)}`,
			// `{"type": "drop-item", "slot": i32(0...9)}`,
			`{"type": "follow-entity", "entityId": string}`,
			`{"type": "move-stop"}`,
			`{"type": "jump"}`,
			// `{"type": "follow-position", "x": number, "z": number}`,
		];

		return [
			'## Actions',
			'You are only allowed to response with valid JSON format called "Actions". "ONE LINE PER ACTION". You can use all the actions as you want. Actions do not have and order and are excuted in parallel. Actions are described in a JSON format with type supporting, Respect the types of each action. JUST LIST EACH ACTION, DO NOT CREATE A [] OR COMMA SEPARATED LIST.',
			'Actions you can take:',
			...actionsDescription,
		].join('\n');
	}

	buildContext(): string {
		const stats =
			this.record.getUnsafeRecord<z.infer<typeof statsSchema>>('stats');

		const statsContext = [
			'## NPC Stats',
			`- ID: ${stats.id}`,
			`- Name: ${stats.name}`,
			`- Description: ${stats.description ?? 'N/A'}`,
			`- Life: ${stats.life}`,
		].join('\n');

		const events = this.eventQueue.popEvents();
		const eventsContext = [
			'## NPC Events',
			...events.map((event, index) => `Event ${index + 1}: ${event.message}`),
		].join('\n');

		// Close entities
		const closeEntities = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity }) => entity.name !== this.parent)
			.map((other) => {
				const myPosition = this.character.body.translation();
				const otherPosition = other.component.body.translation();

				const distance = Math.hypot(
					myPosition.x - otherPosition.x,
					myPosition.z - otherPosition.z,
				);

				return {
					...other,
					distance: Math.round(distance * 100) / 100,
					position: {
						x: Math.round(otherPosition.x * 100) / 100,
						z: Math.round(otherPosition.z * 100) / 100,
					},
				};
			})
			.filter(({ distance }) => distance < 10)
			.toSorted((a, b) => a.distance - b.distance)
			.slice(0, 5)
			.map(
				({ entity, distance, position }, index) =>
					`(${index + 1}) ${entity
						.get(RecordEcs)
						.map((r) => r.getUnsafeRecord<{ name: string }>('stats')?.name)
						.orElse(
							entity.name,
						)}: ID=${entity.name}, Distance=${distance}, Position=${JSON.stringify(position)}`,
			);
		const entitiesContext = ['## Nearby Entities', ...closeEntities].join('\n');

		return [
			this.systemContext(),
			this.actionContext(),
			statsContext,
			eventsContext,
			entitiesContext,
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
