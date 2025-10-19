import { mapSchema } from '#/schema/map.schema';

type Map = ReturnType<typeof mapSchema.parse>;

export const posRealToGrid = (
	pos: { x: number; z: number },
	map: Map,
): [number, number] => {
	const gridX = Math.floor((pos.x - map.offsetX) / map.scale);
	const gridY = Math.floor((pos.z - map.offsetY) / map.scale);

	return [gridX, gridY];
};

export const posGridToReal = (
	gridPos: { x: number; y: number },
	map: Map,
): { x: number; z: number } => {
	const realX = gridPos.x * map.scale + map.offsetX + map.scale / 2;
	const realZ = gridPos.y * map.scale + map.offsetY + map.scale / 2;

	return { x: realX, z: realZ };
};
