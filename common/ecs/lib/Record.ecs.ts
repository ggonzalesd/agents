import { Option } from '#/utils/Option';
import { ComponentEcs } from '../Component.ecs';

export class RecordEcs extends ComponentEcs {
	private data: Record<string, unknown>;

	constructor(initialData: Record<string, unknown>) {
		super();

		this.data = initialData;
	}

	setRecord<T>(key: string, value: T): void {
		this.data[key] = value;
	}

	/** Safe method to get a record by key.
	 */
	getRecord<T>(key: string): Option<T> {
		return Option.of(this.data[key] as T);
	}

	/**
	 * Unsafe method to get a record by key. Use with caution.
	 * @deprecated Use getRecord instead.
	 */
	getUnsafeRecord<T>(key: string): T {
		return this.data[key] as T;
	}

	/**
	 * Unsafe method to get a record by key. Use with caution.
	 * @deprecated Use getRecord instead.
	 */
	getUnsafeRecordOrDefault<T extends { [key: string]: unknown }>(
		key: string,
		defaultValue: Partial<T> = {},
	): Partial<T> {
		const v = this.data[key];

		if (v == null || typeof v !== 'object' || Array.isArray(v)) {
			this.data[key] = defaultValue;
			return defaultValue;
		}

		return v as Partial<T>;
	}
}
