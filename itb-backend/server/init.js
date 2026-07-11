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
const baseStocks = [
    // 1. TECHNOLOGY (Base Vol: 1.80 -> 0.08 | Base Trend: +0.08 -> 0.002)
    {
        ticker: "SKY",
        name: "Skynet AI Solutions",
        sector: "Technology",
        price: 148.25,
        volatility: 0.075,
        trend: 0.0022
        // Dependencies:
        // Energy (High Inverse)
        // Industrials (Medium)
    },
    {
        ticker: "GLT",
        name: "Global Logic Tech",
        sector: "Technology",
        price: 85.50,
        volatility: 0.082,
        trend: 0.0018
        // Dependencies:
        // Financials (High)
        // Consumer Discretionary (Low)
    },
    {
        ticker: "QTI",
        name: "Quantum Technologies Inc.",
        sector: "Technology",
        price: 210.00,
        volatility: 0.078,
        trend: 0.0021
        // Dependencies:
        // Consumer Discretionary (High)
        // Real Estate (Medium)
    },
    {
        ticker: "CLD",
        name: "Cloud Nine Data",
        sector: "Technology",
        price: 320.10,
        volatility: 0.085,
        trend: 0.0019
        // Dependencies:
        // Energy (High Inverse)
        // Materials (Medium)
    },
    {
        ticker: "BYT",
        name: "Bytefront Security",
        sector: "Technology",
        price: 65.75,
        volatility: 0.079,
        trend: 0.0023
        // Dependencies:
        // Financials (High)
        // Healthcare (Medium)
    },

    // 2. CONSUMER DISCRETIONARY (Base Vol: 1.40 -> 0.056 | Base Trend: +0.05 -> 0.0005)
    {
        ticker: "FFG",
        name: "Fabric Frontiers Group",
        sector: "Consumer Discretionary",
        price: 42.30,
        volatility: 0.052,
        trend: 0.0006
        // Dependencies:
        // Materials (High Inverse)
        // Transportation (Medium Inverse)
    },
    {
        ticker: "BNG",
        name: "Beacon Network Group",
        sector: "Consumer Discretionary",
        price: 115.60,
        volatility: 0.058,
        trend: 0.0004
        // Dependencies:
        // Technology (High Inverse)
        // Financials (Low)
    },
    {
        ticker: "CPF",
        name: "Core Peak Fitness",
        sector: "Consumer Discretionary",
        price: 28.90,
        volatility: 0.054,
        trend: 0.0005
        // Dependencies:
        // Healthcare (Medium)
        // Materials (Low Inverse)
    },
    {
        ticker: "AVO",
        name: "Alt-Venture Operations",
        sector: "Consumer Discretionary",
        price: 78.40,
        volatility: 0.060,
        trend: 0.0007
        // Dependencies:
        // Consumer Staples (High Inverse)
        // Real Estate (Medium Inverse)
    },
    {
        ticker: "FOMO",
        name: "Frontline Media Outdoors",
        sector: "Consumer Discretionary",
        price: 54.25,
        volatility: 0.057,
        trend: 0.0003
        // Dependencies:
        // Transportation (High)
        // Real Estate (Medium)
    },

    // 3. CONSUMER STAPLES (Base Vol: 0.60 -> 0.008 | Base Trend: +0.02 -> -0.001)
    {
        ticker: "CCC",
        name: "Crown Cereals Corp",
        sector: "Consumer Staples",
        price: 92.15,
        volatility: 0.0075,
        trend: -0.0011
        // Dependencies:
        // Materials (High Inverse)
        // Transportation (Medium)
    },
    {
        ticker: "PBT",
        name: "Pure Basic Toiletries",
        sector: "Consumer Staples",
        price: 45.80,
        volatility: 0.0085,
        trend: -0.0009
        // Dependencies:
        // Materials (High Inverse)
        // Healthcare (Medium)
    },
    {
        ticker: "CAFF",
        name: "Clear Aqua Food & Farms",
        sector: "Consumer Staples",
        price: 67.50,
        volatility: 0.0078,
        trend: -0.0010
        // Dependencies:
        // Technology (High)
        // Healthcare (Medium Inverse)
    },
    {
        ticker: "MMP",
        name: "Midland Meat Packers",
        sector: "Consumer Staples",
        price: 110.20,
        volatility: 0.0082,
        trend: -0.0012
        // Dependencies:
        // Energy (High Inverse)
        // Transportation (Medium)
    },
    {
        ticker: "SOM",
        name: "Summit Organic Markets",
        sector: "Consumer Staples",
        price: 135.60,
        volatility: 0.0079,
        trend: -0.0008
        // Dependencies:
        // Real Estate (High Inverse)
        // Financials (Medium)
    },

    // 4. FINANCIALS (Base Vol: 1.10 -> 0.038 | Base Trend: +0.04 -> 0.000)
    {
        ticker: "MAT",
        name: "Matrix Apex Trust",
        sector: "Financials",
        price: 245.00,
        volatility: 0.035,
        trend: 0.0001
        // Dependencies:
        // Real Estate (High)
        // Technology (Low Inverse)
    },
    {
        ticker: "BRO",
        name: "BlockRoute Exchange",
        sector: "Financials",
        price: 175.50,
        volatility: 0.040,
        trend: -0.0001
        // Dependencies:
        // Technology (High)
        // Consumer Discretionary (Medium)
    },
    {
        ticker: "HFC",
        name: "Horizon Financial Credit",
        sector: "Financials",
        price: 88.20,
        volatility: 0.037,
        trend: 0.0002
        // Dependencies:
        // Consumer Discretionary (High)
        // Healthcare (Low)
    },
    {
        ticker: "YOLO",
        name: "Yield Optima Lending",
        sector: "Financials",
        price: 32.40,
        volatility: 0.041,
        trend: -0.0002
        // Dependencies:
        // Technology (High)
        // Real Estate (Medium Inverse)
    },
    {
        ticker: "LSS",
        name: "Liberty Shield Solutions",
        sector: "Financials",
        price: 15.80,
        volatility: 0.036,
        trend: 0.0000
        // Dependencies:
        // Consumer Staples (High)
        // Healthcare (Medium)
    },

    // 5. HEALTHCARE (Base Vol: 1.50 -> 0.062 | Base Trend: +0.06 -> 0.001)
    {
        ticker: "PLC",
        name: "Placid Life Sciences",
        sector: "Healthcare",
        price: 125.30,
        volatility: 0.058,
        trend: 0.0011
        // Dependencies:
        // Consumer Discretionary (High)
        // Materials (Low Inverse)
    },
    {
        ticker: "CRU",
        name: "Cybernetics Research Union",
        sector: "Healthcare",
        price: 198.50,
        volatility: 0.065,
        trend: 0.0009
        // Dependencies:
        // Technology (High)
        // Industrials (Medium)
    },
    {
        ticker: "WMD",
        name: "WellMed Diagnostics",
        sector: "Healthcare",
        price: 64.20,
        volatility: 0.060,
        trend: 0.0012
        // Dependencies:
        // Technology (High)
        // Financials (Low)
    },
    {
        ticker: "SOT",
        name: "Summit Oncology Therapeutics",
        sector: "Healthcare",
        price: 42.10,
        volatility: 0.064,
        trend: 0.0008
        // Dependencies:
        // Consumer Staples (High)
        // Materials (Medium Inverse)
    },
    {
        ticker: "BNB",
        name: "BioNova Biotech",
        sector: "Healthcare",
        price: 89.60,
        volatility: 0.061,
        trend: 0.0010
        // Dependencies:
        // Consumer Discretionary (High)
        // Real Estate (Medium Inverse)
    },

    // 6. ENERGY (Base Vol: 1.60 -> 0.068 | Base Trend: +0.05 -> 0.0005)
    {
        ticker: "HWP",
        name: "Horizon Wind Power",
        sector: "Energy",
        price: 76.40,
        volatility: 0.064,
        trend: 0.0006
        // Dependencies:
        // Consumer Staples (High Inverse)
        // Industrials (Medium)
    },
    {
        ticker: "SUN",
        name: "Sunburst Solar Networks",
        sector: "Energy",
        price: 52.80,
        volatility: 0.071,
        trend: 0.0004
        // Dependencies:
        // Technology (High)
        // Real Estate (Medium)
    },
    {
        ticker: "SMG",
        name: "Sovereign Mining & Gas",
        sector: "Energy",
        price: 145.20,
        volatility: 0.067,
        trend: 0.0005
        // Dependencies:
        // Industrials (High)
        // Transportation (Medium)
    },
    {
        ticker: "SEC",
        name: "Static Energy Corp",
        sector: "Energy",
        price: 38.50,
        volatility: 0.070,
        trend: 0.0003
        // Dependencies:
        // Materials (High Inverse)
        // Real Estate (Low)
    },
    {
        ticker: "RGI",
        name: "Radiance Generation Inc.",
        sector: "Energy",
        price: 112.90,
        volatility: 0.065,
        trend: 0.0007
        // Dependencies:
        // Materials (High Inverse)
        // Healthcare (Medium Inverse)
    },

    // 7. TRANSPORTATION (Base Vol: 1.20 -> 0.044 | Base Trend: +0.03 -> -0.0005)
    {
        ticker: "LLA",
        name: "Latitude Logistics Airlines",
        sector: "Transportation",
        price: 84.60,
        volatility: 0.041,
        trend: -0.0006
        // Dependencies:
        // Energy (High Inverse)
        // Consumer Discretionary (Medium)
    },
    {
        ticker: "SMD",
        name: "Swift Mail Delivery",
        sector: "Transportation",
        price: 165.20,
        volatility: 0.046,
        trend: -0.0004
        // Dependencies:
        // Materials (High Inverse)
        // Technology (Medium Inverse)
    },
    {
        ticker: "TJR",
        name: "Transit Jet Rideshare",
        sector: "Transportation",
        price: 48.90,
        volatility: 0.043,
        trend: -0.0005
        // Dependencies:
        // Energy (High Inverse)
        // Financials (Low)
    },
    {
        ticker: "TPA",
        name: "Trans-Pacific Aerospace",
        sector: "Transportation",
        price: 215.40,
        volatility: 0.047,
        trend: -0.0003
        // Dependencies:
        // Technology (High)
        // Healthcare (High Inverse)
    },
    {
        ticker: "HBL",
        name: "Horizon Bulk Logistics",
        sector: "Transportation",
        price: 95.80,
        volatility: 0.042,
        trend: -0.0007
        // Dependencies:
        // Industrials (High)
        // Energy (Medium Inverse)
    },

    // 8. REAL ESTATE (Base Vol: 0.90 -> 0.026 | Base Trend: +0.02 -> -0.001)
    {
        ticker: "SBC",
        name: "Skyline Block Condos",
        sector: "Real Estate",
        price: 130.50,
        volatility: 0.024,
        trend: -0.0011
        // Dependencies:
        // Financials (High)
        // Materials (Medium Inverse)
    },
    {
        ticker: "HHR",
        name: "Horizon Housing REIT",
        sector: "Real Estate",
        price: 68.20,
        volatility: 0.028,
        trend: -0.0009
        // Dependencies:
        // Consumer Discretionary (High)
        // Financials (Medium)
    },
    {
        ticker: "MVL",
        name: "Metro Valley Land",
        sector: "Real Estate",
        price: 185.90,
        volatility: 0.025,
        trend: -0.0010
        // Dependencies:
        // Technology (High)
        // Energy (Low Inverse)
    },
    {
        ticker: "SLE",
        name: "Summit Land Estates",
        sector: "Real Estate",
        price: 45.60,
        volatility: 0.027,
        trend: -0.0012
        // Dependencies:
        // Industrials (High)
        // Healthcare (Medium Inverse)
    },
    {
        ticker: "MBR",
        name: "Meridian Bay Rentals",
        sector: "Real Estate",
        price: 58.40,
        volatility: 0.026,
        trend: -0.0008
        // Dependencies:
        // Consumer Staples (High)
        // Transportation (Low)
    },

    // 9. INDUSTRIALS (Base Vol: 1.30 -> 0.050 | Base Trend: +0.04 -> 0.000)
    {
        ticker: "DTS",
        name: "Dynamic Transit Solutions",
        sector: "Industrials",
        price: 110.30,
        volatility: 0.047,
        trend: 0.0001
        // Dependencies:
        // Materials (High Inverse)
        // Transportation (Medium)
    },
    {
        ticker: "LHT",
        name: "Lighthouse Heavy Tools",
        sector: "Industrials",
        price: 82.15,
        volatility: 0.052,
        trend: -0.0001
        // Dependencies:
        // Materials (High Inverse)
        // Healthcare (Low)
    },
    {
        ticker: "AHI",
        name: "Apex Heavy Industries",
        sector: "Industrials",
        price: 145.20,
        volatility: 0.049,
        trend: 0.0002
        // Dependencies:
        // Transportation (High)
        // Energy (Medium Inverse)
    },
    {
        ticker: "TMG",
        name: "Titan Machinery Group",
        sector: "Industrials",
        price: 95.80,
        volatility: 0.053,
        trend: -0.0002
        // Dependencies:
        // Materials (High)
        // Consumer Discretionary (Low)
    },
    {
        ticker: "OPC",
        name: "Omni-Packaging Corp",
        sector: "Industrials",
        price: 65.40,
        volatility: 0.048,
        trend: 0.0000
        // Dependencies:
        // Transportation (High)
        // Materials (Medium Inverse)
    },

    // 10. MATERIALS (Base Vol: 1.40 -> 0.056 | Base Trend: +0.03 -> -0.0005)
    {
        ticker: "SYN",
        name: "Synthex Textiles",
        sector: "Materials",
        price: 32.70,
        volatility: 0.053,
        trend: -0.0006
        // Dependencies:
        // Consumer Discretionary (High)
        // Energy (Low Inverse)
    },
    {
        ticker: "CMG",
        name: "Core Mining",
        sector: "Materials",
        price: 88.50,
        volatility: 0.059,
        trend: -0.0004
        // Dependencies:
        // Industrials (High)
        // Transportation (Medium)
    },
    {
        ticker: "PRP",
        name: "Prime Polymers",
        sector: "Materials",
        price: 76.50,
        volatility: 0.055,
        trend: -0.0005
        // Dependencies:
        // Healthcare (High)
        // Transportation (Medium Inverse)
    },
    {
        ticker: "CBS",
        name: "Continental Box Supplies",
        sector: "Materials",
        price: 105.40,
        volatility: 0.058,
        trend: -0.0003
        // Dependencies:
        // Transportation (High)
        // Consumer Discretionary (High)
    },
    {
        ticker: "MDC",
        name: "Meridian Dirt & Concrete",
        sector: "Materials",
        price: 55.90,
        volatility: 0.054,
        trend: -0.0007
        // Dependencies:
        // Real Estate (High)
        // Industrials (Medium)
    }
];

async function initializeDatabase() {
    try {
        console.log("Initializing database...");
        
        // 1. Initialize Market State
        await db.collection('market_state').doc('global').set({
            isPaused: false,
            sessionEnded: false,
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