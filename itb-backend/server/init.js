require('dotenv').config();
// 1. Import the specific tools directly from Firebase App and Firestore
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 2. Point to your service account key
const serviceAccount = require('../serviceAccountKey.json');

// 3. Initialize using the newly imported tools
initializeApp({
  credential: cert(serviceAccount)
});

// 4. Set up the database connection
const db = getFirestore();

const baseStocks = [
    { ticker: "VLX", name: "Veltrix Corp", sector: "Tech", price: 120.50, volatility: 0.04, trend: 0.001 },
    { ticker: "ARI", name: "Aurion Ind", sector: "Industrial", price: 85.20, volatility: 0.015, trend: 0.0005 },
    { ticker: "NEX", name: "Nexus Dynamics", sector: "Tech", price: 210.00, volatility: 0.05, trend: 0.002 },
    { ticker: "CST", name: "Capstone Retail", sector: "Retail", price: 45.30, volatility: 0.02, trend: -0.001 },
    { ticker: "LUM", name: "Lumina Energy", sector: "Energy", price: 60.00, volatility: 0.025, trend: 0.000 },
    { ticker: "QNT", name: "Quantus Fin", sector: "Finance", price: 150.10, volatility: 0.018, trend: 0.001 },
    { ticker: "STR", name: "Stratos Aero", sector: "Industrial", price: 310.45, volatility: 0.03, trend: 0.0015 },
    { ticker: "BLW", name: "BlueWave Health", sector: "Healthcare", price: 95.60, volatility: 0.01, trend: 0.002 },
    { ticker: "OMN", name: "OmniLogistics", sector: "Transport", price: 55.00, volatility: 0.02, trend: 0.0005 },
    { ticker: "VRT", name: "Vertex Mat", sector: "Industrial", price: 40.20, volatility: 0.025, trend: -0.0005 },
    { ticker: "SYN", name: "Synergy Bio", sector: "Healthcare", price: 18.50, volatility: 0.08, trend: 0.001 },
    { ticker: "ZNT", name: "Zenith Real Est", sector: "Real Estate", price: 110.00, volatility: 0.012, trend: 0.000 },
    { ticker: "PRM", name: "Prime Consumer", sector: "Retail", price: 75.80, volatility: 0.015, trend: 0.001 },
    { ticker: "GLB", name: "Global Networks", sector: "Tech", price: 190.25, volatility: 0.035, trend: 0.001 },
    { ticker: "AXI", name: "Axiom Utilities", sector: "Energy", price: 65.40, volatility: 0.008, trend: 0.0002 }
];

async function initializeDatabase() {
    try {
        console.log("Initializing database...");
        
        // 1. Initialize Market State
        await db.collection('market_state').doc('global').set({
            isPaused: false,
            day: 1,
            activeInjection: null,
            injectionTicksLeft: 0,
            stocks: baseStocks.map(s => ({ ...s, prevPrice: s.price }))
        });
        console.log("Market state initialized.");

        // 2. Initialize Teams
        const teams = [
            { id: 'team1', name: 'Alpha Capital', role: 'team' },
            { id: 'team2', name: 'Beta Ventures', role: 'team' },
            { id: 'team3', name: 'Gamma Holdings', role: 'team' }
        ];

        const batch = db.batch();
        teams.forEach(team => {
            const teamRef = db.collection('teams').doc(team.id);
            batch.set(teamRef, {
                name: team.name,
                role: team.role,
                cash: 100000,
                holdings: {},
                netWorth: 100000,
                history: [100000]
            });
        });

        await batch.commit();
        console.log("Teams initialized successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Initialization failed:", error);
        process.exit(1);
    }
}

initializeDatabase();