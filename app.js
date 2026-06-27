/**
 * MEDI BLOOM
 * Core Application Logic & API Integration
 */

const app = {
    currentScreen: 'login',
    state: {
        currentPatientId: null,
        stats: null,
        patientData: null
    },
    
    // Initialize application
    init() {
        this.bindEvents();
        this.updateDate();
        this.checkApiHealth();
    },
    
    async checkApiHealth() {
        try {
            console.log('Pinging backend API...');
            const response = await fetch('/api/health');
            const data = await response.json();
            console.log('✅ Backend API is online:', data);
        } catch (error) {
            console.warn('⚠️ Backend API is not reachable yet (or running locally without vercel dev):', error);
        }
    },
    
    bindEvents() {
        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = loginForm.querySelector('button');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...';
                
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> OTP Verified';
                    btn.classList.add('btn-success');
                    btn.classList.remove('btn-primary');
                    
                    setTimeout(() => {
                        this.navigate('dashboard');
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.classList.add('btn-primary');
                            btn.classList.remove('btn-success');
                        }, 500);
                    }, 800);
                }, 1000);
            });
        }

        // Registration Form
        const regForm = document.querySelector('.registration-form');
        const saveOfflineBtn = document.querySelector('#screen-registration .action-footer .btn-primary');
        if (saveOfflineBtn && regForm) {
            saveOfflineBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.submitRegistrationForm();
            });
        }

        // Bottom Navigation Active States
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if(item.getAttribute('onclick')) return; // handled by onclick
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Payment Method Toggles
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', function(e) {
                if(e.target.closest('.btn')) return;
                paymentMethods.forEach(m => m.classList.remove('active'));
                this.classList.add('active');
            });
        });
    },

    // ---------------------------------------------------------
    // API Fetch Methods
    // ---------------------------------------------------------
    
    async fetchStats() {
        try {
            const res = await fetch('/api/stats');
            if(!res.ok) throw new Error('API Error');
            const data = await res.json();
            this.state.stats = data;
            
            // Update UI
            document.getElementById('stat-patients').innerText = data.totalPatients;
            document.getElementById('stat-appointments').innerText = data.appointments;
            document.getElementById('stat-revenue').innerText = `KES ${data.revenue.toLocaleString()}`;
            document.getElementById('stat-pending').innerText = data.pendingBills;
        } catch(e) {
            console.error("Could not fetch stats", e);
        }
    },

    async fetchPatient(id) {
        try {
            const res = await fetch(`/api/patients/${id}`);
            if(!res.ok) throw new Error('Patient not found');
            const data = await res.json();
            this.state.patientData = data;
            this.renderPatientRecord(data);
        } catch(e) {
            console.error("Could not fetch patient", e);
        }
    },

    async submitRegistrationForm() {
        // Gather data
        const payload = {
            fullName: document.getElementById('reg-name').value,
            phone: document.getElementById('reg-phone').value,
            idPassport: document.getElementById('reg-id').value,
            dob: document.getElementById('reg-dob').value,
            gender: document.querySelector('input[name="gender"]:checked')?.value,
            address: document.getElementById('reg-address').value,
            accessibility: document.querySelector('input[name="acc"]:checked')?.value,
            emergencyContact: {
                name: document.getElementById('reg-emerg-name').value,
                phone: document.getElementById('reg-emerg-phone').value,
                relation: document.getElementById('reg-emerg-rel').value
            }
        };

        const saveBtn = document.querySelector('#screen-registration .action-footer .btn-primary');
        const origHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                this.state.currentPatientId = data.patient.id;
                this.navigate('record');
            }
        } catch(e) {
            alert('Failed to register patient: ' + e.message);
        } finally {
            saveBtn.innerHTML = origHtml;
        }
    },

    // ---------------------------------------------------------
    // Render Methods
    // ---------------------------------------------------------

    renderPatientRecord(patient) {
        const header = document.querySelector('#screen-record .patient-header-info');
        header.innerHTML = `
            <h2>👤 ${patient.fullName} <span class="badge-tag">#${patient.id}</span></h2>
            <p class="subtitle">DOB: ${patient.dob} | Gender: ${patient.gender}</p>
        `;

        // Render health summary... we can just keep the layout mostly static for demo, 
        // but inject dynamic values if desired. For now, the backend provides mocked visits.
        const timeline = document.querySelector('#screen-record .timeline');
        if (timeline && patient.visits.length > 0) {
            timeline.innerHTML = patient.visits.map((v, i) => `
                <div class="timeline-item">
                    <div class="timeline-marker ${i===0 ? 'active' : ''}"></div>
                    <div class="timeline-content glass-panel">
                        <div class="timeline-header">
                            <h4>${v.date}</h4>
                        </div>
                        <div class="visit-details">
                            <p>${v.details.replace(/\n/g, '<br>')}</p>
                        </div>
                        <button class="btn-text">View Details <i class="fa-solid fa-arrow-right"></i></button>
                    </div>
                </div>
            `).join('');
        }
    },

    // ---------------------------------------------------------
    // Navigation & UI
    // ---------------------------------------------------------
    
    navigate(screenId) {
        if (this.currentScreen === screenId) return;

        // Fetch data on navigation
        if (screenId === 'dashboard') {
            this.fetchStats();
        } else if (screenId === 'record') {
            if (!this.state.currentPatientId) this.state.currentPatientId = 'P-1024'; // Default mock
            this.fetchPatient(this.state.currentPatientId);
        }
        
        const currentEl = document.getElementById(`screen-${this.currentScreen}`);
        const nextEl = document.getElementById(`screen-${screenId}`);
        
        if (!currentEl || !nextEl) return;

        nextEl.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            currentEl.classList.remove('active');
            currentEl.classList.add('exit-left');
            nextEl.classList.add('active');
            
            setTimeout(() => {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('exit-left');
                this.currentScreen = screenId;
                this.updateBottomNav(screenId);
            }, 400); 
        });
    },

    updateBottomNav(screenId) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        if (screenId === 'dashboard') navItems[0].classList.add('active');
        else if (screenId === 'registration' || screenId === 'record') navItems[1].classList.add('active');
        else if (screenId === 'billing') navItems[3].classList.add('active');
    },
    
    async simulateMpesa() {
        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => modal.classList.add('active'));
        
        // Trigger API
        try {
            await fetch('/api/mpesa/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1800 })
            });
        } catch(e) {
            console.error("Mpesa push failed", e);
        }
        
        this.mpesaTimeout = setTimeout(() => {
            const card = modal.querySelector('.modal-card');
            card.innerHTML = `
                <div style="color: var(--success); font-size: 3rem; margin-bottom: 10px;">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3>Payment Received!</h3>
                <p>KES 1,800 received from patient.</p>
                <button class="btn btn-primary btn-block mt-4" onclick="app.closeMpesaModalAndNavigate()">View Receipt</button>
            `;
        }, 3000);
    },
    
    closeMpesaModal() {
        if(this.mpesaTimeout) clearTimeout(this.mpesaTimeout);
        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 200); 
    },
    
    closeMpesaModalAndNavigate() {
        this.closeMpesaModal();
        setTimeout(() => {
            const modal = document.getElementById('mpesa-modal');
            modal.querySelector('.modal-card').innerHTML = `
                <div class="spinner-container">
                    <div class="spinner"></div>
                </div>
                <h3>Waiting for Payment...</h3>
                <p>Patient is entering PIN on their phone.</p>
                <button class="btn btn-outline btn-block mt-4" onclick="app.closeMpesaModal()">Cancel</button>
            `;
            this.navigate('dashboard');
        }, 300);
    },

    updateDate() {
        const dateEls = document.querySelectorAll('.date-text');
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const today = new Date('2026-06-27T12:41:51-07:00');
        const dateString = today.toLocaleDateString('en-US', options);
        dateEls.forEach(el => el.innerHTML = `<i class="fa-regular fa-calendar"></i> Today: ${dateString}`);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
