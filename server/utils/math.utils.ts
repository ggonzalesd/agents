import type { IVec3 } from '#/utils/math.util';
import * as RAPIER from '@dimforge/rapier3d-compat';

export const vec3ToRapier = (v: IVec3) => new RAPIER.Vector3(v.x, v.y, v.z);

export const rapier3dUp = (value = 1) => new RAPIER.Vector3(0, value, 0);
