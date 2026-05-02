import { z } from 'zod';

export const mapInstanceSchema = z.object({
	type: z.string(),
	x: z.number(),
	z: z.number(),
	y: z.number().default(0),
	metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const mapSchema = z
	.object({
		width: z.number().min(1),
		height: z.number().min(1),
		offsetX: z.number(),
		offsetY: z.number(),
		scale: z.number().min(0),
		map: z.string().min(1).array().min(1),
		alias: z.record(z.string().length(1), z.number().min(0)),
		instances: z.array(mapInstanceSchema).optional().default([]),
	})
	// Validate that the map dimensions match the width and height
	.refine((data) => data.map.length === data.height, {
		message: 'Map height does not match the number of rows',
	})
	.refine((data) => data.map.every((row) => row.length === data.width), {
		message: 'Map width does not match the number of columns in each row',
	})
	// make map to be a 2D array of numbers based on the alias
	.transform((data) => {
		const numericMap = data.map.map((row) =>
			row.split('').map((char) => {
				const value = data.alias[char];
				if (value === undefined) {
					return -1;
				}
				return value;
			}),
		);
		return {
			width: data.width,
			height: data.height,
			grid: numericMap,
			offsetX: data.offsetX,
			offsetY: data.offsetY,
			scale: data.scale,
			instances: data.instances,
		};
	});
