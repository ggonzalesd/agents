import type { MapSchema } from '#/maps/maps';

export interface IPathfinder {
    readonly map: MapSchema;
    getPathFromAtoB(
        start: [number, number],
        end: [number, number],
    ): Promise<{ result: [number, number][] }>;
}
