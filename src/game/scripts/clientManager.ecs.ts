import { ComponentEcs } from '#/ecs/Component.ecs';
import { Option } from '#/utils/Option';
import { ColyseusClientEcs } from './colyseusClient.ecs';

export class ClientManagerEcs extends ComponentEcs {
	private colyseusClient: Option<ColyseusClientEcs> = Option.none();

	constructor() {
		super();
	}

	onConnection() {
		const { proxy, room } = this.colyseusClient
			.map((c) => c.connection.unsafe())
			.unsafe();

		room.onMessage('hello', (message) => {
			console.log('Received message:', message);
		});
	}

	onStart(): void {
		this.colyseusClient.copy(this.world.get(ColyseusClientEcs));

		this.colyseusClient.ifSome((client) => {
			this.callOnDelete(client.alarm.subscribe(this.onConnection.bind(this)));

			client.connect();
		});
	}

	onLoop(_delta: number): void {}
}
