function parseCSV(text) {
	// Robust CSV parser that handles quoted fields and embedded newlines
	const rows = [];
	let cur = '';
	let row = [];
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];

		if (ch === '"') {
			// handle escaped double quote ""
			if (inQuotes && text[i + 1] === '"') {
				cur += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			row.push(cur);
			cur = '';
		} else if ((ch === '\n' || ch === '\r') && !inQuotes) {
			// end of record
			// handle CRLF
			if (ch === '\r' && text[i + 1] === '\n') i++;
			row.push(cur);
			rows.push(row);
			row = [];
			cur = '';
		} else {
			cur += ch;
		}
	}
	// push last value if any
	if (cur !== '' || row.length) {
		row.push(cur);
		rows.push(row);
	}

	if (rows.length === 0) return [];

	// normalize headers to expected keys
	const rawHeaders = rows[0].map(h => (h || '').toString().trim());
	function normalizeHeader(h) {
		const hh = h.toLowerCase().trim();
        if (hh.includes('concat')) return 'name';
		if (hh.includes('thrive')) return 'i-thrive';
		if (hh.includes('weblink')) return 'weblinks';
		if (hh.includes('support category')) return 'support category';
		if (hh === 'age range' || hh === 'age') return 'age range';
		if (hh.includes('school service')) return 'school service';
		// common simple mappings
		if (hh === 'service') return 'service';
		if (hh === 'provider') return 'provider';
		if (hh === 'description') return 'description';
		// fallback: collapse whitespace
		return hh.replace(/\s+/g, ' ');
	}
	const headers = rawHeaders.map(normalizeHeader);

	return rows.slice(1).map(cells => {
		const obj = {};
		for (let i = 0; i < headers.length; i++) {
			const key = headers[i] || `col${i}`;
			let val = (cells[i] ?? '').toString().trim();
			if (val === '') val = '';
			obj[key] = val;
		}
		return obj;
	});
}