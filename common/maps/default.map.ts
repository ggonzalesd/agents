import { mapSchema } from '#/schema/map.schema';
import _defaultMap from './default.map.json';

export const defaultMap = mapSchema.parse(_defaultMap);
