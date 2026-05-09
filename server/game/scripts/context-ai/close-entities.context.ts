import type { WorldEcs, EntityEcs } from '#/ecs';
import { RecordEcs } from '#/ecs/lib/Record.ecs';
import { CharacterBodyServerEcs } from '../entity/CharacterBodyServer.ecs';
import type { IContextAI } from './context.interface';

export class CloseEntitiesContextAI implements IContextAI {
	private world: WorldEcs = null!;
	private parentId: string = null!;

	private character: CharacterBodyServerEcs = null!;

	onStart(world: WorldEcs, parent: EntityEcs): void {
		this.world = world;
		this.parentId = parent.name;

		this.character = parent
			.get(CharacterBodyServerEcs)
			.unwrap(
				'CharacterBodyServerEcs not found on CloseEntitiesContextAI parent entity',
			);
	}

	toStringContext(): string {
		const closeEntities = this.world
			.getFromEntitiesWith(CharacterBodyServerEcs)
			.filter(({ entity }) => entity.name !== this.parentId)
			.filter(({ entity }) => !entity.deleted)
			.filter(({ entity }) => {
				const stats = entity
					.get(RecordEcs)
					.map((r) => r.getUnsafeRecord<{ type?: string; kind?: string }>('stats'))
					.raw();
				return stats?.type == null && stats?.kind == null;
			})
		.map((other) => {
			const record = other.entity.get(RecordEcs);

			return {
				...other,
				// Get display name from record stats or use entity name
				display: record
					.map((r) => r.getUnsafeRecord<{ type: string }>('stats')?.type)
					.orElse(other.entity.name),
				description: record
					.map((r) => r.getUnsafeRecord<{ description: string }>('stats')?.description ?? null)
					.raw() ?? null,
			};
		})
			.map((other) => {
				if (!this.character.body.isValid()) return {
					...other,
					distance: Infinity,
					position: { x: 0, z: 0 },
				};

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
			({ entity, distance, position, display, description }, index) => {
				const name = entity
					.get(RecordEcs)
					.map((r) => r.getUnsafeRecord<{ name: string }>('stats')?.name)
					.orElse(entity.name);
				const base = `(${index + 1}) ${name}: ID=${entity.name}, Display=${display}, Distance=${distance}, Position=${JSON.stringify(position)}`;
				return description != null ? `${base}, Info=${description}` : base;
			},
		);
		const entitiesContext = ['## Nearby Entities', ...closeEntities].join('\n');
		return entitiesContext;
	}
}
