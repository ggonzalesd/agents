import { mapSchema } from '#/schema/map.schema';
import { defaultMap } from './default.map';
import _experimentBasicMap from './experiment-basic.map.json';

export { defaultMap };

export const experimentBasicMap = mapSchema.parse(_experimentBasicMap);

export enum MapKey {
    Default = 'default',
    ExperimentBasic = 'experiment-basic',
}

export type MapSchema = typeof defaultMap;

export const mapRegistry: Record<MapKey, MapSchema> = {
    [MapKey.Default]: defaultMap,
    [MapKey.ExperimentBasic]: experimentBasicMap,
};
