import { db, getSession } from './firebase-config.js';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const session = getSession();
if (!session || session.role !== 'team') window.location.href = "index.html";
document.getElementById('team-name').innerText = session.name.toUpperCase();

let liveMarketData = { stocks: [] };
let liveTeamData = { cash: 0, holdings: {} };
let selectedTicker = null;
let currentActiveInjection = null; 

const formatCurrency = (num) => num.toLocaleString('en-US', {style: 'currency', currency: 'USD'});

// --- TRADINGVIEW CHART SETUP ---
const chart = LightweightCharts.createChart(document.getElementById('chart-container'), {
    layout: { background: { color: '#050505' }, textColor: '#d1d4dc' },
    grid: { vertLines: { color: '#2a2a2a' }, horzLines: { color: '#2a2a2a' } },
});

const holdingsSeriesMap = new Map();
const historicalPrices = {}; 
const CHART_COLORS = [
    '#f37021', '#00e676', '#3b82f6', '#fbbf24', '#8b5cf6', 
    '#ff3b30', '#06b6d4', '#f43f5e', '#a855f7', '#10b981', 
    '#eab308', '#ec4899', '#6366f1', '#14b8a6', '#84cc16'
];

window.openTradePanel = (ticker) => {
    if (liveMarketData.sessionEnded || liveMarketData.isPaused) return;

    selectedTicker = ticker;
    const stock = liveMarketData.stocks.find(s => s.ticker === ticker);
    document.getElementById('panel-ticker').innerText = stock.ticker;
    document.getElementById('panel-price').innerText = formatCurrency(stock.price);
    document.getElementById('trade-panel').classList.add('open');
};

const updateMarketTable = (stocks) => {
    const tbody = document.querySelector('#market-table tbody');
    tbody.innerHTML = '';
    stocks.forEach(stock => {
        const chg = (stock.price - stock.prevPrice) / stock.prevPrice;
        const color = chg >= 0 ? 'text-green' : 'text-red';
        tbody.innerHTML += `
            <tr onclick="openTradePanel('${stock.ticker}')">
                <td style="font-weight:bold; color:var(--bbg-text-main);">${stock.ticker}</td>
                <td style="color:var(--bbg-text-muted);">${stock.sector}</td>
                <td class="font-mono">${stock.price.toFixed(2)}</td>
                <td class="font-mono ${color}">${(chg*100).toFixed(2)}%</td>
            </tr>`;
    });
};

const updatePortfolioTable = (holdings) => {
    const tbody = document.querySelector('#portfolio-table tbody');
    tbody.innerHTML = '';
    for(let ticker in holdings) {
        const data = holdings[ticker];
        const avgCost = data.totalCost / data.shares;
        
        const stockIndex = liveMarketData.stocks.findIndex(s => s.ticker === ticker);
        const dotColor = CHART_COLORS[stockIndex >= 0 ? stockIndex % CHART_COLORS.length : 0];

        tbody.innerHTML += `
            <tr onclick="openTradePanel('${ticker}')">
                <td style="font-weight:bold;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${dotColor}; margin-right:5px;"></span>
                    ${ticker}
                </td>
                <td class="font-mono">${data.shares}</td>
                <td class="font-mono">${formatCurrency(avgCost)}</td>
            </tr>`;
    }
};

// MARKET STATE LISTENER
onSnapshot(doc(db, "market_state", "global"), (snap) => {
    liveMarketData = snap.data();
    if(!liveMarketData || !liveMarketData.stocks) return;

    document.getElementById('sim-day').innerText = liveMarketData.day;
    updateMarketTable(liveMarketData.stocks);
    
    // --- PAUSE & END SESSION OVERLAYS ---
    const pauseOverlay = document.getElementById('pause-overlay');
    const endOverlay = document.getElementById('end-overlay');
    const tradePanel = document.getElementById('trade-panel');
    const marketStatusText = document.getElementById('market-status');

    if (liveMarketData.sessionEnded) {
        endOverlay.classList.add('show');
        pauseOverlay.classList.remove('show');
        tradePanel.classList.remove('open');
        marketStatusText.innerText = "CLOSED";
        marketStatusText.className = "text-red";
    } else if (liveMarketData.isPaused) {
        pauseOverlay.classList.add('show');
        endOverlay.classList.remove('show');
        tradePanel.classList.remove('open');
        marketStatusText.innerText = "HALTED";
        marketStatusText.className = "text-red";
        
        // Populate specific data onto the pause screen
        document.getElementById('pause-day').innerText = liveMarketData.day;
        if (liveTeamData && liveTeamData.netWorth) {
            document.getElementById('pause-portfolio').innerText = formatCurrency(liveTeamData.netWorth);
        }
    } else {
        pauseOverlay.classList.remove('show');
        endOverlay.classList.remove('show');
        marketStatusText.innerText = "OPEN";
        marketStatusText.className = "text-green";
    }

    // Process Injection Banners & Notifications
    const banner = document.getElementById('injection-banner');
    if (liveMarketData.activeInjection && liveMarketData.injectionTicksLeft > 0) {
        const eventName = liveMarketData.activeInjection.replace(/_/g, ' ').toUpperCase();
        
        banner.innerText = `ACTIVE EVENT: ${eventName} (${liveMarketData.injectionTicksLeft} TICKS LEFT)`;
        banner.style.display = 'block';

        if (currentActiveInjection !== liveMarketData.activeInjection) {
            currentActiveInjection = liveMarketData.activeInjection;
            const toast = document.getElementById('event-toast');
            document.getElementById('toast-message').innerText = `${eventName} DETECTED IN THE MARKET.`;
            toast.classList.add('show'); 
            setTimeout(() => toast.classList.remove('show'), 5000);
        }
    } else {
        banner.style.display = 'none';
        currentActiveInjection = null; 
    }
    
    // --- DYNAMIC CHART DATA ACCUMULATION ---
    liveMarketData.stocks.forEach(stock => {
        if (!historicalPrices[stock.ticker]) {
            historicalPrices[stock.ticker] = [];
        }
        
        const history = historicalPrices[stock.ticker];
        if (history.length === 0 || history[history.length - 1].time !== liveMarketData.day) {
            history.push({ time: liveMarketData.day, value: stock.price });
        }

        if (holdingsSeriesMap.has(stock.ticker)) {
            holdingsSeriesMap.get(stock.ticker).update({ time: liveMarketData.day, value: stock.price });
        }
    });
    
    if(selectedTicker) {
        const panelStock = liveMarketData.stocks.find(s => s.ticker === selectedTicker);
        if(panelStock) document.getElementById('panel-price').innerText = formatCurrency(panelStock.price);
    }
});

onSnapshot(doc(db, "teams", session.id), (snap) => {
    liveTeamData = snap.data();
    if(!liveTeamData) return;
    document.getElementById('cash-balance').innerText = formatCurrency(liveTeamData.cash);
    document.getElementById('portfolio-value').innerText = formatCurrency(liveTeamData.netWorth);
    updatePortfolioTable(liveTeamData.holdings);

    // Keep the Pause screen strictly up to date if a late network tick arrives
    if (liveMarketData && liveMarketData.isPaused) {
        document.getElementById('pause-portfolio').innerText = formatCurrency(liveTeamData.netWorth);
    }

    // --- DYNAMIC CHART SERIES MANAGEMENT ---
    const currentHoldings = Object.keys(liveTeamData.holdings || {});
    
    for (const [ticker, series] of holdingsSeriesMap.entries()) {
        if (!currentHoldings.includes(ticker)) {
            chart.removeSeries(series);
            holdingsSeriesMap.delete(ticker);
        }
    }

    currentHoldings.forEach((ticker) => {
        if (!holdingsSeriesMap.has(ticker)) {
            const stockIndex = liveMarketData.stocks.findIndex(s => s.ticker === ticker);
            const color = CHART_COLORS[stockIndex >= 0 ? stockIndex % CHART_COLORS.length : 0];
            
            const newSeries = chart.addSeries(LightweightCharts.LineSeries, { 
                color: color, 
                lineWidth: 2 
            });
            
            if (historicalPrices[ticker] && historicalPrices[ticker].length > 0) {
                newSeries.setData(historicalPrices[ticker]);
            }
            
            holdingsSeriesMap.set(ticker, newSeries);
        }
    });
});

// Trading Logic
document.getElementById('btn-buy').onclick = async () => {
    if (liveMarketData.isPaused || liveMarketData.sessionEnded) return alert("Market is currently closed.");

    const qty = parseInt(document.getElementById('trade-qty').value);
    if (!qty || qty <= 0) return alert("Invalid quantity");
    
    const stock = liveMarketData.stocks.find(s => s.ticker === selectedTicker);
    const totalCost = stock.price * qty;
    
    if (liveTeamData.cash < totalCost) return alert("Insufficient Purchasing Power");
    
    let newHoldings = { ...liveTeamData.holdings };
    if (!newHoldings[selectedTicker]) newHoldings[selectedTicker] = { shares: 0, totalCost: 0 };
    newHoldings[selectedTicker].shares += qty;
    newHoldings[selectedTicker].totalCost += totalCost;

    try {
        await updateDoc(doc(db, "teams", session.id), {
            cash: liveTeamData.cash - totalCost,
            holdings: newHoldings
        });
        await addDoc(collection(db, "transaction_log"), {
            teamId: session.name, ticker: selectedTicker, action: 'BUY', shares: qty, price: stock.price, timestamp: serverTimestamp()
        });
        document.getElementById('trade-panel').classList.remove('open');
        document.getElementById('trade-qty').value = '';
    } catch(e) { console.error("Trade failed", e); }
};

document.getElementById('btn-sell').onclick = async () => {
    if (liveMarketData.isPaused || liveMarketData.sessionEnded) return alert("Market is currently closed.");

    const qty = parseInt(document.getElementById('trade-qty').value);
    if (!qty || qty <= 0) return alert("Invalid quantity");
    
    const holding = liveTeamData.holdings[selectedTicker];
    if (!holding || holding.shares < qty) return alert("Insufficient Shares");
    
    const stock = liveMarketData.stocks.find(s => s.ticker === selectedTicker);
    const totalRevenue = stock.price * qty;
    
    let newHoldings = { ...liveTeamData.holdings };
    newHoldings[selectedTicker].shares -= qty;
    if (newHoldings[selectedTicker].shares === 0) delete newHoldings[selectedTicker];

    try {
        await updateDoc(doc(db, "teams", session.id), {
            cash: liveTeamData.cash + totalRevenue,
            holdings: newHoldings
        });
        await addDoc(collection(db, "transaction_log"), {
            teamId: session.name, ticker: selectedTicker, action: 'SELL', shares: qty, price: stock.price, timestamp: serverTimestamp()
        });
        document.getElementById('trade-panel').classList.remove('open');
        document.getElementById('trade-qty').value = '';
    } catch(e) { console.error("Trade failed", e); }
};