// ============================================================
// MEDI BLOOM — Backend API (Vercel Serverless, ESM)
// All routes in one file. Uses in-memory store (no seed data).
// ============================================================

// In-memory store — completely empty on first load
const db = {
    patients: [],   // { id, fullName, phone, idPassport, dob, gender, address, accessibility, emergencyContact, healthSummary, visits, medications }
    bills: [],      // { id, patientId, services, total, status, paymentMethod, createdAt }
    appointments: [],
    stats: {
        appointments: 0,
        revenue: 0,
        pendingBills: 0
    }
};

let patientCounter = 1000;
let billCounter = 2000;

// ---- helpers ----
function cors(res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

function json(res, status, data) {
    res.status(status).json(data);
}

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url  = req.url || '';
    const method = req.method;
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    body = body || {};

    try {

        // ── GET /api/health ─────────────────────────────────────
        if (url.includes('/api/health')) {
            return json(res, 200, {
                status: 'ok',
                message: 'Medi Bloom API is running.',
                counts: { patients: db.patients.length, bills: db.bills.length }
            });
        }

        // ── GET /api/stats ───────────────────────────────────────
        if (url.includes('/api/stats') && method === 'GET') {
            const pending = db.bills.filter(b => b.status === 'pending').length;
            const revenue = db.bills
                .filter(b => b.status === 'paid')
                .reduce((sum, b) => sum + (b.total || 0), 0);
            return json(res, 200, {
                totalPatients: db.patients.length,
                appointments: db.appointments.length,
                revenue,
                pendingBills: pending
            });
        }

        // ── GET /api/patients ────────────────────────────────────
        if (url.match(/\/api\/patients$/) && method === 'GET') {
            return json(res, 200, db.patients);
        }

        // ── POST /api/patients ───────────────────────────────────
        if (url.match(/\/api\/patients$/) && method === 'POST') {
            patientCounter++;
            const newPatient = {
                id: `P-${patientCounter}`,
                fullName: body.fullName || '',
                phone: body.phone || '',
                idPassport: body.idPassport || '',
                dob: body.dob || '',
                gender: body.gender || '',
                address: body.address || '',
                accessibility: body.accessibility || 'none',
                emergencyContact: body.emergencyContact || {},
                healthSummary: { condition: 'Unknown', medication: 'None', allergies: 'Unknown', nextVisit: 'TBD' },
                visits: [],
                medications: [],
                createdAt: new Date().toISOString()
            };
            db.patients.push(newPatient);
            return json(res, 201, { success: true, patient: newPatient });
        }

        // ── GET /api/patients/:id ────────────────────────────────
        const patientMatch = url.match(/\/api\/patients\/([^/?]+)/);
        if (patientMatch && method === 'GET') {
            const id = patientMatch[1];
            const patient = db.patients.find(p => p.id === id);
            if (!patient) return json(res, 404, { error: 'Patient not found' });
            return json(res, 200, patient);
        }

        // ── POST /api/patients/:id/visits ────────────────────────
        const visitMatch = url.match(/\/api\/patients\/([^/?]+)\/visits/);
        if (visitMatch && method === 'POST') {
            const id = visitMatch[1];
            const patient = db.patients.find(p => p.id === id);
            if (!patient) return json(res, 404, { error: 'Patient not found' });
            const visit = { date: new Date().toLocaleDateString('en-GB'), ...body };
            patient.visits.unshift(visit);
            return json(res, 201, { success: true, visit });
        }

        // ── GET /api/bills ───────────────────────────────────────
        if (url.match(/\/api\/bills$/) && method === 'GET') {
            const patientId = new URL(url, 'http://x').searchParams.get('patientId');
            const results = patientId
                ? db.bills.filter(b => b.patientId === patientId)
                : db.bills;
            return json(res, 200, results);
        }

        // ── POST /api/bills ──────────────────────────────────────
        if (url.match(/\/api\/bills$/) && method === 'POST') {
            billCounter++;
            const newBill = {
                id: `B-${billCounter}`,
                patientId: body.patientId || '',
                services: body.services || [],
                total: body.total || 0,
                status: 'pending',
                paymentMethod: null,
                createdAt: new Date().toISOString()
            };
            db.bills.push(newBill);
            return json(res, 201, { success: true, bill: newBill });
        }

        // ── POST /api/mpesa/push ─────────────────────────────────
        if (url.includes('/api/mpesa/push') && method === 'POST') {
            const billId = body.billId;
            const bill = db.bills.find(b => b.id === billId);
            if (bill) {
                bill.status = 'paid';
                bill.paymentMethod = 'mpesa';
            }
            return json(res, 200, {
                success: true,
                message: 'STK Push accepted. Awaiting PIN.',
                checkoutRequestId: `CHK-${Date.now()}`
            });
        }

        // ── POST /api/mpesa/confirm ──────────────────────────────
        if (url.includes('/api/mpesa/confirm') && method === 'POST') {
            const billId = body.billId;
            const bill = db.bills.find(b => b.id === billId);
            if (bill) {
                bill.status = 'paid';
                bill.paymentMethod = 'mpesa';
            }
            return json(res, 200, { success: true, message: 'Payment confirmed.' });
        }

        // ── POST /api/cash ───────────────────────────────────────
        if (url.includes('/api/cash') && method === 'POST') {
            const billId = body.billId;
            const bill = db.bills.find(b => b.id === billId);
            if (bill) {
                bill.status = 'paid';
                bill.paymentMethod = 'cash';
            }
            return json(res, 200, { success: true, message: 'Cash payment recorded.' });
        }

        return json(res, 404, { error: `Route not found: ${method} ${url}` });

    } catch (err) {
        console.error(err);
        return json(res, 500, { error: err.message });
    }
}
