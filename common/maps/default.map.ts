import { mapSchema } from '#/schema/map.schema';
import _defaultMap from './default.map.json';

export const defaultMap = mapSchema.parse(_defaultMap);

/** Tile values that block NPC pathfinding (walls, large rocks, tents, water, buildings, furniture) */
export const PATHFINDING_SOLID = new Set([1, 2, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18]);

/** Tile values that create physics colliders (solid structural obstacles) */
export const PHYSICS_SOLID = new Set([1, 2, 8]);
