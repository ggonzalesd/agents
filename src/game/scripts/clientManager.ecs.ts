import { ComponentEcs } from '#/ecs/Component.ecs';
import { Option } from '#/utils/Option';

import { playerClientFactoryGenerator } from '../prefab/player.client';
import { ColyseusClientEcs } from './colyseusClient.ecs';
import { UIClientEcs } from './uiClient.ecs';

export class ClientManagerEcs extends ComponentEcs {
	private colyseusClient: Option<ColyseusClientEcs> = Option.none();
	private uiClient: Option<UIClientEcs> = Option.none();

	private playerClientFactory: ReturnType<typeof playerClientFactoryGenerator> =
		null!;

	constructor() {
		super();
	}

	onConnection() {
		const { proxy, room } = this.colyseusClient
			.map((c) => c.connection.unsafe())
			.unwrap('No ColyseusClientEcs found');

		proxy(room.state).players.onAdd((state, index) => {
			const player = this.playerClientFactory(index, state);
			this.world.addEntity(player);

			this.uiClient.ifSome((uiClient) => {
				uiClient.debugHook.add('Player ' + index, {
					isCode: false,
					type: 'error',
				});
			});
		});

		proxy(room.state).players.onRemove((state, index) => {
			this.world.deleteEntityById(index);
		});

		room.onMessage('message', (message) => {
			this.uiClient.ifSome((uiClient) => {
				uiClient.debugHook.add(message, {
					isCode: false,
					type: 'info',
				});
			});
		});
	}

	onStart(): void {
		this.playerClientFactory = playerClientFactoryGenerator(this.world);

		this.world.get(UIClientEcs).giveTo(this.uiClient);

		this.colyseusClient.copy(this.world.get(ColyseusClientEcs));

		this.colyseusClient.ifSome((client) => {
			this.callOnDelete(client.alarm.subscribe(this.onConnection.bind(this)));

			client.connect();
		});
	}

	onLoop(_delta: number): void {}
}
