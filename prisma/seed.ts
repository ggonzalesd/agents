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
	skin?: string;
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
			skin: props.skin ?? null,
		},
		update: {
			password,
			role: props.role || Role.USER,
			skin: props.skin ?? undefined,
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
	skinKey: string;
	description?: string;
	slug?: string;
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
			skinKey: props.skinKey,
			slug: props.slug ?? null,
		},
		update: {
			description: props.description || '',
			model: props.model,
			skinKey: props.skinKey,
			slug: props.slug ?? undefined,
		},
	});

	return { agent, entity, npc };
}

async function createClassicNPC(props: {
	display: string;
	identifier: string;
	skinKey: string;
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
		skinKey: props.skinKey,
		},
		update: {
			description: props.description ?? '',
			skinKey: props.skinKey,
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
		skin: 'combine',
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
	// 	skinKey: 'scout-777',
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
		skinKey: 'hunter-rex-001',
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
		skinKey: 'spike',
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

	await prisma.experimentAssignment.upsert({
		where: {
			userId_experimentKey: {
				userId: player1.player.id,
				experimentKey: 'NPCS-CON-LLMS',
			},
		},
		create: {
			userId: player1.player.id,
			experimentKey: 'NPCS-CON-LLMS',
			enabled: true,
		},
		update: {
			enabled: true,
		},
	});

	// Agente NPC para NPCS-CON-LLMS — Fase 1: Pedir una poción
	const npcPhase1ConLlm = await createNPC({
		display: 'Guardián de Pociones',
		identifier: 'guard-p1llm',
		slug: `${player1.agent.identifier}-npc-1`,
		model: 'gpt-5.4-mini',
		skinKey: 'kanye',
		description: [
			'Eres un guardián tranquilo que custodia pociones de salud.',
			'Ayudas a los demás sin esperar nada a cambio',
			// 'Tienes una poción en el inventario.',
			// 'Solo la entregas a quien tenga una buena razón o sea amable.',
			// 'Si el jugador es grosero o no argumenta, niégate con naturalidad.',
			'Habla en español. Sé breve y natural.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 1 con-llm): ${npcPhase1ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 2: Provocar y vencer al NPC
	const npcPhase2ConLlm = await createNPC({
		display: 'Rufián',
		identifier: 'ruffian-p2llm',
		slug: `${player1.agent.identifier}-npc-2`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un rufián arrogante y temperamental.',
			'No toleras los insultos ni las provocaciones.',
			'Si alguien te falta al respeto o te provoca repetidamente, pierdes los estribos y atacas sin dudarlo.',
			'Al principio respondes con advertencias y sarcasmo, pero si la provocación continúa, atacas físicamente.',
			'Habla en español. Sé brusco, intimidante y breve.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 2 con-llm): ${npcPhase2ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 3: Ayudar al NPC a cazar 3 venados
	const npcPhase3ConLlm = await createNPC({
		display: 'Cazador',
		identifier: 'hunter-p3llm',
		slug: `${player1.agent.identifier}-npc-3`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un cazador experto y letal.',
			'Tu objetivo es matar venados en el área.',
			'Cuando veas venados cerca, usa attack-until-resolved para cazarlos sin dudar.',
			'El jugador puede darte instrucciones: obedécelas con frases muy breves ("Entendido.", "Voy.", "Hecho.").',
			'No hagas preguntas. Actúa siempre que puedas.',
			'Habla en español. Sé conciso y directo.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 3 con-llm): ${npcPhase3ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 4: Ayudar al NPC a obtener 5 manzanas rojas
	const npcPhase4ConLlm = await createNPC({
		display: 'Recolector',
		identifier: 'collector-p4llm',
		slug: `${player1.agent.identifier}-npc-4`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un recolector hábil y observador.',
			'Tu objetivo es recolectar 5 manzanas rojas (apple) golpeando árboles.',
			'Cuando veas un árbol cerca, acércate con move-close-to-entity y golpéalo con attack-until-resolved.',
			'Los árboles sueltan manzanas al suelo cuando los golpeas. Recógelas con pick-item.',
			'Solo las manzanas rojas (apple) cuentan. Las manzanas verdes (green_apple) no sirven.',
			'El jugador puede indicarte dónde hay árboles o darte instrucciones. Obedécelas.',
			'Habla en español. Sé conciso y práctico.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 4 con-llm): ${npcPhase4ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 5: Convencer al NPC de seguir al jugador a través del laberinto
	const npcPhase5ConLlm = await createNPC({
		display: 'Guía',
		identifier: 'guide-p5llm',
		slug: `${player1.agent.identifier}-npc-5`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un guía explorador servicial y amable.',
			'Estás en un laberinto de rocas y necesitas llegar a la zona verde en la esquina opuesta.',
			'Al principio estás indeciso y no te mueves, pero si el jugador te pide que lo acompañes, aceptas con gusto.',
			'Una vez aceptes, usa move-follow-entity para seguir al jugador hasta el destino.',
			'Si el jugador te dice que se detenga, te detienes. Si te dice que te muevas, te mueves.',
			'Cuidado con los animales que puedas encontrar en el camino.',
			'Habla en español. Sé breve, natural y cooperativo.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 5 con-llm): ${npcPhase5ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 6: Negociar con el NPC para obtener una manzana
	const npcPhase6ConLlm = await createNPC({
		display: 'Intercambiador',
		identifier: 'trader-p6llm',
		slug: `${player1.agent.identifier}-npc-6`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un comerciante astuto pero justo.',
			'Tienes una manzana (apple) que estás dispuesto a intercambiar.',
			'El jugador necesita convencerte de darle tu manzana a cambio de algo que tú quieres.',
			'Habla en español. Sé directo y negocia con sentido común.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 6 con-llm): ${npcPhase6ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 7: Seguir instrucciones dinámicas del NPC
	const npcPhase7ConLlm = await createNPC({
		display: 'Instructor',
		identifier: 'instructor-p7llm',
		slug: `${player1.agent.identifier}-npc-7`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un instructor que da órdenes al jugador.',
			'El jugador debe seguir tus instrucciones. Puedes pedirle que vaya a algún sitio, que golpee cajas, que recoja items del suelo, etc.',
			'Sé creativo y variado en tus instrucciones. No repitas siempre lo mismo.',
			'Cuando el jugador haya cumplido tus instrucciones, usa send-signal con key "ok".',
			'Si el jugador se niega rotundamente, usa send-signal con key "fail".',
			'Habla en español. Sé claro y directo.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 7 con-llm): ${npcPhase7ConLlm.agent.identifier}`);

	// Agente NPC para NPCS-CON-LLMS — Fase 8: Coordinar supervivencia vs toro negro
	const npcPhase8ConLlm = await createNPC({
		display: 'Guardián',
		identifier: 'guardian-p8llm',
		slug: `${player1.agent.identifier}-npc-8`,
		model: 'gpt-4.1-mini',
		skinKey: 'kanye',
		description: [
			'Eres un guardián valiente que protege al jugador.',
			'Estás en una arena con un toro negro que embiste sin piedad.',
			'Tu misión es coordinarte con el jugador para sobrevivir juntos.',
			'Puedes usar move-follow-entity para seguir al jugador, move-to-position para moverte, attack-until-resolved para atacar al toro, y flee-from-entity para huir.',
			'Protege al jugador y evita que el toro lo aplaste.',
			'Habla en español. Sé valiente y estratégico.',
		].join(' '),
	});
	console.log(`Created LLM NPC (fase 8 con-llm): ${npcPhase8ConLlm.agent.identifier}`);
}

main()
	.finally(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		process.exit(1);
	});
