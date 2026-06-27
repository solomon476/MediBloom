/**
 * MEDI BLOOM
 * Core Application Logic
 */

const app = {
    currentScreen: 'login',
    
    // Initialize application
    init() {
        this.bindEvents();
        // Setup initial date
        this.updateDate();
    },
    
    bindEvents() {
        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // Simulate OTP sent, then navigate to dashboard
                const btn = loginForm.querySelector('button');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...';
                
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> OTP Verified';
                    btn.classList.add('btn-success');
                    btn.classList.remove('btn-primary');
                    
                    setTimeout(() => {
                        this.navigate('dashboard');
                        // Reset button
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.classList.add('btn-primary');
                            btn.classList.remove('btn-success');
                        }, 500);
                    }, 800);
                }, 1000);
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
                // If clicking button inside, don't toggle
                if(e.target.closest('.btn')) return;
                
                paymentMethods.forEach(m => m.classList.remove('active'));
                this.classList.add('active');
            });
        });
    },
    
    navigate(screenId) {
        // Prevent navigating to same screen
        if (this.currentScreen === screenId) return;
        
        const currentEl = document.getElementById(`screen-${this.currentScreen}`);
        const nextEl = document.getElementById(`screen-${screenId}`);
        
        if (!currentEl || !nextEl) {
            console.error('Screen not found');
            return;
        }

        // Remove hidden from next screen
        nextEl.classList.remove('hidden');
        
        // Setup animation classes
        // Small delay to allow display:block (removed hidden) to apply before animating
        requestAnimationFrame(() => {
            currentEl.classList.remove('active');
            currentEl.classList.add('exit-left');
            
            nextEl.classList.add('active');
            
            // Clean up after transition
            setTimeout(() => {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('exit-left');
                this.currentScreen = screenId;
                this.updateBottomNav(screenId);
            }, 400); // matches CSS transition time
        });
    },

    updateBottomNav(screenId) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Highlight logic based on screen
        if (screenId === 'dashboard') {
            navItems[0].classList.add('active');
        } else if (screenId === 'registration' || screenId === 'record') {
            navItems[1].classList.add('active');
        } else if (screenId === 'billing') {
            navItems[3].classList.add('active');
        }
    },
    
    simulateMpesa() {
        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('hidden');
        
        // Small delay for transition
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Auto success after 3 seconds for demo
        this.mpesaTimeout = setTimeout(() => {
            const card = modal.querySelector('.modal-card');
            card.innerHTML = `
                <div style="color: var(--success); font-size: 3rem; margin-bottom: 10px;">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3>Payment Received!</h3>
                <p>KES 1,800 received from Jane Ochieng.</p>
                <button class="btn btn-primary btn-block mt-4" onclick="app.closeMpesaModalAndNavigate()">View Receipt</button>
            `;
        }, 3000);
    },
    
    closeMpesaModal() {
        if(this.mpesaTimeout) clearTimeout(this.mpesaTimeout);
        
        const modal = document.getElementById('mpesa-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200); // match transition
    },
    
    closeMpesaModalAndNavigate() {
        this.closeMpesaModal();
        // Reset modal content for next time
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
            // Navigate back to dashboard or record
            this.navigate('dashboard');
        }, 300);
    },

    updateDate() {
        const dateEls = document.querySelectorAll('.date-text');
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        // Using provided current date from environment
        const today = new Date('2026-06-27T12:41:51-07:00');
        const dateString = today.toLocaleDateString('en-US', options);
        
        dateEls.forEach(el => {
            el.innerHTML = `<i class="fa-regular fa-calendar"></i> Today: ${dateString}`;
        });
    }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
