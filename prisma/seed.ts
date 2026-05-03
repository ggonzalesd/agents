import {
	BehaviorType,
	PrismaClient,
	Role,
} from './../server/generated/prisma/client';
import envConfig from './../server/config/env.config';

import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createPlayer(props: {
	username: string;
	password: string;
	display: string;
	identifier: string;
	role?: Role;
}) {
	const password = bcrypt.hashSync(props.password, 10);

	const player = await prisma.user.upsert({
		where: {
			username: props.username,
		},
		create: {
			password,
			username: props.username,
			role: props.role || Role.USER,
		},
		update: {
			password,
			role: props.role || Role.USER,
		},
	});

	const agent = await prisma.agent.upsert({
		where: {
			identifier: props.identifier,
		},
		create: {
			display: props.display,
			identifier: props.identifier,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
		update: {
			display: props.display,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
	});

	const entity = await prisma.entity.upsert({
		where: {
			id: agent.id,
		},
		create: {
			id: agent.id,
		},
		update: {},
	});

	const profile = await prisma.profile.upsert({
		where: {
			entityId: entity.id,
		},
		create: {
			userId: player.id,
			entityId: entity.id,
		},
		update: {
			userId: player.id,
		},
	});

	return { player, agent, entity, profile };
}

async function createNPC(props: {
	display: string;
	identifier: string;
	model: string;
	skinUrl: string;
	description?: string;
}) {
	const agent = await prisma.agent.upsert({
		where: {
			identifier: props.identifier,
		},
		create: {
			display: props.display,
			identifier: props.identifier,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
		update: {
			display: props.display,
			metadata: {},
			positionX: 0,
			positionY: 0,
			positionZ: 0,
			rotation: 0,
		},
	});

	const entity = await prisma.entity.upsert({
		where: {
			id: agent.id,
		},
		create: {
			id: agent.id,
		},
		update: {},
	});

	const npc = await prisma.nPC.upsert({
		where: {
			id: entity.id,
		},
		create: {
			id: entity.id,
			description: props.description || '',
			model: props.model,
			skinUrl: props.skinUrl,
		},
		update: {
			description: props.description || '',
			model: props.model,
			skinUrl: props.skinUrl,
		},
	});

	return { agent, entity, npc };
}

async function createClassicNPC(props: {
	display: string;
	identifier: string;
	skinUrl: string;
	description?: string;
	behaviorType: BehaviorType;
	position?: {
		x: number;
		y: number;
		z: number;
	};
	config?: {
		aggroRange?: number;
		attackRange?: number;
		detectionRange?: number;
		attackDurationSec?: number;
		attackCooldownMs?: number;
		fleeHealthPercent?: number | null;
		patrolRadius?: number;
		maxLife?: number;
		life?: number;
		rotation?: number;
	};
}) {
	const position = props.position ?? { x: 2, y: 0, z: 2 };
	const config = props.config ?? {};

	const result = await prisma.$transaction(async (tx) => {
		const agent = await tx.agent.upsert({
			where: {
				identifier: props.identifier,
			},
			create: {
				display: props.display,
				identifier: props.identifier,
				metadata: {},
				positionX: position.x,
				positionY: position.y,
				positionZ: position.z,
				rotation: config.rotation ?? 0,
			},
			update: {
				display: props.display,
				metadata: {},
				positionX: position.x,
				positionY: position.y,
				positionZ: position.z,
				rotation: config.rotation ?? 0,
			},
		});

		const entity = await tx.entity.upsert({
			where: {
				id: agent.id,
			},
			create: {
				id: agent.id,
				life: config.life ?? 100,
				maxLife: config.maxLife ?? 100,
			},
			update: {
				life: config.life ?? 100,
				maxLife: config.maxLife ?? 100,
			},
		});

		const classicNpc = await tx.classicNPC.upsert({
			where: {
				id: entity.id,
			},
			create: {
				id: entity.id,
				description: props.description ?? '',
				skinUrl: props.skinUrl,
			},
			update: {
				description: props.description ?? '',
				skinUrl: props.skinUrl,
			},
		});

		const classicNpcConfig = await tx.classicNpcConfig.upsert({
			where: {
				npcId: classicNpc.id,
			},
			create: {
				npcId: classicNpc.id,
				behaviorType: props.behaviorType,
				aggroRange: config.aggroRange ?? 10,
				attackRange: config.attackRange ?? 2,
				detectionRange: config.detectionRange ?? 15,
				attackDurationSec: config.attackDurationSec ?? 10,
				attackCooldownMs: config.attackCooldownMs ?? 1500,
				fleeHealthPercent: config.fleeHealthPercent ?? null,
				patrolRadius: config.patrolRadius ?? 8,
				extraConfig: {},
			},
			update: {
				behaviorType: props.behaviorType,
				aggroRange: config.aggroRange ?? 10,
				attackRange: config.attackRange ?? 2,
				detectionRange: config.detectionRange ?? 15,
				attackDurationSec: config.attackDurationSec ?? 10,
				attackCooldownMs: config.attackCooldownMs ?? 1500,
				fleeHealthPercent: config.fleeHealthPercent ?? null,
				patrolRadius: config.patrolRadius ?? 8,
				extraConfig: {},
			},
		});

		return { agent, entity, classicNpc, classicNpcConfig };
	});

	return result;
}

async function main() {
	// Seed Superadmin User
	const superadminPlayer = await createPlayer({
		username: 'superadmin',
		password: envConfig.ADMIN_PASSWORD,
		display: 'Super Admin',
		identifier: 'great-man-feq2',
		role: Role.ADMIN,
	});
	console.log(`Created superadmin user: ${superadminPlayer.player.username}`);

	// Seed Player 1
	const player1 = await createPlayer({
		username: 'happyman',
		password: 'password123',
		display: 'Happy Man',
		identifier: 'happy-man-x3z4',
	});
	console.log(`Created player 1 user: ${player1.player.username}`);

	// Seed Player 2
	const player2 = await createPlayer({
		username: 'foreignman',
		password: 'password123',
		display: 'Foreign Man',
		identifier: 'foreign-man-b7n8',
	});
	console.log(`Created player 2 user: ${player2.player.username}`);

	// --- Seed NPCs ---

	// Seed NPC 1 (Scout-Delta - disabled)
	// const npc1 = await createNPC({
	// 	display: 'Scout-Delta',
	// 	identifier: 'scout-777',
	// 	model: 'gpt-4.1-mini',
	// 	skinUrl: `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/scout-777.png`,
	// 	description: [
	// 		'Explorador curtido y silencioso. Habla poco y cuando lo hace es directo, casi seco.',
	// 		'Desconfía de los desconocidos pero respeta a quienes demuestran valor.',
	// 		'Prioriza la supervivencia y el reconocimiento del terreno por encima de todo.',
	// 		'Tiene un humor ácido y no pierde el tiempo en cortesías.',
	// 		'Prefiere actuar solo, pero acepta compañía si le conviene.',
	// 	].join(' '),
	// });

	// Seed NPC 2 (Hunter-Rex)
	/*
	const npc2 = await createNPC({
		display: 'Hunter-Rex',
		identifier: 'hunter-rex-001',
		model: 'gpt-4.1-mini',
		skinUrl: `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/hunter-rex-001.png`,
		description: [
			'Cazador agresivo e impaciente. Nunca está quieto: siempre rastreando, siempre en movimiento.',
			'Está obsesionado con los ciervos. Los busca sin descanso por todo el terreno.',
			'Habla rápido y cortante. No tolera a quien le haga perder el tiempo.',
			'Si detecta rastros de animales cerca, se lanza a investigar sin dudar.',
			'No entiende el concepto de "descansar". Para él, detenerse es perder la presa.',
		].join(' '),
	});
	console.log(`Created AI NPC: ${npc2.agent.identifier}`);
	*/

	const classicNpc = await createClassicNPC({
		display: 'Guard-Alpha',
		identifier: 'guard-alpha-001',
		skinUrl: `${envConfig.S3_URL}/${envConfig.S3_NAME}/skins/guard-alpha-001.png`,
		description: [
			'Guardia clasico de prueba con patrulla corta alrededor del origen.',
			'Se mantiene neutral hasta detectar una amenaza cercana o recibir daño.',
			'Su objetivo es permitir probar visualmente el spawn y el loop clasico sin depender de OpenAI.',
		].join(' '),
		behaviorType: BehaviorType.NEUTRAL,
		position: { x: 2, y: 0, z: 2 },
		config: {
			detectionRange: 12,
			aggroRange: 8,
			attackRange: 2,
			patrolRadius: 4,
		},
	});
	console.log(`Created Classic NPC: ${classicNpc.agent.identifier}`);

	// TEMP: keep superadmin enrolled in the simple experiment while phase wiring is under development.
	// Remove this upsert after manual validation of the experiment flow.
	await prisma.experimentAssignment.upsert({
		where: {
			userId_experimentKey: {
				userId: player1.player.id,
				experimentKey: 'GUIA-EXPERIMENTACION-V4',
			},
		},
		create: {
			userId: player1.player.id,
			experimentKey: 'GUIA-EXPERIMENTACION-V4',
			enabled: true,
		},
		update: {
			enabled: true,
		},
	});

	await prisma.experimentAssignment.upsert({
		where: {
			userId_experimentKey: {
				userId: player1.player.id,
				experimentKey: 'NPCS-SIN-LLMS',
			},
		},
		create: {
			userId: player1.player.id,
			experimentKey: 'NPCS-SIN-LLMS',
			enabled: true,
		},
		update: {
			enabled: true,
		},
	});
}

main()
	.finally(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		process.exit(1);
	});
