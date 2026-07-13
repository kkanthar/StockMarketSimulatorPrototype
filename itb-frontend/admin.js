import { db, getSession } from './firebase-config.js';
import { collection, doc, onSnapshot, updateDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const session = getSession();
if (!session || session.role !== 'admin') window.location.href = "index.html";

const INITIAL_CASH = 100000;
const formatCurrency = (num) => num.toLocaleString('en-US', {style: 'currency', currency: 'USD'});

let currentIsPaused = false;
let currentSessionEnded = false;

// Default stocks for resetting the market state
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

// 1. Leaderboard Logic
onSnapshot(collection(db, "teams"), (snap) => {
    let teams = [];
    snap.forEach(doc => {
        const data = doc.data();
        if (data.role !== 'team') return;
        
        const currentVal = data.netWorth || INITIAL_CASH;
        const longTerm = (currentVal - INITIAL_CASH) / INITIAL_CASH;
        
        const hist = data.history || [INITIAL_CASH];
        const shortTermHistIndex = Math.max(0, hist.length - 6);
        const pastVal = hist[shortTermHistIndex];
        const shortTerm = (currentVal - pastVal) / pastVal;
        
        const combinedScore = (longTerm * 0.7) + (shortTerm * 0.3);
        teams.push({ name: data.name, currentVal, shortTerm, longTerm, score: combinedScore });
    });

    teams.sort((a, b) => b.score - a.score);
    
    const tbody = document.querySelector('#leaderboard-table tbody');
    const finalTbody = document.querySelector('#final-leaderboard-table tbody');
    tbody.innerHTML = '';
    finalTbody.innerHTML = '';

    teams.forEach((r, idx) => {
        const stColor = r.shortTerm >= 0 ? 'text-green' : 'text-red';
        const ltColor = r.longTerm >= 0 ? 'text-green' : 'text-red';
        const highlight = idx === 0 ? 'color: var(--bbg-orange); font-weight: bold;' : '';
        
        const rowHTML = `
            <tr>
                <td class="font-mono" style="${highlight}">${idx + 1}</td>
                <td style="text-transform: uppercase; ${highlight}">${r.name}</td>
                <td class="font-mono" style="${highlight}">${formatCurrency(r.currentVal)}</td>
                <td class="font-mono ${stColor}">${(r.shortTerm*100).toFixed(2)}%</td>
                <td class="font-mono ${ltColor}">${(r.longTerm*100).toFixed(2)}%</td>
                <td class="font-mono" style="color: var(--bbg-text-muted);">${(r.score*100).toFixed(3)}</td>
            </tr>`;
            
        tbody.innerHTML += rowHTML;
        finalTbody.innerHTML += rowHTML; 
    });
});

// 2. Market State & Control Listener
onSnapshot(doc(db, "market_state", "global"), (snap) => {
    const data = snap.data();
    if(!data) return;
    
    document.getElementById('active-injection').innerText = (data.activeInjection && data.injectionTicksLeft > 0)
        ? `${data.activeInjection.replace(/_/g, ' ').toUpperCase()} (${data.injectionTicksLeft} Ticks)` 
        : 'NONE';

    currentIsPaused = !!data.isPaused;
    currentSessionEnded = !!data.sessionEnded;
    
    const btnPause = document.getElementById('btn-pause');
    const btnEnd = document.getElementById('btn-end');

    if (currentSessionEnded) {
        document.getElementById('final-screen').classList.add('show');
        btnPause.disabled = true;
        btnEnd.disabled = true;
    } else {
        document.getElementById('final-screen').classList.remove('show');
        btnPause.disabled = false;
        btnEnd.disabled = false;
        
        if (currentIsPaused) {
            btnPause.innerText = "RESUME MARKET";
            btnPause.style.borderLeftColor = "var(--bbg-green)";
        } else {
            btnPause.innerText = "PAUSE MARKET";
            btnPause.style.borderLeftColor = "var(--bbg-orange)";
        }
    }
});

// 3. Transaction Feed
const logQuery = query(collection(db, "transaction_log"), orderBy("timestamp", "desc"), limit(10));
onSnapshot(logQuery, (snap) => {
    const feedBody = document.getElementById('action-feed');
    feedBody.innerHTML = ''; 
    snap.forEach(doc => {
        const tx = doc.data();
        const color = tx.action === 'BUY' ? 'text-green' : 'text-red';
        feedBody.innerHTML += `
            <div class="feed-item">
                <span style="color:var(--bbg-text-muted)">[TICK]</span> <strong>${tx.teamId}</strong> 
                <span class="${color}">${tx.action}</span> ${tx.shares} ${tx.ticker} @ ${formatCurrency(tx.price)}
            </div>`;
    });
});

// 4. Admin Actions
window.openNewsFeed = () => {
    window.open('news-feed.html', '_blank');
};

window.triggerInjection = async (type) => {
    if (currentSessionEnded) return;
    try {
        await updateDoc(doc(db, "market_state", "global"), {
            activeInjection: type,
            injectionTicksLeft: 10
        });
    } catch(e) { console.error("Injection failed", e); }
};

window.togglePause = async () => {
    if (currentSessionEnded) return;
    try {
        await updateDoc(doc(db, "market_state", "global"), {
            isPaused: !currentIsPaused
        });
    } catch(e) { console.error("Pause failed", e); }
};

window.endSession = async () => {
    if (!confirm("Are you sure you want to end the session? This halts trading and locks the simulation.")) return;
    try {
        await updateDoc(doc(db, "market_state", "global"), {
            sessionEnded: true,
            isPaused: true 
        });
    } catch(e) { console.error("End session failed", e); }
};

// NEW: Reset Session Logic
window.resetSession = async () => {
    if (!confirm("WARNING: This will wipe all team portfolios, reset the market to Day 1, and resume trading. Are you sure?")) return;
    try {
        // 1. Reset Global Market State
        await updateDoc(doc(db, "market_state", "global"), {
            isPaused: false,
            sessionEnded: false,
            day: 1,
            activeInjection: null,
            injectionTicksLeft: 0,
            stocks: baseStocks.map(s => ({ ...s, prevPrice: s.price }))
        });

        // 2. Wipes and resets all teams' data
        const teamsSnap = await getDocs(collection(db, "teams"));
        teamsSnap.forEach(async (teamDoc) => {
            const data = teamDoc.data();
            if (data.role === 'team') {
                await updateDoc(teamDoc.ref, {
                    cash: INITIAL_CASH,
                    holdings: {},
                    netWorth: INITIAL_CASH,
                    history: [INITIAL_CASH]
                });
            }
        });

    } catch(e) { console.error("Reset failed", e); }
};