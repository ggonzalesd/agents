import { Option } from '#/utils/Option';

import type { NPCDB } from '$/models/NPC.model';

import * as SQL from '$/utils/sql.utils';

type GetNPCByIdType = SQL.InferSqlBuilder<
	{
		npcId: string;
	},
	Option<NPCDB>
>;

export const getNPCById: GetNPCByIdType = SQL.sqlBuilder(
	async ({ npcId }, sql) => {
		const npc = await SQL.selectByProperty<NPCDB, string>(
			{
				table: 'NPC',
				property: 'id',
				value: npcId,
				many: false,
			},
			sql,
		);

		return Option.of(npc);
	},
);
