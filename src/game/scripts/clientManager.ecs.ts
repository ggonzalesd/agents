import { ComponentEcs } from '#/ecs/Component.ecs';
import { Option } from '#/utils/Option';
import { itemClientFactoryGenerator } from '../prefab/item.client';

import { playerClientFactoryGenerator } from '../prefab/player.client';
import { ColyseusClientEcs } from './colyseusClient.ecs';
import { UIClientEcs } from './uiClient.ecs';

export class ClientManagerEcs extends ComponentEcs {
	private colyseusClient: Option<ColyseusClientEcs> = Option.none();
	private uiClient: Option<UIClientEcs> = Option.none();

	private playerClientFactory: ReturnType<typeof playerClientFactoryGenerator> =
		null!;
	private itemClientFactory: ReturnType<typeof itemClientFactoryGenerator> =
		null!;

	private idMessage: string = '';

	constructor() {
		super();
	}

	onConnection() {
		const { proxy, room } = this.colyseusClient
			.map((c) => c.connection)
			.collapse()
			.unwrap('No ColyseusClientEcs found');

		proxy(room.state).players.onAdd((state, index) => {
			const player = this.playerClientFactory(index, state);
			this.world.addEntity(player);

			this.uiClient.ifSome((uiClient) => {
				uiClient.debug.add('Player ' + index, {
					isCode: false,
					type: 'error',
				});
			});
		});

		proxy(room.state).players.onRemove((state, index) => {
			this.world.deleteEntityById(index);
		});

		proxy(room.state).items.onAdd((state, index) => {
			const item = this.itemClientFactory(index, state);
			this.world.addEntity(item);

			console.log('Item added', state);
		});

		room.onMessage('message', (message) => {
			const uiClient = this.uiClient.raw();

			uiClient?.debug.add(message, {
				isCode: false,
				type: 'info',
			});
		});
	}

	onStart(): void {
		this.playerClientFactory = playerClientFactoryGenerator(this.world);
		this.itemClientFactory = itemClientFactoryGenerator(this.world);

		this.world.get(UIClientEcs).giveTo(this.uiClient);
		this.world.get(ColyseusClientEcs).giveTo(this.colyseusClient);

		// Execute onConnection if the Colyseus client is available
		this.colyseusClient.ifSome((client) => {
			this.callOnDelete(client.alarm.subscribe(this.onConnection.bind(this)));
			client.connect();
		});

		// TODO: Remove this
		// ? Testing LLMs Interface Service
		this.uiClient.ifSome((cli) => {
			this.callOnDelete(
				cli.actions.listen('manual-llm', () => {
					alert('Hello');
				}),
			);
		});

		this.uiClient.ifSome((uc) => {
			this.idMessage = uc.debug.add('Message', {
				deleteOn: 0,
				isCode: false,
				type: 'info',
			});

			this.callOnDelete(() => uc.debug.deleteMessage(this.idMessage));
		});
	}

	onLoop(_delta: number): void {
		this.uiClient.ifSome((uc) => {
			if (Math.random() < 0.1)
				uc.debug.updateMessage(this.idMessage, `D: ${Math.random()}`);

			if (uc.input.down('Escape') && !uc.input.isCursorLock()) {
				uc.game.setPause(true);
				uc.input.disabled = true;
			}
		});
	}
}
