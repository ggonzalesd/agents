import { mapSchema } from '#/schema/map.schema';
import { defaultMap } from './default.map';
import _experimentBasicMap from './experiment-basic.map.json';
import _escortLabyrinthMap from './escort-labyrinth.map.json';

export { defaultMap };

export const experimentBasicMap = mapSchema.parse(_experimentBasicMap);
export const escortLabyrinthMap = mapSchema.parse(_escortLabyrinthMap);

export enum MapKey {
    Default = 'default',
    ExperimentBasic = 'experiment-basic',
    EscortLabyrinth = 'escort-labyrinth',
}

export type MapSchema = typeof defaultMap;

export const mapRegistry: Record<MapKey, MapSchema> = {
    [MapKey.Default]: defaultMap,
    [MapKey.ExperimentBasic]: experimentBasicMap,
    [MapKey.EscortLabyrinth]: escortLabyrinthMap,
};
