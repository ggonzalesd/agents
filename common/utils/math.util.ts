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

export const vec3Scale = (vec: IVec3, scalar: number): IVec3 => ({
	x: vec.x * scalar,
	y: vec.y * scalar,
	z: vec.z * scalar,
});

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
