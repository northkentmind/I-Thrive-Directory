function initDirectory() {
let allServices = [];
let lastFiltered = [];
let currentPage = 1;
let pageSize = 25;

const searchInput = document.getElementById('searchInput');
const thriveFilter = document.getElementById('filterThrive');
const ageFilter = document.getElementById('filterAge');
const categoryFilter = document.getElementById('filterCategory');
const schoolFilter = document.getElementById('filterSchool');
const resetBtn = document.getElementById('resetFilters');
const pageSizeSelect = document.getElementById('pageSize');
const paginationContainer = document.getElementById('pagination');

Promise.all([fetch('Data/directory.csv'), fetch('Data/support_category.csv')])
  .then(responses => Promise.all(responses.map(r => r.text())))
  .then(([dirText, catText]) => {
    allServices = parseCSV(dirText);
    const catRows = parseCSV(catText); // expects header 'Name' -> normalized to 'name'
    const categories = catRows.map(r => (r.name || '').toString().trim()).filter(Boolean);
    populateCategoryFilter(categories);
    applyFilters();
  })
  .catch(err => console.error(err));

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

function populateCategoryFilter(categories) {
	// remove old options except the first "All"
	while (categoryFilter.options.length > 1) {
		categoryFilter.remove(1);
	}

	const uniq = [...new Set(categories.map(c => c.toString().trim()))].filter(Boolean);
	uniq.sort((a, b) => a.localeCompare(b));

	uniq.forEach(cat => {
		const opt = document.createElement('option');
		opt.textContent = cat;
		opt.value = cat;
		categoryFilter.appendChild(opt);
	});
}

function applyFilters() {
	const search = searchInput.value.toLowerCase();
	const thrive = thriveFilter.value;
	const age = ageFilter.value; // normalized token from option value
	const category = categoryFilter.value;
	const school = schoolFilter.value;

	const filtered = allServices.filter(service => {
		const svcName = (service.name || service.service || '').toString().toLowerCase();
		const prov = (service.provider || '').toString().toLowerCase();
		const desc = (service.description || '').toString().toLowerCase();

		const matchesSearch =
			!search ||
			svcName.includes(search) ||
			prov.includes(search) ||
			desc.includes(search);

		const svcThrive = (service['i-thrive'] || '').toString();
		const svcAgeRaw = (service['age range'] || '').toString();
		const svcCategory = (service['support category'] || '').toString();
		const svcSchool = (service['school service'] || '').toString();

		// age matching: handle multi-value cells like "Primary school age, Secondary School age and post 16"
		let matchAge = true;
		if (age) {
			const svcAgeLower = svcAgeRaw.toLowerCase();
			const sel = age.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();

			if (sel === 'all ages') {
				// when user explicitly selects "All ages", only show services marked "All ages"
				matchAge = svcAgeLower.includes('all');
			} else {
				// normal matching: split multi-value cells into tokens and compare normalized values
				const tokens = svcAgeRaw
					.toLowerCase()
					.split(/,|\band\b|\/|;|&/i)
					.map(t => t.replace(/[^a-z0-9\s]/gi, '').trim())
					.filter(Boolean);
				matchAge = tokens.includes(sel) || svcAgeLower.includes(sel);
			}
		}

		const matchThrive = !thrive || svcThrive.toLowerCase().startsWith(thrive.toLowerCase());
		// category matching: service cells may contain multiple categories (e.g. "Wellbeing; Family Support")
		let matchCategory = true;
		if (category) {
			const sel = category.toLowerCase().trim();
			const svcCatRaw = (svcCategory || '').toString();
			// split on semicolon, slash, ampersand, or the word "and" — do NOT split on commas
			const svcTokens = svcCatRaw
				.toLowerCase()
				.split(/;|\/|&|\band\b/i)
				.map(t => t.trim())
				.filter(Boolean);
			matchCategory = svcTokens.includes(sel) || svcCatRaw.toLowerCase().includes(sel);
		}
		const matchSchool = !school || (svcSchool.toLowerCase() === school.toLowerCase());

		return matchesSearch && matchThrive && matchAge && matchCategory && matchSchool;
	});

	// store filtered list and reset paging
	lastFiltered = filtered;
	currentPage = 1;
	pageSize = parseInt(pageSizeSelect?.value || pageSize, 10) || pageSize;
	renderPagedResults();
}

function renderPagedResults() {
	const total = lastFiltered.length;
	if (!paginationContainer) {
		// fallback: directly render all if pagination UI not present
		renderServices(lastFiltered);
		return;
	}

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	// clamp currentPage
	if (currentPage > totalPages) currentPage = totalPages;
	if (currentPage < 1) currentPage = 1;

	const start = (currentPage - 1) * pageSize;
	const end = Math.min(total, start + pageSize);
	const pageItems = lastFiltered.slice(start, end);

	// update count text
	const countEl = document.getElementById('resultsCount');
	if (total === 0) {
		countEl.textContent = 'Showing 0 services';
	} else {
		countEl.textContent = `Showing ${start + 1}-${end} of ${total} services`;
	}

	// render current page items
	renderServices(pageItems);
	// render pagination controls
	renderPagination(totalPages);
}

function renderPagination(totalPages) {
	paginationContainer.innerHTML = '';

	if (totalPages <= 1) return;

	const createBtn = (text, cls = '') => {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = cls;
		b.textContent = text;
		return b;
	};

	// Prev
	const prev = createBtn('Prev', 'page-btn prev');
	prev.disabled = currentPage === 1;
	prev.addEventListener('click', () => {
		if (currentPage > 1) {
			currentPage--;
			renderPagedResults();
		}
	});
	paginationContainer.appendChild(prev);

	// If total pages small, show all
	if (totalPages <= 7) {
		for (let p = 1; p <= totalPages; p++) {
			const cls = p === currentPage ? 'page-btn page-active' : 'page-btn';
			const btn = createBtn(p, cls);
			btn.addEventListener('click', () => {
				if (currentPage === p) return;
				currentPage = p;
				renderPagedResults();
			});
			paginationContainer.appendChild(btn);
		}
	} else {
		// Always show first page
		const firstBtn = createBtn(1, currentPage === 1 ? 'page-btn page-active' : 'page-btn');
		firstBtn.addEventListener('click', () => {
			if (currentPage === 1) return;
			currentPage = 1;
			renderPagedResults();
		});
		paginationContainer.appendChild(firstBtn);

		const maxSide = 2; // pages to show on each side of current
		let left = Math.max(2, currentPage - maxSide);
		let right = Math.min(totalPages - 1, currentPage + maxSide);

		// Adjust window when near edges
		if (currentPage - 1 <= maxSide) {
			right = 1 + maxSide * 2;
			right = Math.min(totalPages - 1, right);
			left = 2;
		}
		if (totalPages - currentPage <= maxSide) {
			left = Math.max(2, totalPages - (maxSide * 2));
			right = totalPages - 1;
		}

		// left ellipsis
		if (left > 2) {
			const ell = document.createElement('span');
			ell.className = 'page-ellipsis';
			ell.textContent = '…';
			paginationContainer.appendChild(ell);
		}

		// window pages
		for (let p = left; p <= right; p++) {
			const cls = p === currentPage ? 'page-btn page-active' : 'page-btn';
			const btn = createBtn(p, cls);
			btn.addEventListener('click', () => {
				if (currentPage === p) return;
				currentPage = p;
				renderPagedResults();
			});
			paginationContainer.appendChild(btn);
		}

		// right ellipsis
		if (right < totalPages - 1) {
			const ell = document.createElement('span');
			ell.className = 'page-ellipsis';
			ell.textContent = '…';
			paginationContainer.appendChild(ell);
		}

		// Always show last page
		const lastBtn = createBtn(totalPages, currentPage === totalPages ? 'page-btn page-active' : 'page-btn');
		lastBtn.addEventListener('click', () => {
			if (currentPage === totalPages) return;
			currentPage = totalPages;
			renderPagedResults();
		});
		paginationContainer.appendChild(lastBtn);
	}

	// Next
	const next = createBtn('Next', 'page-btn next');
	next.disabled = currentPage === totalPages;
	next.addEventListener('click', () => {
		if (currentPage < totalPages) {
			currentPage++;
			renderPagedResults();
		}
	});
	paginationContainer.appendChild(next);
}

// page size change handler
if (pageSizeSelect) {
	pageSizeSelect.addEventListener('change', () => {
		pageSize = parseInt(pageSizeSelect.value, 10) || pageSize;
		currentPage = 1;
		renderPagedResults();
	});
}

function renderServices(services) {
  const list = document.getElementById('serviceList');

  list.innerHTML = '';

  services.forEach(service => {
    const li = document.createElement('li');
    li.className = 'service-card';

    const description = (service.description || '').toString().trim();
    const showToggle = description.length > 180;

    li.innerHTML = `
      <h3>${service.name}</h3>

      <p class="meta">
        ${service['i-thrive']} · ${service['age range']}
      </p>

      <p class="description">
        ${description}
      </p>

      ${showToggle ? `<button type="button" class="toggle-description" aria-expanded="false">Read more</button>` : ''}

      ${
        service.weblinks
          ? `<a href="${service.weblinks}" class="service-link" target="_blank">
              Visit Link →
            </a>`
          : ''
      }
    `;

    const toggleButton = li.querySelector('.toggle-description');
    if (toggleButton) {
      const descEl = li.querySelector('.description');
      toggleButton.addEventListener('click', () => {
        const expanded = descEl.classList.toggle('expanded');
        toggleButton.textContent = expanded ? 'Show less' : 'Read more';
        toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }

    list.appendChild(li);
  });
}

/* Event listeners */
searchInput.addEventListener('input', applyFilters);
thriveFilter.addEventListener('change', applyFilters);
ageFilter.addEventListener('change', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
schoolFilter.addEventListener('change', applyFilters);

resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  thriveFilter.value = '';
  ageFilter.value = '';
  categoryFilter.value = '';
  schoolFilter.value = '';
  applyFilters();
});

}
