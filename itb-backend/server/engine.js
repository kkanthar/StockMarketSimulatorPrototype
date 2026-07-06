require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const express = require('express'); // NEW: Required for cloud hosting

// 1. Secure Credential Injection
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Cloud environment: reads the raw JSON string from Render's secure vault
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Local fallback: uses your local file
        serviceAccount = require('../serviceAccountKey.json'); 
    }
} catch (error) {
    console.error("CRITICAL: Failed to load Firebase credentials. Ensure FIREBASE_SERVICE_ACCOUNT is set.", error);
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TICK_INTERVAL_MS = 4000;
const GLOBAL_UPWARD_BIAS = 0.0005;

async function gameTick() {
    try {
        const marketRef = db.collection('market_state').doc('global');
        const marketDoc = await marketRef.get();
        if (!marketDoc.exists) return console.log("Market not initialized.");
        
        let marketData = marketDoc.data();
        if (marketData.isPaused) return;

        // Process Macro Injections
        let injectionModifier = { trend: 0, volMultiplier: 1, targetSector: 'all' };
        if (marketData.activeInjection && marketData.injectionTicksLeft > 0) {
            switch(marketData.activeInjection) {
                case 'recession': injectionModifier = { trend: -0.015, volMultiplier: 1.5, targetSector: 'all' }; break;
                case 'tech_boom': injectionModifier = { trend: 0.025, volMultiplier: 1.2, targetSector: 'Tech' }; break;
                case 'rate_hike': injectionModifier = { trend: -0.02, volMultiplier: 1.1, targetSector: 'all' }; break;
                case 'inflation': injectionModifier = { trend: 0, volMultiplier: 2.5, targetSector: 'all' }; break;
                case 'recovery': injectionModifier = { trend: 0.005, volMultiplier: 0.8, targetSector: 'all' }; break;
                
                case 'ai_boom': injectionModifier = { trend: 0.035, volMultiplier: 1.5, targetSector: 'Tech' }; break;
                case 'energy_crisis': injectionModifier = { trend: 0.04, volMultiplier: 2.0, targetSector: 'Energy' }; break;
                case 'retail_collapse': injectionModifier = { trend: -0.03, volMultiplier: 1.8, targetSector: 'Retail' }; break;
                case 'fintech_surge': injectionModifier = { trend: 0.025, volMultiplier: 1.3, targetSector: 'Finance' }; break;
                case 'health_scare': injectionModifier = { trend: -0.025, volMultiplier: 2.5, targetSector: 'Healthcare' }; break;
                case 'transport_disruption': injectionModifier = { trend: -0.02, volMultiplier: 1.5, targetSector: 'Transport' }; break;
                case 'housing_crash': injectionModifier = { trend: -0.035, volMultiplier: 1.2, targetSector: 'Real Estate' }; break;
                case 'industrial_slowdown': injectionModifier = { trend: -0.015, volMultiplier: 0.9, targetSector: 'Industrial' }; break;
            }
            marketData.injectionTicksLeft--;
            if (marketData.injectionTicksLeft === 0) marketData.activeInjection = null;
        }

        // Update Stock Prices
        const newStocks = marketData.stocks.map(stock => {
            let activeTrend = stock.trend + GLOBAL_UPWARD_BIAS;
            let activeVol = stock.volatility;

            if (injectionModifier.targetSector === 'all' || injectionModifier.targetSector === stock.sector) {
                activeTrend += injectionModifier.trend;
                activeVol *= injectionModifier.volMultiplier;
            }

            const change = stock.price * (activeTrend + (Math.random() - 0.5) * activeVol);
            let newPrice = Math.max(1, stock.price + change);
            return { ...stock, price: newPrice, prevPrice: stock.price };
        });

        // Batch Write
        const batch = db.batch();
        batch.update(marketRef, { 
            stocks: newStocks, 
            day: marketData.day + 1, 
            activeInjection: marketData.activeInjection, 
            injectionTicksLeft: marketData.injectionTicksLeft 
        });

        const teamsSnap = await db.collection('teams').get();
        teamsSnap.forEach(doc => {
            const team = doc.data();
            let portfolioValue = 0;
            if (team.holdings) {
                Object.keys(team.holdings).forEach(ticker => {
                    const liveStock = newStocks.find(s => s.ticker === ticker);
                    if (liveStock) portfolioValue += team.holdings[ticker].shares * liveStock.price;
                });
            }
            
            const netWorth = team.cash + portfolioValue;
            let newHistory = [...(team.history || [100000])];
            newHistory.push(netWorth);
            if (newHistory.length > 50) newHistory.shift();

            batch.update(doc.ref, { netWorth, history: newHistory });
        });

        await batch.commit();
        console.log(`[Tick] Day ${marketData.day + 1} processed.`);
    } catch (error) {
        console.error("Game Tick Error:", error);
    }
}

// 2. HTTP Server Binding (Required by Cloud Hosts to prevent crashes)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('In The Black: Game Engine is running.');
});

app.listen(PORT, () => {
    console.log(`Health Check Server listening on port ${PORT}`);
    // Boot the game tick loop only after the server successfully binds
    setInterval(gameTick, TICK_INTERVAL_MS);
    console.log(`Game Engine running: Tick every ${TICK_INTERVAL_MS}ms`);
});