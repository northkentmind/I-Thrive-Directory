/**
 * KPI Dashboard Application Logic
 * Handles view switching, filtering, rendering, and state management
 */

class KPIDashboard {
    constructor() {
        this.currentView = 'ceo';
        this.selectedDepartment = '';
        this.selectedCategory = '';
        this.ceoKPISearchTerm = '';
        this.ceoKPIDeptFilter = '';
        this.metricsPreferences = this.loadMetricsPreferences();
        // CEO Pagination
        this.kpisPerPage = 12;
        this.currentKPIPage = 1;
        this.filteredKPIsCache = [];
        // Board Pagination
        this.currentBoardPage = 1;
        this.filteredBoardKPIs = [];
        // Department Pagination
        this.currentDeptPage = 1;
        this.filteredDeptKPIs = [];
        this.init();
        this.exposeGlobalMethods();
    }

    init() {
        this.setupEventListeners();
        this.updateTimestamp();
        this.populateTrendKPISelectors();
        this.renderCEOView();
    }

    loadMetricsPreferences() {
        const saved = localStorage.getItem('kpiMetricsPreference');
        return saved ? JSON.parse(saved) : {
            demand: ['referrals', 'activeClients', 'waiting'],
            delivery: ['attendance'],
            safety: ['safeguarding']
        };
    }

    saveMetricsPreference() {
        const prefs = {
            demand: [],
            delivery: [],
            safety: []
        };
        
        if (document.getElementById('demandMetric_referrals')?.checked) prefs.demand.push('referrals');
        if (document.getElementById('demandMetric_activeClients')?.checked) prefs.demand.push('activeClients');
        if (document.getElementById('demandMetric_waiting')?.checked) prefs.demand.push('waiting');
        if (document.getElementById('deliveryMetric_attendance')?.checked) prefs.delivery.push('attendance');
        if (document.getElementById('deliveryMetric_interventions')?.checked) prefs.delivery.push('interventions');
        if (document.getElementById('deliveryMetric_caseload')?.checked) prefs.delivery.push('caseload');
        if (document.getElementById('safetyMetric_safeguarding')?.checked) prefs.safety.push('safeguarding');
        if (document.getElementById('safetyMetric_training')?.checked) prefs.safety.push('training');
        if (document.getElementById('safetyMetric_turnover')?.checked) prefs.safety.push('turnover');
        
        localStorage.setItem('kpiMetricsPreference', JSON.stringify(prefs));
        this.metricsPreferences = prefs;
        this.renderCEOView();
    }

    openMetricsCustomizer() {
        const modal = document.getElementById('metricsModal');
        if (modal) modal.classList.remove('hidden');
    }

    closeMetricsCustomizer() {
        const modal = document.getElementById('metricsModal');
        if (modal) modal.classList.add('hidden');
    }

    exposeGlobalMethods() {
        // Expose methods globally for inline event handlers
        window.switchView = (view) => this.switchView(view);
        window.filterByCategory = (category) => this.filterByCategory(category);
        window.filterByDepartment = (dept) => this.filterByDepartment(dept);
        window.searchKPIs = (query) => this.searchKPIs(query);
        window.goToKPIPage = (page) => this.goToKPIPage(page);
        window.previousKPIPage = () => this.previousKPIPage();
        window.nextKPIPage = () => this.nextKPIPage();
        window.goToBoardPage = (page) => this.goToBoardPage(page);
        window.previousBoardPage = () => this.previousBoardPage();
        window.nextBoardPage = () => this.nextBoardPage();
        window.goToDeptPage = (page) => this.goToDeptPage(page);
        window.previousDeptPage = () => this.previousDeptPage();
        window.nextDeptPage = () => this.nextDeptPage();
    }

    setupEventListeners() {
        // View switching buttons
        document.getElementById('viewBtnCEO')?.addEventListener('click', () => this.switchView('ceo'));
        document.getElementById('viewBtnBoard')?.addEventListener('click', () => this.switchView('board'));
        document.getElementById('viewBtnDept')?.addEventListener('click', () => this.switchView('department'));

        // Department selector
        document.getElementById('departmentSelect')?.addEventListener('change', (e) => {
            this.selectedDepartment = e.target.value;
            this.renderDepartmentView();
        });

        // Search input
        document.getElementById('searchInput')?.addEventListener('keyup', (e) => {
            this.searchKPIs(e.target.value);
        });

        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterByCategory(e.target.dataset.category || '');
                this.updateFilterButtons(e.target);
            });
        });
    }

    updateTimestamp() {
        const timestamp = new Date().toLocaleTimeString();
        const element = document.getElementById('lastUpdated');
        if (element) element.textContent = timestamp;
    }

    switchView(view) {
        this.currentView = view;
        
        // Hide all views
        document.getElementById('ceoView')?.classList.add('hidden');
        document.getElementById('boardView')?.classList.add('hidden');
        document.getElementById('departmentView')?.classList.add('hidden');

        // Show selected view
        const viewElement = document.getElementById(view + 'View');
        if (viewElement) viewElement.classList.remove('hidden');

        // Update button styling
        this.updateViewButtons(view);

        // Show/hide search containers
        const searchContainers = ['searchContainer', 'boardSearchContainer', 'deptSearchContainer'];
        searchContainers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                if (id === 'searchContainer') container.classList.toggle('hidden', view !== 'ceo');
                else if (id === 'boardSearchContainer') container.classList.toggle('hidden', view !== 'board');
                else if (id === 'deptSearchContainer') container.classList.toggle('hidden', view !== 'department');
            }
        });

        // Show/hide department selector
        const deptSelector = document.getElementById('departmentSelect');
        if (deptSelector) deptSelector.classList.toggle('hidden', view !== 'department');

        // Render appropriate view
        if (view === 'ceo') this.renderCEOView();
        else if (view === 'board') this.renderBoardView();
        else if (view === 'department') this.renderDepartmentView();
    }

    updateViewButtons(view) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-700', 'bg-amber-100', 'text-amber-700', 'bg-green-100', 'text-green-700');
        });

        const buttonMap = {
            'ceo': { id: 'viewBtnCEO', classes: 'bg-blue-100 text-blue-700' },
            'board': { id: 'viewBtnBoard', classes: 'bg-amber-100 text-amber-700' },
            'department': { id: 'viewBtnDept', classes: 'bg-green-100 text-green-700' }
        };

        const btnConfig = buttonMap[view];
        const btn = document.getElementById(btnConfig.id);
        if (btn) btn.classList.add(...btnConfig.classes.split(' '));
    }

    filterByCategory(category) {
        this.selectedCategory = category;
        
        // Update filter button styling
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-800');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        });
        
        // Find and highlight the active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if ((btn.dataset.category || btn.textContent.trim()) === (category || 'All')) {
                btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
                btn.classList.add('bg-blue-100', 'text-blue-800');
            }
        });
        
        if (this.currentView === 'ceo') this.renderCEOView();
    }

    filterByDepartment(dept) {
        this.selectedDepartment = dept;
        this.renderDepartmentView();
    }

    updateFilterButtons(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-blue-100', 'text-blue-800');
            btn.classList.add('text-gray-600', 'hover:bg-gray-100');
        });
        activeBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        activeBtn.classList.add('bg-blue-100', 'text-blue-800');
    }

    getFilteredKPIs() {
        return kpiDatabase.filter(kpi => {
            const matchCategory = !this.selectedCategory || kpi.category === this.selectedCategory;
            const matchDept = !this.selectedDepartment || kpi.dept === this.selectedDepartment;
            return matchCategory && matchDept;
        });
    }

    getStatusCounts() {
        const filtered = this.getFilteredKPIs();
        return {
            green: filtered.filter(k => k.status === 'green').length,
            amber: filtered.filter(k => k.status === 'amber').length,
            red: filtered.filter(k => k.status === 'red').length,
            total: kpiDatabase.length
        };
    }

    // ==================== CEO VIEW ====================
    renderCEOView() {
        const counts = this.getStatusCounts();
        this.updateStatusCounts(counts);
        this.renderCEOOverviewCards();
        this.renderCriticalKPIs();
        this.renderAllKPIsGrid();
    }

    updateStatusCounts(counts) {
        document.getElementById('countGreen').textContent = counts.green;
        document.getElementById('countAmber').textContent = counts.amber;
        document.getElementById('countRed').textContent = counts.red;
        document.getElementById('countTotal').textContent = counts.total;
    }

    renderCEOOverviewCards() {
        // Demand & Access metrics
        const demandKPIs = kpiDatabase.filter(k => k.category === 'Demand' || k.category === 'Access');
        const accessOnTarget = demandKPIs.filter(k => k.status !== 'red').length;
        const accessPerf = demandKPIs.length > 0 ? Math.round((accessOnTarget / demandKPIs.length) * 100) : 0;
        
        let demandMetricsHtml = '';
        
        if (this.metricsPreferences.demand.includes('referrals')) {
            const totalReferrals = demandKPIs.filter(k => k.name.toLowerCase().includes('referral')).reduce((sum, k) => sum + (typeof k.current === 'number' ? k.current : 0), 0);
            if (totalReferrals > 0) {
                demandMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">YTD Total Referrals (All Departments)</p>
                    <p class="text-xl font-bold text-gray-900">${totalReferrals.toLocaleString()}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.demand.includes('activeClients')) {
            const activeClients = demandKPIs.filter(k => k.name.toLowerCase().includes('active')).reduce((sum, k) => sum + (typeof k.current === 'number' ? k.current : 0), 0);
            if (activeClients > 0) {
                demandMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Active Service Users</p>
                    <p class="text-xl font-bold text-gray-900">${activeClients.toLocaleString()}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.demand.includes('waiting')) {
            const waitingList = demandKPIs.filter(k => k.name.toLowerCase().includes('waiting')).reduce((sum, k) => sum + (typeof k.current === 'number' ? k.current : 0), 0);
            if (waitingList > 0) {
                demandMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Current Waiting List</p>
                    <p class="text-xl font-bold text-gray-900">${waitingList.toLocaleString()}</p>
                </div>`;
            }
        }
        
        let demandAccessHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-blue-600">${accessPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${accessPerf}%"></div>
            </div>
            ${demandMetricsHtml}
            <div class="mt-4 pt-4 border-t-2 border-blue-200">
                <p class="text-sm font-bold text-blue-900">${accessOnTarget}/${demandKPIs.length} KPIs on/above target</p>
            </div>
        `;
        const demandContainer = document.getElementById('ceoDemandAccess');
        if (demandContainer) demandContainer.innerHTML = demandAccessHtml;

        // Delivery & Outcomes metrics
        const deliveryKPIs = kpiDatabase.filter(k => k.category === 'Delivery' || k.category === 'Outcomes');
        const deliveryOnTarget = deliveryKPIs.filter(k => k.status !== 'red').length;
        const deliveryPerf = deliveryKPIs.length > 0 ? Math.round((deliveryOnTarget / deliveryKPIs.length) * 100) : 0;
        
        let deliveryMetricsHtml = '';
        
        if (this.metricsPreferences.delivery.includes('attendance')) {
            const attendanceKPI = deliveryKPIs.find(k => k.name.toLowerCase().includes('attendance'));
            if (attendanceKPI) {
                deliveryMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Current Month Average Attendance</p>
                    <p class="text-xl font-bold text-gray-900">${attendanceKPI.current}${typeof attendanceKPI.current === 'number' && attendanceKPI.current < 100 ? '%' : ''}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.delivery.includes('interventions')) {
            const interventionsKPI = deliveryKPIs.find(k => k.name.toLowerCase().includes('intervention'));
            if (interventionsKPI) {
                deliveryMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">YTD Interventions Delivered</p>
                    <p class="text-xl font-bold text-gray-900">${interventionsKPI.current}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.delivery.includes('caseload')) {
            const caseloadKPI = deliveryKPIs.find(k => k.name.toLowerCase().includes('caseload') || k.name.toLowerCase().includes('active'));
            if (caseloadKPI) {
                deliveryMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Active Caseload (Current)</p>
                    <p class="text-xl font-bold text-gray-900">${caseloadKPI.current}</p>
                </div>`;
            }
        }
        
        let deliveryHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-green-600">${deliveryPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${deliveryPerf}%"></div>
            </div>
            ${deliveryMetricsHtml}
            <div class="mt-4 pt-4 border-t-2 border-green-200">
                <p class="text-sm font-bold text-green-900">${deliveryOnTarget}/${deliveryKPIs.length} KPIs on/above target</p>
            </div>
        `;
        const deliveryContainer = document.getElementById('ceoDeliveryOutcomes');
        if (deliveryContainer) deliveryContainer.innerHTML = deliveryHtml;

        // Safety & Workforce metrics
        const safetyKPIs = kpiDatabase.filter(k => k.category === 'Safety');
        const safetyOnTarget = safetyKPIs.filter(k => k.status !== 'red').length;
        const safetyPerf = safetyKPIs.length > 0 ? Math.round((safetyOnTarget / safetyKPIs.length) * 100) : 0;
        const redSafetyCount = safetyKPIs.filter(k => k.status === 'red').length;
        
        let safetyMetricsHtml = '';
        
        if (this.metricsPreferences.safety.includes('safeguarding')) {
            const safeguardingKPI = safetyKPIs.find(k => k.name.toLowerCase().includes('safeguarding') || k.name.toLowerCase().includes('active'));
            if (safeguardingKPI) {
                safetyMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Active Safeguarding Cases (Current)</p>
                    <p class="text-xl font-bold text-gray-900">${safeguardingKPI.current}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.safety.includes('training')) {
            const trainingKPI = safetyKPIs.find(k => k.name.toLowerCase().includes('training'));
            if (trainingKPI) {
                safetyMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Training Compliance</p>
                    <p class="text-xl font-bold text-gray-900">${trainingKPI.current}${typeof trainingKPI.current === 'number' && trainingKPI.current < 100 ? '%' : ''}</p>
                </div>`;
            }
        }
        
        if (this.metricsPreferences.safety.includes('turnover')) {
            const turnoverKPI = safetyKPIs.find(k => k.name.toLowerCase().includes('turnover'));
            if (turnoverKPI) {
                safetyMetricsHtml += `<div class="mt-3 pt-3 border-t border-gray-200">
                    <p class="text-xs text-gray-500">Staff Turnover Rate</p>
                    <p class="text-xl font-bold text-gray-900">${turnoverKPI.current}%</p>
                </div>`;
            }
        }
        
        let safetyHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-purple-600">${safetyPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-purple-600 h-2 rounded-full" style="width: ${safetyPerf}%"></div>
            </div>
            ${safetyMetricsHtml}
            <div class="mt-4 pt-4 border-t-2 border-purple-200">
                <p class="text-sm font-bold text-purple-900">${safetyOnTarget}/${safetyKPIs.length} KPIs on/above target</p>
                ${redSafetyCount > 0 ? `<p class="text-xs text-red-600 font-medium mt-2">⚠️ ${redSafetyCount} critical safety concern(s)</p>` : ''}
            </div>
        `;
        const safetyContainer = document.getElementById('ceoSafetyWorkforce');
        if (safetyContainer) safetyContainer.innerHTML = safetyHtml;
    }

    renderCriticalKPIs() {
        const critical = this.getFilteredKPIs().filter(k => k.status === 'red');
        let html = '';

        critical.forEach(kpi => {
            html += `
                <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p class="font-semibold text-red-900">${kpi.name}</p>
                    <p class="text-xs text-red-700 mt-1">${kpi.dept}</p>
                    <div class="flex justify-between mt-2">
                        <span class="text-sm text-red-800">Current: ${kpi.current}</span>
                        <span class="text-sm text-red-800">Target: ${kpi.target}</span>
                    </div>
                </div>
            `;
        });

        const container = document.getElementById('criticalKPIs');
        if (container) container.innerHTML = html || '<p class="col-span-3 text-gray-500">No critical KPIs</p>';
    }

    renderAllKPIsGrid() {
        const filtered = this.getFilteredKPIs();
        this.filteredKPIsCache = filtered;
        this.currentKPIPage = 1;
        this.renderKPIPage();
    }

    renderKPIPage() {
        const filtered = this.filteredKPIsCache;
        const totalPages = Math.ceil(filtered.length / this.kpisPerPage);
        const startIdx = (this.currentKPIPage - 1) * this.kpisPerPage;
        const pageKPIs = filtered.slice(startIdx, startIdx + this.kpisPerPage);
        
        // Group by status
        const byStatus = {
            red: pageKPIs.filter(k => k.status === 'red'),
            amber: pageKPIs.filter(k => k.status === 'amber'),
            green: pageKPIs.filter(k => k.status === 'green')
        };

        // Build status toggle buttons (with all counts, not just page)
        const allFiltered = this.filteredKPIsCache;
        const allByStatus = {
            red: allFiltered.filter(k => k.status === 'red'),
            amber: allFiltered.filter(k => k.status === 'amber'),
            green: allFiltered.filter(k => k.status === 'green')
        };
        
        let statusButtons = '<div class="flex flex-wrap gap-3 mb-6">';
        
        if (allByStatus.red.length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer" data-status="red">
                <span class="inline-block w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">${allByStatus.red.length}</span>
                <span>Critical Attention</span>
            </button>`;
        }
        
        if (allByStatus.amber.length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" data-status="amber">
                <span class="inline-block w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">${allByStatus.amber.length}</span>
                <span>Needs Attention</span>
            </button>`;
        }
        
        if (allByStatus.green.length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" data-status="green">
                <span class="inline-block w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">${allByStatus.green.length}</span>
                <span>On Track</span>
            </button>`;
        }
        
        statusButtons += '</div>';

        // Build KPI grid
        let html = statusButtons;
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
        
        // Add KPI cards for current page
        [...byStatus.red, ...byStatus.amber, ...byStatus.green].forEach(kpi => {
            html += this.createKPICard(kpi);
        });
        
        html += '</div>';
        
        // Add pagination controls if needed
        if (totalPages > 1) {
            html += `<div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div class="text-sm text-gray-600">
                    Showing ${startIdx + 1}-${Math.min(startIdx + this.kpisPerPage, filtered.length)} of ${filtered.length} KPIs
                </div>
                <div class="flex gap-2">
                    <button onclick="dashboard.previousKPIPage()" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${this.currentKPIPage === 1 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <div class="flex items-center gap-2">
                        ${Array.from({length: totalPages}, (_, i) => `
                            <button onclick="dashboard.goToKPIPage(${i + 1})" class="px-3 py-2 rounded-lg font-medium transition ${this.currentKPIPage === i + 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}">
                                ${i + 1}
                            </button>
                        `).join('')}
                    </div>
                    <button onclick="dashboard.nextKPIPage()" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${this.currentKPIPage === totalPages ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            </div>`;
        }

        const container = document.getElementById('ceoKPIGrid');
        if (container) container.innerHTML = html || '<p class="text-gray-500 p-4">No KPIs match filters</p>';
        
        // Attach event listeners for status filter buttons
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('opacity-50');
                e.currentTarget.classList.toggle('grayscale');
                this.filterGridByStatus();
            });
        });
        
        // Reset filter inputs
        const searchInput = document.getElementById('ceoKPISearch');
        if (searchInput) searchInput.value = '';
        const deptSelect = document.getElementById('ceoKPIDept');
        if (deptSelect) deptSelect.value = '';
    }

    goToKPIPage(page) {
        this.currentKPIPage = page;
        this.renderKPIPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    previousKPIPage() {
        if (this.currentKPIPage > 1) {
            this.goToKPIPage(this.currentKPIPage - 1);
        }
    }

    nextKPIPage() {
        const totalPages = Math.ceil(this.filteredKPIsCache.length / this.kpisPerPage);
        if (this.currentKPIPage < totalPages) {
            this.goToKPIPage(this.currentKPIPage + 1);
        }
    }

    filterGridByStatus() {
        const cards = document.querySelectorAll('.kpi-card');
        const activeStatuses = new Set();
        
        document.querySelectorAll('.status-filter-btn:not(.opacity-50)').forEach(btn => {
            activeStatuses.add(btn.dataset.status);
        });
        
        cards.forEach(card => {
            const cardStatus = card.dataset.status;
            card.classList.toggle('hidden', !activeStatuses.has(cardStatus));
        });
    }

    createKPICard(kpi) {
        const statusColor = {
            green: 'bg-green-100 text-green-800',
            amber: 'bg-amber-100 text-amber-800',
            red: 'bg-red-100 text-red-800'
        }[kpi.status];

        const catColor = categoryColors[kpi.category] || 'bg-gray-100 text-gray-700';
        const borderColor = { green: 'border-green-500', amber: 'border-amber-500', red: 'border-red-500' }[kpi.status];
        const trendColor = kpi.trend.includes('-') ? 'text-red-600' : 'text-green-600';

        return `
            <div class="kpi-card bg-white rounded-lg shadow p-5 border-t-4 ${borderColor}" data-status="${kpi.status}">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold px-2 py-1 rounded ${catColor} category-badge">${kpi.category}</span>
                    <span class="text-xs font-bold px-2 py-1 rounded ${statusColor}">${kpi.status.toUpperCase()}</span>
                </div>
                <h3 class="font-semibold text-gray-900 text-sm mb-1">${kpi.name}</h3>
                <p class="text-xs text-gray-600 mb-3">${kpi.dept}</p>
                <div class="space-y-1">
                    <div class="flex justify-between">
                        <span class="text-xs text-gray-600">Current:</span>
                        <span class="text-sm font-bold text-gray-900">${kpi.current}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-xs text-gray-600">Target:</span>
                        <span class="text-sm text-gray-700">${kpi.target}</span>
                    </div>
                    <div class="flex justify-between mt-2 pt-2 border-t">
                        <span class="text-xs font-medium text-gray-600">Trend:</span>
                        <span class="text-xs font-bold ${trendColor}">${kpi.trend}</span>
                    </div>
                </div>
            </div>
        `;
    }

    searchKPIs(query) {
        const filtered = kpiDatabase.filter(kpi =>
            kpi.name.toLowerCase().includes(query.toLowerCase()) ||
            kpi.dept.toLowerCase().includes(query.toLowerCase()) ||
            kpi.category.toLowerCase().includes(query.toLowerCase())
        );

        // Group by status and cache
        const byStatus = {
            red: filtered.filter(k => k.status === 'red'),
            amber: filtered.filter(k => k.status === 'amber'),
            green: filtered.filter(k => k.status === 'green')
        };

        this.filteredKPIsCache = [...byStatus.red, ...byStatus.amber, ...byStatus.green];
        this.currentKPIPage = 1;
        this.renderKPIPage();
    }

    applyCEOFilters() {
        const searchTerm = (document.getElementById('ceoKPISearch')?.value || '').toLowerCase();
        const deptFilter = document.getElementById('ceoKPIDept')?.value || '';

        const filtered = kpiDatabase.filter(kpi => {
            const matchSearch = kpi.name.toLowerCase().includes(searchTerm) || 
                              kpi.dept.toLowerCase().includes(searchTerm) ||
                              kpi.category.toLowerCase().includes(searchTerm);
            const matchDept = !deptFilter || kpi.dept === deptFilter;
            return matchSearch && matchDept;
        });

        // Group by status and cache
        const byStatus = {
            red: filtered.filter(k => k.status === 'red'),
            amber: filtered.filter(k => k.status === 'amber'),
            green: filtered.filter(k => k.status === 'green')
        };

        this.filteredKPIsCache = [...byStatus.red, ...byStatus.amber, ...byStatus.green];
        this.currentKPIPage = 1;
        this.renderKPIPage();
    }

    // ==================== CHARTING & ANALYTICS ====================
    populateTrendKPISelectors() {
        const selectors = ['trendKPISelect', 'deptChartKPISelect'];
        const selectOptions = kpiDatabase.map(kpi => 
            `<option value="${kpi.id}">${kpi.name} (${kpi.dept})</option>`
        ).join('');

        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                select.innerHTML = '<option value="">Select KPI to chart...</option>' + selectOptions;
            }
        });
    }

    renderTrendChart(kpiId) {
        if (!kpiId) return;
        
        const kpi = kpiDatabase.find(k => k.id == kpiId);
        if (!kpi || !kpi.monthlyData) return;

        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.trendChartInstance) this.trendChartInstance.destroy();

        const chartData = {
            labels: kpi.monthlyData.map(d => d.month),
            datasets: [{
                label: kpi.name,
                data: kpi.monthlyData.map(d => d.value),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Target',
                data: new Array(kpi.monthlyData.length).fill(kpi.target),
                borderColor: '#10b981',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            }]
        };

        this.trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Value' }
                    }
                }
            }
        });

        this.updateTrendSummary(kpi);
    }

    updateTrendSummary(kpi) {
        const container = document.getElementById('trendSummary');
        if (!container || !kpi.monthlyData) return;

        const first = kpi.monthlyData[0].value;
        const last = kpi.monthlyData[kpi.monthlyData.length - 1].value;
        const change = last - first;
        const percentChange = ((change / first) * 100).toFixed(1);
        const max = Math.max(...kpi.monthlyData.map(d => d.value));
        const min = Math.min(...kpi.monthlyData.map(d => d.value));
        const avg = (kpi.monthlyData.reduce((a, b) => a + b.value, 0) / kpi.monthlyData.length).toFixed(1);

        const status = last >= kpi.target ? 'On Track ✓' : 'Below Target ✗';
        const statusColor = last >= kpi.target ? 'text-green-600' : 'text-red-600';

        container.innerHTML = `
            <div class="space-y-2 text-sm">
                <div>
                    <p class="text-gray-600">Latest Value</p>
                    <p class="text-lg font-bold">${last}</p>
                </div>
                <div>
                    <p class="text-gray-600">Change</p>
                    <p class="text-lg font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}">${change >= 0 ? '+' : ''}${change.toFixed(1)} (${percentChange}%)</p>
                </div>
                <div>
                    <p class="text-gray-600">Range</p>
                    <p class="text-sm">${min.toFixed(1)} - ${max.toFixed(1)}</p>
                </div>
                <div>
                    <p class="text-gray-600">Average</p>
                    <p class="text-sm">${avg}</p>
                </div>
                <div>
                    <p class="text-gray-600">Status vs Target</p>
                    <p class="text-sm font-semibold ${statusColor}">${status}</p>
                </div>
            </div>
        `;
    }

    renderDepartmentChart(kpiId) {
        if (!kpiId) return;
        
        const kpi = kpiDatabase.find(k => k.id == kpiId);
        if (!kpi || !kpi.monthlyData) return;

        const ctx = document.getElementById('departmentTrendChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.deptChartInstance) this.deptChartInstance.destroy();

        const chartData = {
            labels: kpi.monthlyData.map(d => d.month),
            datasets: [{
                label: kpi.name,
                data: kpi.monthlyData.map(d => d.value),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#8b5cf6'
            }, {
                label: 'Target',
                data: new Array(kpi.monthlyData.length).fill(kpi.target),
                borderColor: '#10b981',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            }]
        };

        this.deptChartInstance = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    renderExceptionTrendChart() {
        // Get red/amber KPIs and create a stacked area chart
        const redAmber = kpiDatabase.filter(k => k.status === 'red' || k.status === 'amber');
        if (redAmber.length === 0) return;

        // Get common months from all KPIs
        const months = kpiDatabase[0].monthlyData?.map(d => d.month) || [];
        
        const redData = months.map(month => {
            return redAmber.filter(kpi => kpi.status === 'red').length;
        });

        const amberData = months.map(month => {
            return redAmber.filter(kpi => kpi.status === 'amber').length;
        });

        const ctx = document.getElementById('exceptionTrendChart');
        if (!ctx) return;

        if (this.exceptionChartInstance) this.exceptionChartInstance.destroy();

        this.exceptionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Red KPIs',
                    data: redData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Amber KPIs',
                    data: amberData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        stacked: false
                    }
                }
            }
        });
    }

    // ==================== BOARD VIEW ====================
    renderBoardView() {
        // Render overview cards and chart first
        this.renderBoardOverviewCards();
        this.renderExceptionTrendChart();
        this.updateBoardStatusCounts();
        // Then apply filters/render table
        this.applyBoardFilters();
    }

    renderBoardOverviewCards() {
        // This renders the strategic overview cards - same for all board members
        // Cards are static and don't depend on filters
    }

    updateBoardStatusCounts() {
        const green = kpiDatabase.filter(k => k.status === 'green').length;
        const amber = kpiDatabase.filter(k => k.status === 'amber').length;
        const red = kpiDatabase.filter(k => k.status === 'red').length;
        
        const boardCountGreen = document.getElementById('boardCountGreen');
        const boardCountAmber = document.getElementById('boardCountAmber');
        const boardCountRed = document.getElementById('boardCountRed');
        
        if (boardCountGreen) boardCountGreen.textContent = green;
        if (boardCountAmber) boardCountAmber.textContent = amber;
        if (boardCountRed) boardCountRed.textContent = red;
    }

    applyBoardFilters() {
        const searchTerm = (document.getElementById('boardKPISearch')?.value || '').toLowerCase();
        const deptFilter = document.getElementById('boardKPIDept')?.value || '';

        const filtered = kpiDatabase
            .filter(kpi => {
                const matchSearch = kpi.name.toLowerCase().includes(searchTerm) || 
                                  kpi.dept.toLowerCase().includes(searchTerm) ||
                                  kpi.category.toLowerCase().includes(searchTerm);
                const matchDept = !deptFilter || kpi.dept === deptFilter;
                return matchSearch && matchDept;
            });

        // Group by status and cache - now includes green KPIs
        const byStatus = {
            red: filtered.filter(k => k.status === 'red'),
            amber: filtered.filter(k => k.status === 'amber'),
            green: filtered.filter(k => k.status === 'green')
        };

        this.filteredBoardKPIs = [...byStatus.red, ...byStatus.amber, ...byStatus.green];
        this.currentBoardPage = 1;
        this.renderBoardPage();
    }

    renderBoardPage() {
        const kpisPerPage = 12;
        const totalPages = Math.ceil(this.filteredBoardKPIs.length / kpisPerPage);
        const startIdx = (this.currentBoardPage - 1) * kpisPerPage;
        const pageKPIs = this.filteredBoardKPIs.slice(startIdx, startIdx + kpisPerPage);

        // Group page KPIs by status
        const byStatus = {
            red: pageKPIs.filter(k => k.status === 'red'),
            amber: pageKPIs.filter(k => k.status === 'amber'),
            green: pageKPIs.filter(k => k.status === 'green')
        };

        // Build status toggle buttons (Green first for positive tone)
        let statusButtons = '<div class="flex flex-wrap gap-3 mb-6">';
        
        if (this.filteredBoardKPIs.filter(k => k.status === 'green').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" data-status="green">
                <span class="inline-block w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredBoardKPIs.filter(k => k.status === 'green').length}</span>
                <span>On Track</span>
            </button>`;
        }
        
        if (this.filteredBoardKPIs.filter(k => k.status === 'amber').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" data-status="amber">
                <span class="inline-block w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredBoardKPIs.filter(k => k.status === 'amber').length}</span>
                <span>Needs Attention</span>
            </button>`;
        }
        
        if (this.filteredBoardKPIs.filter(k => k.status === 'red').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer" data-status="red">
                <span class="inline-block w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredBoardKPIs.filter(k => k.status === 'red').length}</span>
                <span>Critical Attention</span>
            </button>`;
        }
        
        statusButtons += '</div>';

        // Build pagination UI
        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml = `<div class="mt-6 flex items-center justify-between">
                <p class="text-sm text-gray-600">Showing ${startIdx + 1}-${Math.min(startIdx + kpisPerPage, this.filteredBoardKPIs.length)} of ${this.filteredBoardKPIs.length} KPIs</p>
                <div class="flex gap-2">
                    <button onclick="dashboard.previousBoardPage()" class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentBoardPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${this.currentBoardPage === 1 ? 'disabled' : ''}>Previous</button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHtml += `<button onclick="dashboard.goToBoardPage(${i})" class="px-3 py-1 border rounded text-sm ${this.currentBoardPage === i ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}">${i}</button>`;
            }
            
            paginationHtml += `<button onclick="dashboard.nextBoardPage()" class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentBoardPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${this.currentBoardPage === totalPages ? 'disabled' : ''}>Next</button>
                </div>
            </div>`;
        }

        // Build KPI table - show green first, then concerns
        let tableHtml = '';
        [...byStatus.green, ...byStatus.amber, ...byStatus.red].forEach(kpi => {
            const statusColor = {
                green: 'bg-green-100 text-green-800',
                amber: 'bg-amber-100 text-amber-800',
                red: 'bg-red-100 text-red-800'
            }[kpi.status];
            const trendColor = kpi.trend.includes('-') ? 'text-red-600' : 'text-green-600';

            tableHtml += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${kpi.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${kpi.dept}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-gray-900">${kpi.current}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${kpi.target}</td>
                    <td class="px-6 py-4"><span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}">${kpi.status.toUpperCase()}</span></td>
                    <td class="px-6 py-4 text-sm font-medium ${trendColor}">${kpi.trend}</td>
                </tr>
            `;
        });

        const table = document.getElementById('boardExceptionTable');
        if (table) {
            if (this.filteredBoardKPIs.length === 0) {
                table.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No KPIs match your filters</td></tr>';
            } else {
                table.innerHTML = tableHtml;
            }
        }

        // Insert status buttons and pagination before the table
        const tableContainer = table?.closest('div');
        if (tableContainer) {
            const existingButtons = tableContainer.querySelector('.status-buttons-container');
            if (existingButtons) existingButtons.remove();
            
            const existingPagination = tableContainer.querySelector('.pagination-container');
            if (existingPagination) existingPagination.remove();

            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'status-buttons-container';
            buttonDiv.innerHTML = statusButtons;
            tableContainer.insertBefore(buttonDiv, table);

            const paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination-container';
            paginationDiv.innerHTML = paginationHtml;
            table.parentNode.appendChild(paginationDiv);

            // Attach status filter listeners
            buttonDiv.querySelectorAll('.status-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.currentTarget.classList.toggle('opacity-50');
                    e.currentTarget.classList.toggle('grayscale');
                    this.filterBoardByStatus();
                });
            });
        }
    }

    goToBoardPage(page) {
        this.currentBoardPage = page;
        this.renderBoardPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    previousBoardPage() {
        if (this.currentBoardPage > 1) {
            this.goToBoardPage(this.currentBoardPage - 1);
        }
    }

    nextBoardPage() {
        const totalPages = Math.ceil(this.filteredBoardKPIs.length / 12);
        if (this.currentBoardPage < totalPages) {
            this.goToBoardPage(this.currentBoardPage + 1);
        }
    }

    filterBoardByStatus() {
        const activeStatuses = new Set();
        document.querySelectorAll('.status-buttons-container .status-filter-btn').forEach(btn => {
            if (!btn.classList.contains('opacity-50')) {
                activeStatuses.add(btn.dataset.status);
            }
        });

        document.querySelectorAll('#boardExceptionTable tr').forEach(row => {
            const statusCell = row.querySelector('td:nth-child(5)');  
            if (statusCell) {
                const status = statusCell.textContent.trim().toLowerCase();
                const isHidden = !activeStatuses.has(status);
                row.classList.toggle('hidden', isHidden);
            }
        });
    }

    // ==================== DEPARTMENT VIEW ====================
    renderDepartmentView() {
        if (!this.selectedDepartment) {
            const els = ['deptStatsGrid', 'deptDemandAccess', 'deptDeliveryOutcomes', 'deptSafetyWorkforce', 'deptKPITable', 'peerComparisonGrid'];
            els.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = id === 'deptStatsGrid' ? '<p class="col-span-4 text-gray-500">Select a department above</p>' : '';
            });
            
            // Clear search filters
            const searchInput = document.getElementById('deptKPISearch');
            const categorySelect = document.getElementById('deptKPICategory');
            if (searchInput) searchInput.value = '';
            if (categorySelect) categorySelect.value = '';
            return;
        }

        this.renderDepartmentStats();
        this.renderDepartmentOverviewCards();
        this.applyDepartmentFilters();
        this.renderPeerComparison();
    }

    applyDepartmentFilters() {
        const searchTerm = (document.getElementById('deptKPISearch')?.value || '').toLowerCase();
        const categoryFilter = document.getElementById('deptKPICategory')?.value || '';

        const filtered = kpiDatabase
            .filter(k => k.dept === this.selectedDepartment)
            .filter(kpi => {
                const matchSearch = kpi.name.toLowerCase().includes(searchTerm) || 
                                  kpi.category.toLowerCase().includes(searchTerm);
                const matchCategory = !categoryFilter || kpi.category === categoryFilter;
                return matchSearch && matchCategory;
            });

        // Group by status and cache
        const byStatus = {
            red: filtered.filter(k => k.status === 'red'),
            amber: filtered.filter(k => k.status === 'amber'),
            green: filtered.filter(k => k.status === 'green')
        };

        this.filteredDeptKPIs = [...byStatus.red, ...byStatus.amber, ...byStatus.green];
        this.currentDeptPage = 1;
        this.renderDepartmentPage();
    }

    renderDepartmentPage() {
        const kpisPerPage = 12;
        const totalPages = Math.ceil(this.filteredDeptKPIs.length / kpisPerPage);
        const startIdx = (this.currentDeptPage - 1) * kpisPerPage;
        const pageKPIs = this.filteredDeptKPIs.slice(startIdx, startIdx + kpisPerPage);

        // Group page KPIs by status
        const byStatus = {
            red: pageKPIs.filter(k => k.status === 'red'),
            amber: pageKPIs.filter(k => k.status === 'amber'),
            green: pageKPIs.filter(k => k.status === 'green')
        };

        // Build status toggle buttons
        let statusButtons = '<div class="flex flex-wrap gap-3 mb-6">';
        
        if (this.filteredDeptKPIs.filter(k => k.status === 'red').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer" data-status="red">
                <span class="inline-block w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredDeptKPIs.filter(k => k.status === 'red').length}</span>
                <span>Critical Attention</span>
            </button>`;
        }
        
        if (this.filteredDeptKPIs.filter(k => k.status === 'amber').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" data-status="amber">
                <span class="inline-block w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredDeptKPIs.filter(k => k.status === 'amber').length}</span>
                <span>Needs Attention</span>
            </button>`;
        }
        
        if (this.filteredDeptKPIs.filter(k => k.status === 'green').length > 0) {
            statusButtons += `<button class="status-filter-btn px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer" data-status="green">
                <span class="inline-block w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">${this.filteredDeptKPIs.filter(k => k.status === 'green').length}</span>
                <span>On Track</span>
            </button>`;
        }
        
        statusButtons += '</div>';

        // Build pagination UI
        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml = `<div class="mt-6 flex items-center justify-between">
                <p class="text-sm text-gray-600">Showing ${startIdx + 1}-${Math.min(startIdx + kpisPerPage, this.filteredDeptKPIs.length)} of ${this.filteredDeptKPIs.length} KPIs</p>
                <div class="flex gap-2">
                    <button onclick="dashboard.previousDeptPage()" class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentDeptPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${this.currentDeptPage === 1 ? 'disabled' : ''}>Previous</button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHtml += `<button onclick="dashboard.goToDeptPage(${i})" class="px-3 py-1 border rounded text-sm ${this.currentDeptPage === i ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-100'}">${i}</button>`;
            }
            
            paginationHtml += `<button onclick="dashboard.nextDeptPage()" class="px-3 py-1 border border-gray-300 rounded text-sm ${this.currentDeptPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}" ${this.currentDeptPage === totalPages ? 'disabled' : ''}>Next</button>
                </div>
            </div>`;
        }

        // Build KPI table
        let tableHtml = '';
        [...byStatus.red, ...byStatus.amber, ...byStatus.green].forEach(kpi => {
            const statusColor = {
                green: 'bg-green-100 text-green-800',
                amber: 'bg-amber-100 text-amber-800',
                red: 'bg-red-100 text-red-800'
            }[kpi.status];
            const trendColor = kpi.trend.includes('-') ? 'text-red-600' : 'text-green-600';

            tableHtml += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${kpi.name}</td>
                    <td class="px-6 py-4 text-xs">${kpi.category}</td>
                    <td class="px-6 py-4 text-sm font-semibold">${kpi.current}</td>
                    <td class="px-6 py-4 text-sm">${kpi.target}</td>
                    <td class="px-6 py-4"><span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}">${kpi.status.toUpperCase()}</span></td>
                    <td class="px-6 py-4 text-sm font-medium ${trendColor}">${kpi.trend}</td>
                    <td class="px-6 py-4"><button class="text-blue-600 hover:text-blue-800 text-xs font-medium">Details →</button></td>
                </tr>
            `;
        });

        const table = document.getElementById('deptKPITable');
        if (table) {
            if (this.filteredDeptKPIs.length === 0) {
                table.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No KPIs found</td></tr>';
            } else {
                table.innerHTML = tableHtml;
            }
        }

        // Insert status buttons and pagination before the table
        const tableElement = table?.parentNode; // Get the <table> element
        const tableContainer = tableElement?.parentNode; // Get the container <div>
        
        if (tableContainer) {
            const existingButtons = tableContainer.querySelector('.status-buttons-container-dept');
            if (existingButtons) existingButtons.remove();
            
            const existingPagination = tableContainer.querySelector('.pagination-container-dept');
            if (existingPagination) existingPagination.remove();

            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'status-buttons-container-dept';
            buttonDiv.innerHTML = statusButtons;
            tableContainer.insertBefore(buttonDiv, tableElement);

            const paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination-container-dept';
            paginationDiv.innerHTML = paginationHtml;
            tableContainer.appendChild(paginationDiv);

            // Attach status filter listeners
            buttonDiv.querySelectorAll('.status-filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.currentTarget.classList.toggle('opacity-50');
                    e.currentTarget.classList.toggle('grayscale');
                    this.filterDeptByStatus();
                });
            });
        }
    }

    goToDeptPage(page) {
        this.currentDeptPage = page;
        this.renderDepartmentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    previousDeptPage() {
        if (this.currentDeptPage > 1) {
            this.goToDeptPage(this.currentDeptPage - 1);
        }
    }

    nextDeptPage() {
        const totalPages = Math.ceil(this.filteredDeptKPIs.length / 12);
        if (this.currentDeptPage < totalPages) {
            this.goToDeptPage(this.currentDeptPage + 1);
        }
    }

    filterDeptByStatus() {
        const activeStatuses = new Set();
        document.querySelectorAll('.status-buttons-container-dept .status-filter-btn').forEach(btn => {
            if (!btn.classList.contains('opacity-50')) {
                activeStatuses.add(btn.dataset.status);
            }
        });

        document.querySelectorAll('#deptKPITable tr').forEach(row => {
            const statusCell = row.querySelector('td:nth-child(5)');
            if (statusCell) {
                const status = statusCell.textContent.toLowerCase();
                row.classList.toggle('hidden', !activeStatuses.has(status));
            }
        });
    }

    renderDepartmentStats() {
        const deptKPIs = kpiDatabase.filter(k => k.dept === this.selectedDepartment);
        const stats = [
            { label: 'Total KPIs', value: deptKPIs.length, color: 'blue' },
            { label: 'Green', value: deptKPIs.filter(k => k.status === 'green').length, color: 'green' },
            { label: 'Amber', value: deptKPIs.filter(k => k.status === 'amber').length, color: 'amber' },
            { label: 'Red', value: deptKPIs.filter(k => k.status === 'red').length, color: 'red' }
        ];

        let html = '';
        stats.forEach(s => {
            const bgColor = `bg-${s.color}-100`;
            const textColor = `text-${s.color}-900`;
            const borderColor = `border-${s.color}-200`;
            html += `
                <div class="${bgColor} rounded-lg p-4 border ${borderColor}">
                    <p class="${textColor} text-sm font-semibold">${s.label}</p>
                    <p class="text-3xl font-bold ${textColor} mt-2">${s.value}</p>
                </div>
            `;
        });

        const container = document.getElementById('deptStatsGrid');
        if (container) container.innerHTML = html;
    }

    renderDepartmentOverviewCards() {
        const deptKPIs = kpiDatabase.filter(k => k.dept === this.selectedDepartment);

        // Demand & Access metrics for department
        const demandAccessKPIs = deptKPIs.filter(k => k.category === 'Demand' || k.category === 'Access');
        const demandAccessOnTarget = demandAccessKPIs.filter(k => k.status !== 'red').length;
        const demandAccessPerf = demandAccessKPIs.length > 0 ? Math.round((demandAccessOnTarget / demandAccessKPIs.length) * 100) : 0;
        
        // Find key demand metric
        const demandMetric = demandAccessKPIs.filter(k => k.category === 'Demand')[0];
        
        let demandAccessHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-blue-600">${demandAccessPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${demandAccessPerf}%"></div>
            </div>
            ${demandMetric ? `<div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-500">${demandMetric.name} (${this.selectedDepartment})</p>
                <p class="text-xl font-bold text-gray-900">${demandMetric.current.toLocaleString()}</p>
            </div>` : ''}
            <div class="mt-4 pt-4 border-t-2 border-blue-200">
                <p class="text-sm font-bold text-blue-900">${demandAccessOnTarget}/${demandAccessKPIs.length} on/above target</p>
            </div>
        `;
        const demandContainer = document.getElementById('deptDemandAccess');
        if (demandContainer) demandContainer.innerHTML = demandAccessHtml;

        // Delivery & Outcomes metrics for department
        const deliveryOutcomesKPIs = deptKPIs.filter(k => k.category === 'Delivery' || k.category === 'Outcomes');
        const deliveryOutcomesOnTarget = deliveryOutcomesKPIs.filter(k => k.status !== 'red').length;
        const deliveryOutcomesPerf = deliveryOutcomesKPIs.length > 0 ? Math.round((deliveryOutcomesOnTarget / deliveryOutcomesKPIs.length) * 100) : 0;
        
        // Find key delivery metric
        const deliveryMetric = deliveryOutcomesKPIs.find(k => k.name.toLowerCase().includes('attendance') || k.name.toLowerCase().includes('completion')) || deliveryOutcomesKPIs.find(k => k.category === 'Delivery');
        
        let deliveryHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-green-600">${deliveryOutcomesPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${deliveryOutcomesPerf}%"></div>
            </div>
            ${deliveryMetric ? `<div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-500">${deliveryMetric.name} (${this.selectedDepartment})</p>
                <p class="text-xl font-bold text-gray-900">${deliveryMetric.current}${typeof deliveryMetric.current === 'number' && deliveryMetric.current < 100 ? '%' : ''}</p>
            </div>` : ''}
            <div class="mt-4 pt-4 border-t-2 border-green-200">
                <p class="text-sm font-bold text-green-900">${deliveryOutcomesOnTarget}/${deliveryOutcomesKPIs.length} on/above target</p>
            </div>
        `;
        const deliveryContainer = document.getElementById('deptDeliveryOutcomes');
        if (deliveryContainer) deliveryContainer.innerHTML = deliveryHtml;

        // Safety & Workforce metrics for department
        const safetyKPIs = deptKPIs.filter(k => k.category === 'Safety');
        const safetyOnTarget = safetyKPIs.filter(k => k.status !== 'red').length;
        const safetyPerf = safetyKPIs.length > 0 ? Math.round((safetyOnTarget / safetyKPIs.length) * 100) : 0;
        const redSafetyCount = safetyKPIs.filter(k => k.status === 'red').length;
        
        // Find key safety metric
        const safetyMetric = safetyKPIs.filter(k => k.status === 'red')[0] || safetyKPIs[0];
        
        let safetyHtml = `
            <div class="flex justify-between items-center">
                <span class="text-gray-700">Performance</span>
                <span class="text-2xl font-bold text-purple-600">${safetyPerf}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-purple-600 h-2 rounded-full" style="width: ${safetyPerf}%"></div>
            </div>
            ${safetyMetric ? `<div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-500">${safetyMetric.name} (${this.selectedDepartment})</p>
                <p class="text-xl font-bold text-gray-900">${safetyMetric.current}</p>
            </div>` : ''}
            <div class="mt-4 pt-4 border-t-2 border-purple-200">
                <p class="text-sm font-bold text-purple-900">${safetyOnTarget}/${safetyKPIs.length} on/above target</p>
                ${redSafetyCount > 0 ? `<p class="text-xs text-red-600 font-medium mt-2">⚠️ ${redSafetyCount} area(s) of concern</p>` : ''}
            </div>
        `;
        const safetyContainer = document.getElementById('deptSafetyWorkforce');
        if (safetyContainer) safetyContainer.innerHTML = safetyHtml;
    }

    renderDepartmentKPIs() {
        const deptKPIs = kpiDatabase.filter(k => k.dept === this.selectedDepartment);
        let html = '';

        deptKPIs.forEach(kpi => {
            const statusColor = {
                green: 'bg-green-100 text-green-800',
                amber: 'bg-amber-100 text-amber-800',
                red: 'bg-red-100 text-red-800'
            }[kpi.status];
            const trendColor = kpi.trend.includes('-') ? 'text-red-600' : 'text-green-600';

            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${kpi.name}</td>
                    <td class="px-6 py-4 text-xs">${kpi.category}</td>
                    <td class="px-6 py-4 text-sm font-semibold">${kpi.current}</td>
                    <td class="px-6 py-4 text-sm">${kpi.target}</td>
                    <td class="px-6 py-4"><span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}">${kpi.status.toUpperCase()}</span></td>
                    <td class="px-6 py-4 text-sm font-medium ${trendColor}">${kpi.trend}</td>
                    <td class="px-6 py-4"><button class="text-blue-600 hover:text-blue-800 text-xs font-medium">Details →</button></td>
                </tr>
            `;
        });

        const container = document.getElementById('deptKPITable');
        if (container) container.innerHTML = html;
    }

    renderPeerComparison() {
        const allDepts = [...new Set(kpiDatabase.map(k => k.dept))];
        let html = '';

        allDepts.filter(d => d !== this.selectedDepartment).slice(0, 3).forEach(dept => {
            const peerKPIs = kpiDatabase.filter(k => k.dept === dept);
            const greenRate = Math.round((peerKPIs.filter(k => k.status === 'green').length / peerKPIs.length) * 100);

            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 class="font-semibold text-gray-900 mb-2">${dept}</h4>
                    <div class="text-2xl font-bold text-blue-600">${greenRate}%</div>
                    <p class="text-xs text-gray-600 mt-1">KPIs on/above target</p>
                </div>
            `;
        });

        const container = document.getElementById('peerComparisonGrid');
        if (container) container.innerHTML = html;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is logged in AND mainContent is visible
    const mainContent = document.getElementById('mainContent');
    const SESSION_KEY = 'kpiDashboardAuth';
    
    // Check if we have a valid session
    const stored = localStorage.getItem(SESSION_KEY);
    const isLoggedIn = stored && !mainContent.classList.contains('hidden');
    
    if (isLoggedIn && typeof kpiDatabase !== 'undefined' && !window.dashboard) {
        // User has an active session from a previous page load
        window.dashboard = new KPIDashboard();
        window.dashboard.switchView('ceo');
    }
});
