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