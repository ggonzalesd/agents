#!/usr/bin/env node
/**
 * validate-dialogue.ts
 *
 * Valida la consistencia de un archivo JSON de configuración de diálogos.
 *
 * Uso:
 *   npx tsx scripts/validate-dialogue.ts <path-to-json>
 *
 * Ejemplo:
 *   npx tsx scripts/validate-dialogue.ts server/game/data/dialogues/merchant-example.json
 *
 * Qué valida:
 *   - Schema Zod correcto
 *   - rootStatementId existe en statements
 *   - Todos los nextStatementId referencian statements existentes
 *   - No hay nodos huérfanos (definidos pero nunca alcanzables desde root)
 *   - No hay ciclos sin salida (ramas que nunca llegan a null)
 *   - Lista todas las rutas posibles línea a línea con el texto de cada statement
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { dialogueConfigSchema } from '../common/schema/dialogue.schema.js';
import type {
	DialogueConfigData,
	DialogueConversationData,
	DialogueStatementData,
} from '../common/schema/dialogue.schema.js';

const ANSI_RESET = '\x1b[0m';
const ANSI_RED = '\x1b[31m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';

function error(msg: string): void {
	console.error(`${ANSI_RED}✗ ERROR:${ANSI_RESET} ${msg}`);
}

function warn(msg: string): void {
	console.warn(`${ANSI_YELLOW}⚠ WARN:${ANSI_RESET} ${msg}`);
}

function ok(msg: string): void {
	console.log(`${ANSI_GREEN}✓${ANSI_RESET} ${msg}`);
}

function info(msg: string): void {
	console.log(`${ANSI_CYAN}${msg}${ANSI_RESET}`);
}

type ValidationResult = {
	errors: string[];
	warnings: string[];
};

type Route = {
	steps: Array<{ statementId: string; text: string; optionText: string | null }>;
};

function validateConversation(
	conv: DialogueConversationData,
): ValidationResult & { routes: Route[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const routes: Route[] = [];

	const statementIds = new Set(Object.keys(conv.statements));

	// rootStatementId existe
	if (!statementIds.has(conv.rootStatementId)) {
		errors.push(
			`[${conv.id}] rootStatementId "${conv.rootStatementId}" no existe en statements`,
		);
		return { errors, warnings, routes };
	}

	// Todos los nextStatementId referencian nodos existentes
	for (const [stmtId, stmt] of Object.entries(conv.statements)) {
		if (Object.keys(stmt.options).length === 0) {
			warnings.push(
				`[${conv.id}] Statement "${stmtId}" no tiene opciones — dead end inesperado`,
			);
		}

		for (const [optId, opt] of Object.entries(stmt.options)) {
			if (opt.nextStatementId !== null && !statementIds.has(opt.nextStatementId)) {
				errors.push(
					`[${conv.id}] Statement "${stmtId}" → Opción "${optId}" apunta a "${opt.nextStatementId}" que no existe`,
				);
			}
		}
	}

	// Nodos alcanzables desde root (BFS)
	const reachable = new Set<string>();
	const queue: string[] = [conv.rootStatementId];
	while (queue.length > 0) {
		const current = queue.shift()!;
		if (reachable.has(current)) continue;
		reachable.add(current);

		const stmt = conv.statements[current];
		if (!stmt) continue;

		for (const opt of Object.values(stmt.options)) {
			if (opt.nextStatementId !== null && !reachable.has(opt.nextStatementId)) {
				queue.push(opt.nextStatementId);
			}
		}
	}

	// Nodos huérfanos
	for (const stmtId of statementIds) {
		if (!reachable.has(stmtId)) {
			warnings.push(
				`[${conv.id}] Statement "${stmtId}" es inalcanzable desde rootStatementId`,
			);
		}
	}

	// Ciclos sin salida — DFS con detección de ciclos
	const hasCycleWithoutEscape = detectUnescapableCycles(conv);
	if (hasCycleWithoutEscape.length > 0) {
		for (const cycle of hasCycleWithoutEscape) {
			warnings.push(
				`[${conv.id}] Ciclo sin salida detectado: ${cycle.join(' → ')}`,
			);
		}
	}

	// Recolectar todas las rutas (DFS, max depth 50 para evitar loops)
	collectRoutes(conv, routes);

	return { errors, warnings, routes };
}

function detectUnescapableCycles(
	conv: DialogueConversationData,
): string[][] {
	const unescapable: string[][] = [];
	const globalVisited = new Set<string>();

	function dfs(nodeId: string, path: string[], pathSet: Set<string>): boolean {
		if (pathSet.has(nodeId)) {
			// Ciclo detectado — verificar si hay alguna opción null en el ciclo
			const cycleStart = path.indexOf(nodeId);
			const cycle = path.slice(cycleStart);

			const hasEscape = cycle.some((id) => {
				const stmt = conv.statements[id];
				return stmt && Object.values(stmt.options).some((o) => o.nextStatementId === null);
			});

			if (!hasEscape) {
				unescapable.push([...cycle, nodeId]);
			}
			return false;
		}

		if (globalVisited.has(nodeId)) return true;

		const stmt = conv.statements[nodeId];
		if (!stmt) return true;

		const isTerminal = Object.values(stmt.options).some(
			(o) => o.nextStatementId === null,
		);
		if (isTerminal) {
			globalVisited.add(nodeId);
			return true;
		}

		pathSet.add(nodeId);
		path.push(nodeId);

		for (const opt of Object.values(stmt.options)) {
			if (opt.nextStatementId !== null) {
				dfs(opt.nextStatementId, path, pathSet);
			}
		}

		path.pop();
		pathSet.delete(nodeId);
		globalVisited.add(nodeId);
		return true;
	}

	dfs(conv.rootStatementId, [], new Set());
	return unescapable;
}

function collectRoutes(conv: DialogueConversationData, routes: Route[]): void {
	const MAX_DEPTH = 50;

	function dfs(
		nodeId: string,
		currentPath: Route['steps'],
		visitedInPath: Set<string>,
		depth: number,
	): void {
		if (depth > MAX_DEPTH) return;
		if (visitedInPath.has(nodeId)) return;

		const stmt: DialogueStatementData | undefined = conv.statements[nodeId];
		if (!stmt) return;

		const options = Object.values(stmt.options);

		for (const opt of options) {
			const step: Route['steps'][number] = {
				statementId: nodeId,
				text: stmt.text,
				optionText: opt.text,
			};

			const newPath = [...currentPath, step];
			const newVisited = new Set(visitedInPath).add(nodeId);

			if (opt.nextStatementId === null) {
				routes.push({ steps: newPath });
			} else {
				dfs(opt.nextStatementId, newPath, newVisited, depth + 1);
			}
		}
	}

	dfs(conv.rootStatementId, [], new Set(), 0);
}

function printRoutes(convId: string, routes: Route[]): void {
	info(`\n  ${'─'.repeat(60)}`);
	info(`  Conversación: ${ANSI_BOLD}${convId}${ANSI_RESET}${ANSI_CYAN} — ${routes.length} ruta(s)`);
	info(`  ${'─'.repeat(60)}`);

	for (let i = 0; i < routes.length; i++) {
		const route = routes[i];
		console.log(`\n  ${ANSI_BOLD}Ruta ${i + 1}:${ANSI_RESET}`);

		for (const step of route.steps) {
			console.log(
				`    ${ANSI_DIM}[${step.statementId}]${ANSI_RESET} NPC: "${step.text}"`,
			);
			if (step.optionText !== null) {
				console.log(
					`    ${ANSI_DIM}→${ANSI_RESET} Jugador elige: "${step.optionText}"`,
				);
			}
		}
		console.log(`    ${ANSI_GREEN}→ FIN${ANSI_RESET}`);
	}
}

function main(): void {
	const filePath = process.argv[2];

	if (!filePath) {
		console.error(
			`Uso: npx tsx scripts/validate-dialogue.ts <path-to-json>\n` +
				`Ejemplo: npx tsx scripts/validate-dialogue.ts server/game/data/dialogues/merchant-example.json`,
		);
		process.exit(1);
	}

	const absolutePath = resolve(process.cwd(), filePath);

	let raw: unknown;
	try {
		const content = readFileSync(absolutePath, 'utf-8');
		raw = JSON.parse(content);
	} catch (e) {
		error(`No se pudo leer el archivo: ${absolutePath}\n${e}`);
		process.exit(1);
	}

	const parsed = dialogueConfigSchema.safeParse(raw);
	if (!parsed.success) {
		error('El archivo no pasa la validación de schema Zod:');
		for (const issue of parsed.error.issues) {
			console.error(`  ${ANSI_RED}·${ANSI_RESET} ${issue.path.join('.')} — ${issue.message}`);
		}
		process.exit(1);
	}

	ok('Schema Zod válido');

	const config: DialogueConfigData = parsed.data;

	console.log(`\n${ANSI_BOLD}Archivo:${ANSI_RESET} ${absolutePath}`);
	console.log(
		`${ANSI_BOLD}Estrategia:${ANSI_RESET} ${config.pickStrategy} | ${ANSI_BOLD}Conversaciones:${ANSI_RESET} ${config.conversations.length}\n`,
	);

	let totalErrors = 0;
	let totalWarnings = 0;
	let totalRoutes = 0;

	for (const conv of config.conversations) {
		const { errors: convErrors, warnings: convWarnings, routes } = validateConversation(conv);

		totalErrors += convErrors.length;
		totalWarnings += convWarnings.length;
		totalRoutes += routes.length;

		for (const e of convErrors) error(e);
		for (const w of convWarnings) warn(w);

		printRoutes(conv.id, routes);
	}

	console.log('\n' + '='.repeat(64));
	console.log(
		`${ANSI_BOLD}Resumen:${ANSI_RESET} ${totalRoutes} rutas totales | ` +
			`${totalErrors > 0 ? ANSI_RED : ANSI_GREEN}${totalErrors} error(es)${ANSI_RESET} | ` +
			`${totalWarnings > 0 ? ANSI_YELLOW : ANSI_GREEN}${totalWarnings} advertencia(s)${ANSI_RESET}`,
	);
	console.log('='.repeat(64));

	if (totalErrors > 0) {
		process.exit(1);
	}
}

main();
