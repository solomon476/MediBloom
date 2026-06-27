// Mock Database (Shared in memory during lambda execution)
const db = {
    patients: [
        {
            id: 'P-1024',
            fullName: 'Jane Akinyi Ochieng',
            phone: '0712345678',
            idPassport: 'AB12345',
            dob: '15/03/1990',
            gender: 'F',
            address: 'Kibera, Soweto East',
            accessibility: 'Wheelchair',
            emergencyContact: {
                name: 'Peter Ochieng',
                phone: '0723456789',
                relation: 'Husband'
            },
            healthSummary: {
                condition: 'Hypertension',
                medication: 'Amlodipine',
                allergies: 'None',
                nextVisit: '14 days'
            },
            visits: [
                {
                    date: '10 Aug 2025',
                    details: 'BP: 140/90 | Weight: 68kg\nDx: Hypertension\nRx: Amlodipine 5mg'
                },
                {
                    date: '03 Jul 2025',
                    details: 'Routine check-up'
                }
            ],
            medications: [
                { name: 'Amlodipine 5mg', instructions: '1x daily (Morning)' },
                { name: 'Metformin 500mg', instructions: '2x daily (After meals)' }
            ]
        }
    ],
    bills: [
        { id: 'B-2048', patientId: 'P-1024', amount: 1800, status: 'pending' }
    ],
    stats: {
        totalPatients: 24,
        appointments: 8,
        revenue: 12400,
        pendingBills: 3
    }
};

export default function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url, method } = req;
    
    // Ensure we parse body for POST/PUT
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
    }

    try {
        // GET /api/health
        if (url.includes('/api/health')) {
            return res.status(200).json({ status: 'ok', dbStats: { patients: db.patients.length } });
        }

        // GET /api/stats
        if (url.includes('/api/stats') && method === 'GET') {
            // dynamically update total patients count
            db.stats.totalPatients = db.patients.length > 24 ? db.patients.length : 24;
            return res.status(200).json(db.stats);
        }

        // GET /api/patients
        if (url.endsWith('/api/patients') && method === 'GET') {
            return res.status(200).json(db.patients);
        }

        // POST /api/patients
        if (url.endsWith('/api/patients') && method === 'POST') {
            const newId = `P-${1000 + db.patients.length + 1}`;
            const newPatient = {
                id: newId,
                ...body,
                healthSummary: { condition: 'Unknown', medication: 'None', allergies: 'Unknown', nextVisit: 'TBD' },
                visits: [],
                medications: []
            };
            db.patients.push(newPatient);
            return res.status(201).json({ success: true, patient: newPatient });
        }

        // GET /api/patients/:id
        if (url.includes('/api/patients/') && method === 'GET') {
            const id = url.split('/').pop();
            const patient = db.patients.find(p => p.id === id);
            if (!patient) return res.status(404).json({ error: 'Patient not found' });
            return res.status(200).json(patient);
        }

        // POST /api/mpesa/push
        if (url.includes('/api/mpesa/push') && method === 'POST') {
            // Simulate processing time
            db.stats.revenue += (body.amount || 1800);
            db.stats.pendingBills = Math.max(0, db.stats.pendingBills - 1);
            return res.status(200).json({ success: true, message: 'STK Push sent successfully. Waiting for PIN.' });
        }

        return res.status(404).json({ error: 'Route not found' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
