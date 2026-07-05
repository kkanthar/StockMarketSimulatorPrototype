require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Using the direct relative path ensures Node can always find the key file
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const TICK_INTERVAL_MS = 4000; // 4 seconds
const GLOBAL_UPWARD_BIAS = 0.0005;

async function gameTick() {
    try {
        const marketRef = db.collection('market_state').doc('global');
        const marketDoc = await marketRef.get();
        if (!marketDoc.exists) return console.log("Market not initialized.");
        
        let marketData = marketDoc.data();
        if (marketData.isPaused) return;

        // 1. Process Macro Injections
        let injectionModifier = { trend: 0, volMultiplier: 1, targetSector: 'all' };
        if (marketData.activeInjection && marketData.injectionTicksLeft > 0) {
            switch(marketData.activeInjection) {
                // Global Macro Events
                case 'recession': injectionModifier = { trend: -0.015, volMultiplier: 1.5, targetSector: 'all' }; break;
                case 'tech_boom': injectionModifier = { trend: 0.025, volMultiplier: 1.2, targetSector: 'Tech' }; break;
                case 'rate_hike': injectionModifier = { trend: -0.02, volMultiplier: 1.1, targetSector: 'all' }; break;
                case 'inflation': injectionModifier = { trend: 0, volMultiplier: 2.5, targetSector: 'all' }; break;
                case 'recovery': injectionModifier = { trend: 0.005, volMultiplier: 0.8, targetSector: 'all' }; break;
                
                // Targeted Sector Events
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

        // 2. Update Stock Prices
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

        // 3. Batch Write: Market Update & Team Net Worths
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
                    if (liveStock) {
                        portfolioValue += team.holdings[ticker].shares * liveStock.price;
                    }
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

setInterval(gameTick, TICK_INTERVAL_MS);
console.log(`Game Engine running: Tick every ${TICK_INTERVAL_MS}ms`);