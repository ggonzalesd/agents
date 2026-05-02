import { ComponentEcs } from '#/ecs/Component.ecs';
import { Option } from '#/utils/Option';
import { InputMode } from '@/utils/inputMode';
import { boxClientFactoryGenerator } from '../prefab/box.client';
import { itemClientFactoryGenerator } from '../prefab/item.client';
import { npcClientFactoryGenerator } from '../prefab/npc.client';

import { playerClientFactoryGenerator } from '../prefab/player.client';
import { ColyseusClientEcs } from './colyseus-client.ecs';
import { UIClientEcs } from './uiClient.ecs';

export class ClientManagerEcs extends ComponentEcs {
	private colyseusClient: Option<ColyseusClientEcs> = Option.none();
	private uiClient: Option<UIClientEcs> = Option.none();

	private playerClientFactory: ReturnType<typeof playerClientFactoryGenerator> =
		null!;
	private itemClientFactory: ReturnType<typeof itemClientFactoryGenerator> =
		null!;
	private boxClientFactory: ReturnType<typeof boxClientFactoryGenerator> =
		null!;

	private npcClientFactory: ReturnType<typeof npcClientFactoryGenerator> =
		null!;

	private idMessage: string = '';

	onConnection() {
		const { proxy, room } = this.colyseusClient
			.map((c) => c.connection)
			.collapse()
			.unwrap('No ColyseusClientEcs found');

		proxy(room.state).players.onAdd((state, index) => {
			const player = this.playerClientFactory(index, state);
			this.world.addEntity(player);

			if (room.sessionId === state.sessionId) {
				this.colyseusClient.ifSome((client) => {
					client.entityId = index;
				});
			}

			this.uiClient.ifSome((uiClient) => {
				uiClient.debug.add(`Player ${index}`, {
					isCode: false,
					type: 'error',
				});
			});
		});

		proxy(room.state).players.onRemove((_state, index) => {
			this.world.deleteEntityById(index);
		});

		proxy(room.state).items.onAdd((state, index) => {
			const item = this.itemClientFactory(index, state);
			this.world.addEntity(item);
		});

		proxy(room.state).items.onRemove((_state, index) => {
			this.world.deleteEntityById(index);
		});

		proxy(room.state).boxes.onAdd((state, index) => {
			const box = this.boxClientFactory(index, state);
			this.world.addEntity(box);
		});

		proxy(room.state).boxes.onRemove((_state, index) => {
			this.world.deleteEntityById(index);
		});

		proxy(room.state).npcs.onAdd((state, index) => {
			const npc = this.npcClientFactory(index, state, state.hasDialogue);
			this.world.addEntity(npc);
		});

		proxy(room.state).npcs.onRemove((_state, index) => {
			this.world.deleteEntityById(index);
		});

		room.onMessage('message', (message) => {
			const uiClient = this.uiClient.raw();

			uiClient?.debug.add(message, {
				isCode: false,
				type: 'info',
			});
		});

		room.onMessage('dialogue:debug', (data: { message: string; type: 'info' | 'warning' | 'error' }) => {
			this.uiClient.raw()?.debug.add(data.message, {
				isCode: false,
				type: data.type ?? 'info',
				deleteOn: 5000,
			});
		});

		room.onMessage('inventory:item_received', (data: { item: { type: string; quantity: number }; giverEntityId: string }) => {
			const uiClient = this.uiClient.raw();
			if (!uiClient) return;

			const giverName = data.giverEntityId;
			const skinUrl = `${import.meta.env.VITE_API_URL}/api/v1/skin/${giverName}.png`;

			uiClient.debug.success(
				`Recibiste ${data.item.quantity}x ${data.item.type} de ${giverName}`,
				{ imageUrl: skinUrl },
			);
		});
	}

	onStart(): void {
		this.playerClientFactory = playerClientFactoryGenerator(this.world);
		this.itemClientFactory = itemClientFactoryGenerator(this.world);
		this.boxClientFactory = boxClientFactoryGenerator(this.world);
		this.npcClientFactory = npcClientFactoryGenerator(this.world);

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
			if (uc.input.down('KeyP')) {
				const visible = uc.game.toggleNpcPaths();
				uc.debug.add(
					visible
						? 'Rutas de NPC visibles.'
						: 'Rutas de NPC ocultas.',
					{
						isCode: false,
						type: 'info',
						deleteOn: 2000,
					},
				);
			}

			if (Math.random() < 0.1)
				uc.debug.updateMessage(this.idMessage, `D: ${Math.random()}`);

			if (uc.input.down('Escape')) {
				if (uc.input.mode === InputMode.INTERACTIVE) {
					// INTERACTIVE → GAME: volver a pointer lock
					uc.input.setMode(InputMode.GAME);
				} else if (uc.input.mode === InputMode.GAME && !uc.input.isCursorLock()) {
					// GAME sin pointer lock → abrir menú
					uc.game.setPause(true);
					uc.input.setMode(InputMode.UI);
				}
			}
		});
	}
}
