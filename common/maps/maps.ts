import { mapSchema } from '#/schema/map.schema';
import { defaultMap } from './default.map';
import _experimentBasicMap from './experiment-basic.map.json';
import _escortLabyrinthMap from './escort-labyrinth.map.json';
import _followCircleMap from './follow-circle.json';

export { defaultMap };

export const experimentBasicMap = mapSchema.parse(_experimentBasicMap);
export const escortLabyrinthMap = mapSchema.parse(_escortLabyrinthMap);
export const followCircleMap = mapSchema.parse(_followCircleMap);

export enum MapKey {
    Default = 'default',
    ExperimentBasic = 'experiment-basic',
    EscortLabyrinth = 'escort-labyrinth',
    FollowCircle = 'follow-circle',
}

export type MapSchema = typeof defaultMap;

export const mapRegistry: Record<MapKey, MapSchema> = {
    [MapKey.Default]: defaultMap,
    [MapKey.ExperimentBasic]: experimentBasicMap,
    [MapKey.EscortLabyrinth]: escortLabyrinthMap,
    [MapKey.FollowCircle]: followCircleMap,
};
