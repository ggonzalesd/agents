import { ComponentEcs } from '#/ecs';
import type { IVec3 } from '#/utils/math.util';

import { animalServerFactoryGenerator } from '$/game/prefab/animal.server';

import { notifyNpcs } from '../missions/mission-action.handler';
import { ServerDataEcs } from '../serverData.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import {
	ANIMAL_SPAWN_CATALOG,
	COMMON_ANIMAL_POPULATIONS,
	RARE_ANIMAL_POPULATIONS,
	type AnimalPopulationCatalogEntry,
	type AnimalSpawnVariant,
} from './animal-spawn.catalog';
import {
	AnimalProfileEcs,
	type AnimalPopulationKey,
} from './animal-profile.ecs';

const COMMON_TICK_MS = 1_000;
const MIN_SPAWN_DISTANCE = 2;

interface WildlifeEventPayload {
	[key: string]: unknown;
	type: 'wildlife:event';
	populationKey: AnimalPopulationKey;
	title: string;
	message: string;
	x: number;
	y: number;
	z: number;
}

export class AnimalSpawnerManagerEcs extends ComponentEcs {
	private animalFactory!: ReturnType<typeof animalServerFactoryGenerator>;
	private nextCommonSpawnAt = new Map<AnimalPopulationKey, number>();
	private nextRareEventAt = new Map<AnimalPopulationKey, number>();
	private serverData: ServerDataEcs = null!;
	private spawnSequence = 0;
	private tickElapsedMs = 0;

	onStart(): void {
		this.serverData = this.world
			.get(ServerDataEcs)
			.unwrap('ServerDataEcs not found');

		this.animalFactory = animalServerFactoryGenerator(this.world);

		for (const populationKey of COMMON_ANIMAL_POPULATIONS) {
			const config = ANIMAL_SPAWN_CATALOG[populationKey];
			this.spawnInitialPopulation(config);
			this.nextCommonSpawnAt.set(
				populationKey,
				Date.now() + (config.respawnDelayMs ?? 0),
			);
		}

		for (const populationKey of RARE_ANIMAL_POPULATIONS) {
			const config = ANIMAL_SPAWN_CATALOG[populationKey];
			this.nextRareEventAt.set(
				populationKey,
				Date.now() + (config.eventIntervalMs ?? 0),
			);
		}
	}

	onLoop(delta: number): void {
		this.tickElapsedMs += delta;
		if (this.tickElapsedMs < COMMON_TICK_MS) return;
		this.tickElapsedMs = 0;

		const now = Date.now();

		for (const populationKey of COMMON_ANIMAL_POPULATIONS) {
			const config = ANIMAL_SPAWN_CATALOG[populationKey];
			const nextSpawnAt = this.nextCommonSpawnAt.get(populationKey) ?? 0;

			if (now < nextSpawnAt) continue;
			if (this.countAlive(populationKey) >= config.maxAlive) continue;

			this.spawnAnimal(config);
			this.nextCommonSpawnAt.set(
				populationKey,
				now + (config.respawnDelayMs ?? 0),
			);
		}

		for (const populationKey of RARE_ANIMAL_POPULATIONS) {
			const config = ANIMAL_SPAWN_CATALOG[populationKey];
			const nextEventAt = this.nextRareEventAt.get(populationKey) ?? 0;

			if (now < nextEventAt) continue;

			this.nextRareEventAt.set(
				populationKey,
				now + (config.eventIntervalMs ?? 0),
			);

			if (this.countAlive(populationKey) >= config.maxAlive) continue;
			if (Math.random() > (config.eventChance ?? 0)) continue;

			const firstSpawnPosition = this.spawnRareEventPopulation(config);
			if (!firstSpawnPosition) continue;

			this.broadcastRareEvent(config, firstSpawnPosition);
		}
	}

	private broadcastRareEvent(
		config: AnimalPopulationCatalogEntry,
		position: IVec3,
	): void {
		if (!config.eventTitle || !config.eventMessage) return;

		const payload: WildlifeEventPayload = {
			type: 'wildlife:event',
			populationKey: config.populationKey,
			title: config.eventTitle,
			message: config.eventMessage,
			x: position.x,
			y: position.y,
			z: position.z,
		};

		this.serverData.room.broadcast('wildlife:event', payload);
		notifyNpcs(
			this.world,
			`${config.eventMessage} Posición aproximada: (${Math.round(position.x)}, ${Math.round(position.z)}).`,
			payload,
		);
	}

	private countAlive(populationKey: AnimalPopulationKey): number {
		return this.world
			.getEntityLike({
				body: CharacterBodyServerEcs,
				profile: AnimalProfileEcs,
			})
			.filter(({ components: { body, profile } }) => {
				return !body.isDead && profile.profile.populationKey === populationKey;
			})
			.length;
	}

	private chooseVariant(config: AnimalPopulationCatalogEntry): AnimalSpawnVariant {
		const alivePositions = this.world
			.getEntityLike({
				body: CharacterBodyServerEcs,
				profile: AnimalProfileEcs,
			})
			.filter(({ components: { body, profile } }) => {
				return !body.isDead && profile.profile.populationKey === config.populationKey;
			})
			.map(({ components: { body } }) => body.body.translation());

		const availableVariants = config.variants.filter((variant) => {
			return alivePositions.every((position) => {
				const distance = Math.hypot(
					position.x - variant.pos.x,
					position.z - variant.pos.z,
				);
				return distance >= MIN_SPAWN_DISTANCE;
			});
		});

		const pool = availableVariants.length > 0 ? availableVariants : config.variants;
		return pool[Math.floor(Math.random() * pool.length)];
	}

	private createAnimalName(populationKey: AnimalPopulationKey): string {
		this.spawnSequence += 1;
		return `${populationKey}-${Date.now()}-${this.spawnSequence}`;
	}

	private spawnAnimal(config: AnimalPopulationCatalogEntry): IVec3 {
		const variant = this.chooseVariant(config);
		const entity = this.animalFactory({
			name: this.createAnimalName(config.populationKey),
			display: `${variant.display} ${this.spawnSequence + 1}`,
			pos: variant.pos,
			skin: variant.skin,
			life: variant.life,
			maxLife: variant.maxLife,
			profile: variant.profile,
		});

		this.world.addEntity(entity);
		return variant.pos;
	}

	private spawnInitialPopulation(config: AnimalPopulationCatalogEntry): void {
		for (let i = 0; i < config.maxAlive; i++) {
			const variant = config.variants[i % config.variants.length];
			const entity = this.animalFactory({
				name: this.createAnimalName(config.populationKey),
				display: `${variant.display} ${i + 1}`,
				pos: variant.pos,
				skin: variant.skin,
				life: variant.life,
				maxLife: variant.maxLife,
				profile: variant.profile,
			});

			this.world.addEntity(entity);
		}
	}

	private spawnRareEventPopulation(
		config: AnimalPopulationCatalogEntry,
	): IVec3 | null {
		const missingCount = config.maxAlive - this.countAlive(config.populationKey);
		if (missingCount <= 0) return null;

		let firstPosition: IVec3 | null = null;
		for (let i = 0; i < missingCount; i++) {
			const position = this.spawnAnimal(config);
			firstPosition ??= position;
		}

		return firstPosition;
	}
}
