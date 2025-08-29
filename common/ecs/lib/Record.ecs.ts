import { Option } from '#/utils/Option';
import { ComponentEcs } from '../Component.ecs';

export class RecordEcs extends ComponentEcs {
	private data: Record<string, unknown>;

	constructor(initialData: Record<string, unknown>) {
		super();

		this.data = initialData;
	}

	get<T>(key: string): Option<T> {
		return Option.of(this.data[key] as T);
	}
}
