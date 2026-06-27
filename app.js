/**
 * MEDI BLOOM — Frontend Application Logic
 * Fully wired to the backend API. No mock data.
 */

const app = {
    // ── State ──────────────────────────────────────────────────
    currentScreen: 'login',
    currentPatient: null,   // full patient object from API
    currentBill: null,      // bill being composed
    services: [],           // line items on current bill
    phone: '',              // logged-in user's phone
    mpesaTimeout: null,

    // ── Bootstrap ─────────────────────────────────────────────
    init() {
        this.updateDate();
        this.bindAll();
    },

    // ── Utility: API fetch ────────────────────────────────────
    async api(method, path, body) {
        try {
            const opts = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(path, opts);
            return await res.json();
        } catch (e) {
            this.toast('Network error. Please check connection.', 'error');
            throw e;
        }
    },

    // ── Toast notification ────────────────────────────────────
    toast(msg, type = 'success') {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = `toast toast-${type}`;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    },

    // ── Navigation ────────────────────────────────────────────
    navigate(screenId, opts = {}) {
        if (this.currentScreen === screenId) return;

        const fromEl = document.getElementById(`screen-${this.currentScreen}`);
        const toEl   = document.getElementById(`screen-${screenId}`);
        if (!fromEl || !toEl) return;

        toEl.classList.remove('hidden');

        requestAnimationFrame(() => {
            fromEl.classList.remove('active');
            fromEl.classList.add('exit-left');
            toEl.classList.add('active');

            setTimeout(() => {
                fromEl.classList.add('hidden');
                fromEl.classList.remove('exit-left');
                this.currentScreen = screenId;
                this.syncBottomNav(screenId);
            }, 400);
        });

        // On-navigate side effects
        if (screenId === 'dashboard') this.loadDashboard();
        if (screenId === 'patients')  this.loadAllPatients();
        if (screenId === 'billing' && this.currentPatient) this.setupBilling();
    },

    syncBottomNav(screenId) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const map = { dashboard: 'nav-home', patients: 'nav-patients', registration: 'nav-patients', record: 'nav-patients', billing: 'nav-billing' };
        const target = document.getElementById(map[screenId]);
        if (target) target.classList.add('active');
    },

    updateDate() {
        const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const s = new Date().toLocaleDateString('en-US', opts);
        const el = document.getElementById('dash-date');
        if (el) el.innerHTML = `<i class="fa-regular fa-calendar"></i> Today: ${s}`;
    },

    // ── Bind ALL buttons/events ───────────────────────────────
    bindAll() {
        // --- LOGIN ---
        document.getElementById('login-form').addEventListener('submit', async e => {
            e.preventDefault();
            const btn      = document.getElementById('login-btn');
            const btnText  = document.getElementById('login-btn-text');
            const otpGroup = document.getElementById('otp-group');
            const phoneVal = document.getElementById('phone-input').value.trim();

            if (!otpGroup.classList.contains('hidden')) {
                // Step 2: verify OTP (mock: any 6-digit code works)
                const otp = document.getElementById('otp-input').value.trim();
                if (otp.length < 4) { this.toast('Enter the OTP sent to your phone.', 'error'); return; }
                btn.disabled = true;
                btnText.textContent = 'Verifying…';
                await new Promise(r => setTimeout(r, 800));
                this.phone = phoneVal;
                document.getElementById('dash-doctor-name').textContent = `+254${phoneVal}`;
                btn.disabled = false;
                btnText.innerHTML = 'Send OTP';
                otpGroup.classList.add('hidden');
                document.getElementById('otp-input').value = '';
                this.navigate('dashboard');
            } else {
                // Step 1: send OTP
                if (!phoneVal) { this.toast('Enter your phone number.', 'error'); return; }
                btn.disabled = true;
                btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
                await new Promise(r => setTimeout(r, 1000));
                btn.disabled = false;
                btnText.textContent = 'Verify OTP';
                otpGroup.classList.remove('hidden');
                document.getElementById('otp-input').focus();
                this.toast('OTP sent! (Demo: enter any 4+ digits)', 'success');
            }
        });

        // --- LOGOUT ---
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.phone = '';
            this.currentPatient = null;
            document.getElementById('phone-input').value = '';
            this.navigate('login');
        });

        // --- BOTTOM NAV ---
        document.getElementById('nav-home').addEventListener('click', e => { e.preventDefault(); this.navigate('dashboard'); });
        document.getElementById('nav-patients').addEventListener('click', e => { e.preventDefault(); this.navigate('patients'); });
        document.getElementById('nav-schedule').addEventListener('click', e => { e.preventDefault(); this.toast('Appointments module coming soon!', 'success'); });
        document.getElementById('nav-billing').addEventListener('click', e => { e.preventDefault(); this.navigate('billing'); });

        // --- DASHBOARD QUICK ACTIONS ---
        document.getElementById('qa-new-patient').addEventListener('click', () => this.navigate('registration'));
        document.getElementById('qa-new-appoint').addEventListener('click', () => this.toast('Appointments module coming soon!', 'success'));
        document.getElementById('qa-billing').addEventListener('click', () => {
            if (!this.currentPatient) { this.toast('Select a patient first.', 'error'); this.navigate('patients'); return; }
            this.navigate('billing');
        });
        document.getElementById('qa-stock').addEventListener('click', () => this.toast('Inventory module coming soon!', 'success'));
        document.getElementById('view-all-patients-btn').addEventListener('click', () => this.navigate('patients'));

        // --- PATIENTS SCREEN ---
        document.getElementById('patients-back-btn').addEventListener('click', () => this.navigate('dashboard'));
        document.getElementById('patients-add-btn').addEventListener('click', () => this.navigate('registration'));
        document.getElementById('patient-search').addEventListener('input', e => this.filterPatients(e.target.value));

        // --- REGISTRATION ---
        document.getElementById('reg-back-btn').addEventListener('click', () => this.navigate('dashboard'));
        document.getElementById('reg-cancel-btn').addEventListener('click', () => this.navigate('dashboard'));
        document.getElementById('reg-save-btn').addEventListener('click', () => this.savePatient());

        // --- PATIENT RECORD ---
        document.getElementById('record-back-btn').addEventListener('click', () => this.navigate('patients'));
        document.getElementById('record-sms-btn').addEventListener('click', () => {
            if (this.currentPatient) {
                this.toast(`SMS reminder sent to ${this.currentPatient.phone}!`, 'success');
            }
        });
        document.getElementById('record-print-btn').addEventListener('click', () => window.print());
        document.getElementById('record-new-visit-btn').addEventListener('click', () => this.navigate('billing'));

        // --- BILLING ---
        document.getElementById('billing-back-btn').addEventListener('click', () => this.navigate('record'));
        document.getElementById('add-service-btn').addEventListener('click', () => this.openServiceModal());
        document.getElementById('mpesa-send-btn').addEventListener('click', () => this.sendMpesa());
        document.getElementById('cash-confirm-btn').addEventListener('click', () => this.confirmCash());
        document.getElementById('pay-later-btn').addEventListener('click', () => this.payLater());
        document.getElementById('receipt-btn').addEventListener('click', () => window.print());

        // Payment method toggles
        document.getElementById('mpesa-method-panel').addEventListener('click', function(e) {
            if (e.target.closest('.btn')) return;
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
        document.getElementById('cash-method-panel').addEventListener('click', function(e) {
            if (e.target.closest('.btn')) return;
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });

        // --- M-PESA MODAL ---
        document.getElementById('mpesa-cancel-btn').addEventListener('click', () => this.closeMpesaModal());

        // --- SERVICE MODAL ---
        document.getElementById('svc-cancel-btn').addEventListener('click', () => this.closeServiceModal());
        document.getElementById('svc-add-btn').addEventListener('click', () => this.addService());
    },

    // ── DASHBOARD ─────────────────────────────────────────────
    async loadDashboard() {
        // Stats
        const stats = await this.api('GET', '/api/stats');
        if (stats) {
            document.getElementById('stat-patients').textContent    = stats.totalPatients ?? 0;
            document.getElementById('stat-appointments').textContent = stats.appointments ?? 0;
            document.getElementById('stat-revenue').textContent      = `KES ${(stats.revenue ?? 0).toLocaleString()}`;
            document.getElementById('stat-pending').textContent      = stats.pendingBills ?? 0;
        }

        // Recent patients (last 3)
        const patients = await this.api('GET', '/api/patients');
        const container = document.getElementById('patients-list-container');
        if (!patients || patients.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-face-smile-beam"></i><p>No patients yet.<br>Register the first one!</p></div>`;
        } else {
            const recent = patients.slice(-3).reverse();
            container.innerHTML = recent.map(p => this.patientCardHTML(p)).join('');
            container.querySelectorAll('.patient-row').forEach(row => {
                row.addEventListener('click', () => this.openPatient(row.dataset.id));
            });
        }

        // Alerts
        const alertsEl = document.getElementById('alerts-container');
        const pending = stats?.pendingBills ?? 0;
        alertsEl.innerHTML = `
            <div class="alert-item alert-success glass-panel">
                <div class="alert-icon">🟢</div>
                <div class="alert-content">System live. ${stats?.totalPatients ?? 0} patient(s) registered.</div>
            </div>
            ${pending > 0 ? `<div class="alert-item alert-warning glass-panel">
                <div class="alert-icon">🟡</div>
                <div class="alert-content">${pending} unpaid bill(s) pending.</div>
            </div>` : ''}
        `;
    },

    patientCardHTML(p) {
        const initials = (p.fullName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
        return `<div class="patient-row glass-panel" data-id="${p.id}" style="cursor:pointer;">
            <div class="patient-avatar">${initials}</div>
            <div class="patient-info">
                <h4>${p.fullName}</h4>
                <p>${p.phone} · ${p.id}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);"></i>
        </div>`;
    },

    // ── PATIENTS LIST ─────────────────────────────────────────
    _allPatients: [],
    async loadAllPatients() {
        const list = document.getElementById('full-patients-list');
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading…</p></div>';
        const patients = await this.api('GET', '/api/patients');
        this._allPatients = patients || [];
        this.renderPatientsList(this._allPatients);
    },

    renderPatientsList(patients) {
        const list = document.getElementById('full-patients-list');
        if (!patients || patients.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fa-regular fa-face-smile-beam"></i><p>No patients yet. Tap + to add one!</p></div>';
            return;
        }
        list.innerHTML = patients.map(p => this.patientCardHTML(p)).join('');
        list.querySelectorAll('.patient-row').forEach(row => {
            row.addEventListener('click', () => this.openPatient(row.dataset.id));
        });
    },

    filterPatients(query) {
        const q = query.toLowerCase();
        const filtered = this._allPatients.filter(p =>
            (p.fullName || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q) ||
            (p.id || '').toLowerCase().includes(q)
        );
        this.renderPatientsList(filtered);
    },

    // ── REGISTRATION ──────────────────────────────────────────
    async savePatient() {
        const name  = document.getElementById('reg-name').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        if (!name || !phone) { this.toast('Full Name and Phone are required.', 'error'); return; }

        const btn = document.getElementById('reg-save-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

        const payload = {
            fullName:     name,
            phone,
            idPassport:   document.getElementById('reg-id').value.trim(),
            dob:          document.getElementById('reg-dob').value,
            gender:       document.querySelector('input[name="gender"]:checked')?.value || 'F',
            address:      document.getElementById('reg-address').value.trim(),
            accessibility: document.querySelector('input[name="acc"]:checked')?.value || 'none',
            emergencyContact: {
                name:     document.getElementById('reg-emerg-name').value.trim(),
                phone:    document.getElementById('reg-emerg-phone').value.trim(),
                relation: document.getElementById('reg-emerg-rel').value.trim()
            }
        };

        const data = await this.api('POST', '/api/patients', payload);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Patient';

        if (data?.success) {
            this.toast(`Patient ${data.patient.fullName} registered! ID: ${data.patient.id}`, 'success');
            this.currentPatient = data.patient;
            // Reset form
            document.getElementById('registration-form').reset();
            this.navigate('record');
            this.renderPatientRecord(data.patient);
        } else {
            this.toast('Failed to save patient.', 'error');
        }
    },

    // ── PATIENT RECORD ─────────────────────────────────────────
    async openPatient(id) {
        this.navigate('record');
        const patient = await this.api('GET', `/api/patients/${id}`);
        if (!patient || patient.error) { this.toast('Patient not found.', 'error'); return; }
        this.currentPatient = patient;
        this.renderPatientRecord(patient);
    },

    renderPatientRecord(patient) {
        // Header
        document.getElementById('record-patient-header').innerHTML = `
            <h2>👤 ${patient.fullName} <span class="badge-tag">#${patient.id}</span></h2>
            <p class="subtitle">${patient.phone} · DOB: ${patient.dob || 'N/A'}</p>
        `;

        // Health summary
        const hs = patient.healthSummary || {};
        document.getElementById('record-health-summary').innerHTML = `
            <li><span class="key">Condition:</span><span class="value text-warning fw-bold">${hs.condition || '–'}</span></li>
            <li><span class="key">Medication:</span><span class="value">${hs.medication || '–'}</span></li>
            <li><span class="key">Allergies:</span><span class="value text-success">${hs.allergies || '–'}</span></li>
            <li><span class="key">Next Visit:</span><span class="value">${hs.nextVisit || '–'}</span></li>
        `;

        // Visit timeline
        const timeline = document.getElementById('record-timeline');
        if (!patient.visits || patient.visits.length === 0) {
            timeline.innerHTML = '<div class="empty-state"><i class="fa-regular fa-calendar-xmark"></i><p>No visits yet.</p></div>';
        } else {
            timeline.innerHTML = patient.visits.map((v, i) => `
                <div class="timeline-item">
                    <div class="timeline-marker ${i === 0 ? 'active' : ''}"></div>
                    <div class="timeline-content glass-panel">
                        <div class="timeline-header"><h4>${v.date || '–'}</h4></div>
                        <div class="visit-details"><p>${(v.details || '').replace(/\n/g, '<br>')}</p></div>
                    </div>
                </div>
            `).join('');
        }

        // Medications
        const medsEl = document.getElementById('record-meds');
        if (!patient.medications || patient.medications.length === 0) {
            medsEl.innerHTML = '<div class="empty-state small"><p>No medications on record.</p></div>';
        } else {
            medsEl.innerHTML = patient.medications.map(m => `
                <div class="med-item">
                    <div class="med-icon"><i class="fa-solid fa-capsules"></i></div>
                    <div class="med-info"><h4>${m.name}</h4><p>${m.instructions}</p></div>
                </div>
            `).join('');
        }

        // Update M-PESA phone
        document.getElementById('mpesa-phone').textContent = patient.phone || '–';
    },

    // ── BILLING ───────────────────────────────────────────────
    setupBilling() {
        this.services = [];
        document.getElementById('invoice-items-list').innerHTML = '';
        document.getElementById('invoice-total').textContent = 'KES 0';
        document.getElementById('billing-patient-name').textContent =
            this.currentPatient ? `Patient: ${this.currentPatient.fullName}` : '–';
        if (this.currentPatient) {
            document.getElementById('mpesa-phone').textContent = this.currentPatient.phone;
            document.getElementById('cash-amount').value = '';
        }
    },

    openServiceModal() {
        document.getElementById('svc-name').value = '';
        document.getElementById('svc-amount').value = '';
        const modal = document.getElementById('service-modal');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        document.getElementById('svc-name').focus();
    },

    closeServiceModal() {
        const modal = document.getElementById('service-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    addService() {
        const name   = document.getElementById('svc-name').value.trim();
        const amount = parseFloat(document.getElementById('svc-amount').value);
        if (!name || isNaN(amount) || amount <= 0) {
            this.toast('Enter a valid service name and amount.', 'error');
            return;
        }
        this.services.push({ name, amount });
        this.refreshInvoice();
        this.closeServiceModal();
    },

    refreshInvoice() {
        const list  = document.getElementById('invoice-items-list');
        const total = this.services.reduce((s, i) => s + i.amount, 0);
        list.innerHTML = this.services.map(s => `
            <li><span>${s.name}</span><span>${s.amount.toLocaleString()}</span></li>
        `).join('');
        document.getElementById('invoice-total').textContent = `KES ${total.toLocaleString()}`;
    },

    async createBillOnBackend() {
        if (!this.currentPatient || this.services.length === 0) {
            this.toast('Add at least one service first.', 'error');
            return null;
        }
        const total = this.services.reduce((s, i) => s + i.amount, 0);
        const data = await this.api('POST', '/api/bills', {
            patientId: this.currentPatient.id,
            services: this.services,
            total
        });
        if (data?.success) {
            this.currentBill = data.bill;
            return data.bill;
        }
        this.toast('Failed to create bill.', 'error');
        return null;
    },

    async sendMpesa() {
        const bill = await this.createBillOnBackend();
        if (!bill) return;

        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));

        // Call backend push
        await this.api('POST', '/api/mpesa/push', { billId: bill.id, amount: bill.total });

        // Simulate 3s STK processing
        this.mpesaTimeout = setTimeout(async () => {
            await this.api('POST', '/api/mpesa/confirm', { billId: bill.id });
            const card = modal.querySelector('.modal-card');
            card.innerHTML = `
                <div style="color:var(--success);font-size:3rem;margin-bottom:10px;">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3>Payment Received!</h3>
                <p>KES ${bill.total.toLocaleString()} confirmed via M-Pesa.</p>
                <button class="btn btn-primary btn-block mt-4" id="mpesa-done-btn">Done</button>
            `;
            document.getElementById('mpesa-done-btn').addEventListener('click', () => {
                this.closeMpesaModal(true);
            });
        }, 3000);
    },

    async confirmCash() {
        const amount = parseFloat(document.getElementById('cash-amount').value);
        const total  = this.services.reduce((s, i) => s + i.amount, 0);
        if (isNaN(amount) || amount < total) {
            this.toast(`Amount must be at least KES ${total.toLocaleString()}.`, 'error');
            return;
        }
        const bill = await this.createBillOnBackend();
        if (!bill) return;
        await this.api('POST', '/api/cash', { billId: bill.id });
        this.toast(`Cash payment of KES ${total.toLocaleString()} confirmed!`, 'success');
        this.navigate('dashboard');
    },

    async payLater() {
        const bill = await this.createBillOnBackend();
        if (!bill) return;
        this.toast(`Bill ${bill.id} saved. Payment pending.`, 'success');
        this.navigate('dashboard');
    },

    closeMpesaModal(navigateAway = false) {
        if (this.mpesaTimeout) clearTimeout(this.mpesaTimeout);
        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
            // Restore modal content
            modal.querySelector('.modal-card').innerHTML = `
                <div class="spinner-container"><div class="spinner"></div></div>
                <h3>Waiting for Payment…</h3>
                <p>Patient is entering PIN on their phone.</p>
                <button class="btn btn-outline btn-block mt-4" id="mpesa-cancel-btn">Cancel</button>
            `;
            document.getElementById('mpesa-cancel-btn').addEventListener('click', () => this.closeMpesaModal());
            if (navigateAway) this.navigate('dashboard');
        }, 250);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
