const API_BASE = 'http://localhost:5000/api';
let currentChart = null;
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let token = localStorage.getItem('token') || null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initTheme();
});

// Section Management
function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    document.getElementById(`${sectionId}-section`).classList.add('active');

    if (sectionId === 'watchlist') {
        loadWatchlist();
    } else if (sectionId === 'portfolio') {
        loadPortfolio();
    }
}

// Theme Management
function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
}

// Auth UI
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (currentUser) {
        authButtons.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userName.textContent = currentUser.username;
    } else {
        authButtons.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
}

// Modal Management
function showModal(type) {
    document.getElementById('auth-modal').classList.remove('hidden');
    toggleAuthForm(type);
}

function closeModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthForm(type) {
    if (type === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

// Auth Logic
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();
            closeModal();
            alert('Login successful!');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Server error connecting to backend.');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-user').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Registration successful! Please login.');
            toggleAuthForm('login');
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showSection('home');
}

// Stock Search & Data
async function handleSearch(inputId) {
    const symbol = document.getElementById(inputId).value.toUpperCase();
    if (!symbol) return;
    searchStock(symbol);
}

async function searchStock(symbol) {
    showSection('dashboard');
    document.getElementById('no-stock-message').classList.add('hidden');
    document.getElementById('stock-view').classList.remove('hidden');

    try {
        // Fetch Quote
        const res = await fetch(`${API_BASE}/stocks/data/${symbol}`);
        const data = await res.json();

        if (res.ok) {
            updateStockUI(data);
            fetchHistory(symbol);
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

function updateStockUI(data) {
    document.getElementById('stock-symbol-display').textContent = data.symbol;
    document.getElementById('stock-price-display').textContent = `₹${parseFloat(data.price).toFixed(2)}`;
    
    const change = document.getElementById('stock-change-display');
    const isPositive = !data.change_percent.startsWith('-');
    change.textContent = data.change_percent;
    change.className = isPositive ? 'positive' : 'negative';

    document.getElementById('stat-open').textContent = `₹${parseFloat(data.open).toFixed(2)}`;
    document.getElementById('stat-high').textContent = `₹${parseFloat(data.high).toFixed(2)}`;
    document.getElementById('stat-low').textContent = `₹${parseFloat(data.low).toFixed(2)}`;
    document.getElementById('stat-volume').textContent = parseInt(data.volume).toLocaleString();

    const addBtn = document.getElementById('add-watchlist-btn');
    addBtn.onclick = () => addToWatchlist(data.symbol);

    const buyBtn = document.getElementById('buy-stock-btn');
    buyBtn.onclick = () => openBuyModal(data.symbol, data.price);
}

async function fetchHistory(symbol) {
    try {
        const res = await fetch(`${API_BASE}/stocks/history/${symbol}`);
        const data = await res.json();
        if (res.ok) {
            renderChart(data.labels, data.prices);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderChart(labels, prices) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (INR)',
                data: prices,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Watchlist Logic
async function loadWatchlist() {
    if (!token) {
        document.getElementById('watchlist-grid').innerHTML = '<p class="empty-state">Please login to view your watchlist.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/stocks/watchlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const symbols = await res.json();
        
        const grid = document.getElementById('watchlist-grid');
        const empty = document.getElementById('watchlist-empty');

        if (symbols.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
        } else {
            empty.classList.add('hidden');
            grid.innerHTML = '';
            symbols.forEach(sym => {
                const card = document.createElement('div');
                card.className = 'watchlist-card';
                card.innerHTML = `
                    <div onclick="searchStock('${sym}')" style="cursor:pointer">
                        <h4>${sym}</h4>
                    </div>
                    <button class="remove-btn" onclick="removeFromWatchlist('${sym}')">Remove</button>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function addToWatchlist(symbol) {
    if (!token) {
        showModal('login');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/stocks/watchlist`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ symbol })
        });
        if (res.ok) {
            alert(`${symbol} added to watchlist!`);
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function removeFromWatchlist(symbol) {
    try {
        const res = await fetch(`${API_BASE}/stocks/watchlist/${symbol}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadWatchlist();
        }
    } catch (err) {
        console.error(err);
    }
}

// Portfolio Logic
let currentBuyStock = null;

function openBuyModal(symbol, price) {
    if (!token) {
        showModal('login');
        return;
    }
    currentBuyStock = { symbol, price };
    document.getElementById('buy-stock-symbol').textContent = symbol;
    document.getElementById('buy-stock-price').textContent = `₹${parseFloat(price).toFixed(2)}`;
    document.getElementById('buy-quantity').value = 1;
    updateTotalCost();
    
    document.getElementById('buy-modal').classList.remove('hidden');
    document.getElementById('buy-quantity').oninput = updateTotalCost;
}

function closeBuyModal() {
    document.getElementById('buy-modal').classList.add('hidden');
}

function updateTotalCost() {
    const qty = document.getElementById('buy-quantity').value;
    const total = qty * currentBuyStock.price;
    document.getElementById('buy-total-cost').textContent = `₹${total.toFixed(2)}`;
}

async function confirmPurchase() {
    const quantity = document.getElementById('buy-quantity').value;
    if (quantity <= 0) return alert('Enter valid quantity');

    try {
        const res = await fetch(`${API_BASE}/stocks/portfolio`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                symbol: currentBuyStock.symbol, 
                quantity: parseFloat(quantity), 
                buy_price: parseFloat(currentBuyStock.price) 
            })
        });

        if (res.ok) {
            alert('Stock purchased successfully!');
            closeBuyModal();
            loadPortfolio();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadPortfolio() {
    if (!token) {
        document.getElementById('portfolio-list').innerHTML = '<tr><td colspan="7" class="empty-state">Please login to view your portfolio.</td></tr>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/stocks/portfolio`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = await res.json();
        
        const list = document.getElementById('portfolio-list');
        const empty = document.getElementById('portfolio-empty');

        if (items.length === 0) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            updatePortfolioSummary(0, 0);
        } else {
            empty.classList.add('hidden');
            list.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading current prices...</td></tr>';
            
            // Fetch current prices for all symbols
            const enrichedItems = await Promise.all(items.map(async item => {
                const priceRes = await fetch(`${API_BASE}/stocks/data/${item.stock_symbol}`);
                const priceData = await priceRes.json();
                const currentPrice = parseFloat(priceData.price);
                const value = currentPrice * item.quantity;
                const pl = (currentPrice - item.buy_price) * item.quantity;
                return { ...item, currentPrice, value, pl };
            }));

            list.innerHTML = '';
            let totalValue = 0;
            let totalPL = 0;

            enrichedItems.forEach(item => {
                totalValue += item.value;
                totalPL += item.pl;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.stock_symbol}</strong></td>
                    <td>${item.quantity}</td>
                    <td>₹${parseFloat(item.buy_price).toFixed(2)}</td>
                    <td>₹${item.currentPrice.toFixed(2)}</td>
                    <td>₹${item.value.toFixed(2)}</td>
                    <td class="${item.pl >= 0 ? 'positive' : 'negative'}">₹${item.pl.toFixed(2)}</td>
                    <td><button class="remove-btn" onclick="openSellModal(${item.id})">Sell</button></td>
                `;
                list.appendChild(row);
            });

            updatePortfolioSummary(totalValue, totalPL);
        }
    } catch (err) {
        console.error(err);
    }
}

function updatePortfolioSummary(value, pl) {
    document.getElementById('portfolio-total-value').textContent = `₹${value.toFixed(2)}`;
    const plEl = document.getElementById('portfolio-total-pl');
    plEl.textContent = `₹${pl.toFixed(2)}`;
    plEl.className = pl >= 0 ? 'positive' : 'negative';
}

function openSellModal(id) {
    document.getElementById('sell-modal').classList.remove('hidden');
    document.getElementById('confirm-sell-btn').onclick = () => confirmRemoval(id);
}

function closeSellModal() {
    document.getElementById('sell-modal').classList.add('hidden');
}

async function confirmRemoval(id) {
    try {
        const res = await fetch(`${API_BASE}/stocks/portfolio/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            closeSellModal();
            loadPortfolio();
        }
    } catch (err) {
        console.error(err);
    }
}
