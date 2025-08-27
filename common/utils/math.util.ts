export type IVec2 = {
	x: number;
	y: number;
};

export type IVec3 = {
	x: number;
	y: number;
	z: number;
};

export type IVec4 = {
	x: number;
	y: number;
	z: number;
	w: number;
};

export const vec2Normalize = (vec: IVec2): IVec2 => {
	const length = Math.sqrt(vec.x ** 2 + vec.y ** 2);
	return length > 0 ? { x: vec.x / length, y: vec.y / length } : { x: 0, y: 0 };
};

export const vec3dLerp = (a: IVec3, b: IVec3, t: number): IVec3 => {
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t,
	};
};

export const vec3Scale = (vec: IVec3, scalar: number): IVec3 => ({
	x: vec.x * scalar,
	y: vec.y * scalar,
	z: vec.z * scalar,
});

export const vec3Add = (a: IVec3, b: IVec3): IVec3 => ({
	x: a.x + b.x,
	y: a.y + b.y,
	z: a.z + b.z,
});

export const vec3Up = (value: number = 1): IVec3 => ({ x: 0, y: value, z: 0 });

export const vec4Scale = (vec: IVec4, scalar: number): IVec4 => ({
	x: vec.x * scalar,
	y: vec.y * scalar,
	z: vec.z * scalar,
	w: vec.w * scalar,
});

export const vec3Set = (target: IVec3, source: IVec3): void => {
	target.x = source.x;
	target.y = source.y;
	target.z = source.z;
};

export const vec4Set = (target: IVec4, source: IVec4): void => {
	target.x = source.x;
	target.y = source.y;
	target.z = source.z;
	target.w = source.w;
};

export const vec3Flatten = (vec: IVec3): [number, number, number] => [
	vec.x,
	vec.y,
	vec.z,
];

export const vec4Flatten = (vec: IVec4): [number, number, number, number] => [
	vec.x,
	vec.y,
	vec.z,
	vec.w,
];
