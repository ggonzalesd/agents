import sql from './../server/config/db.config';

function render(query: any, values: any[] = [], counter = { i: 1 }) {
	if (!query || !query.strings) return { text: String(query), values };

	let text = '';

	for (let j = 0; j < query.strings.length; j++) {
		text += query.strings[j];

		const val = query.values[j];
		if (val === undefined) continue;

		// si es una subquery (otra plantilla)
		if (val && val.strings) {
			const nested = render(val, values, counter);
			text += `(${nested.text})`;
		} else {
			text += `$${counter.i++}`;
			values.push(val);
		}
	}

	return { text, values };
}

const query = sql`SELECT * FROM users ${sql`WHERE id = ${1}`}`;

// Inspecciona qué se va a enviar
console.log(query);
