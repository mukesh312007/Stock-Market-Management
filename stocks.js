const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT and check if user exists
const auth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists in database to avoid stale session issues
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'User no longer exists. Please logout and log back in.' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid or expired' });
    }
};

// Fetch real-time stock data from external API (Alpha Vantage)
router.get('/data/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const apiKey = process.env.STOCK_API_KEY;

        // If no API key, return demo data
        if (!apiKey || apiKey === 'your_alpha_vantage_api_key') {
            return res.json({
                symbol: symbol,
                price: (Math.random() * 200 + 100).toFixed(2),
                open: (Math.random() * 200 + 100).toFixed(2),
                high: (Math.random() * 200 + 100).toFixed(2),
                low: (Math.random() * 200 + 100).toFixed(2),
                volume: Math.floor(Math.random() * 1000000),
                change_percent: (Math.random() * 4 - 2).toFixed(2),
                is_demo: true
            });
        }

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        const response = await axios.get(url);
        const data = response.data['Global Quote'];

        if (!data || Object.keys(data).length === 0) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        const result = {
            symbol: data['01. symbol'],
            price: data['05. price'],
            open: data['02. open'],
            high: data['03. high'],
            low: data['04. low'],
            volume: data['06. volume'],
            change_percent: data['10. change percent'],
            is_demo: false
        };

        // Save to stock_history
        await db.query('INSERT INTO stock_history (stock_symbol, price) VALUES (?, ?)', [result.symbol, result.price]);

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stock data', error: err.message });
    }
});

// Fetch historical data for charts
router.get('/history/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const apiKey = process.env.STOCK_API_KEY;

        if (!apiKey || apiKey === 'your_alpha_vantage_api_key') {
            // Mock historical data
            const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            const prices = labels.map(() => (Math.random() * 50 + 150).toFixed(2));
            return res.json({ labels, prices, is_demo: true });
        }

        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
        const response = await axios.get(url);
        const dailyData = response.data['Time Series (Daily)'];

        if (!dailyData) return res.status(404).json({ message: 'History not found' });

        const labels = Object.keys(dailyData).slice(0, 7).reverse();
        const prices = labels.map(date => dailyData[date]['4. close']);

        res.json({ labels, prices, is_demo: false });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching history', error: err.message });
    }
});

// Watchlist: Get user watchlist
router.get('/watchlist', auth, async (req, res) => {
    try {
        const [items] = await db.query('SELECT stock_symbol FROM watchlist WHERE user_id = ?', [req.user.id]);
        res.json(items.map(item => item.stock_symbol));
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Watchlist: Add stock
router.post('/watchlist', auth, async (req, res) => {
    try {
        const { symbol } = req.body;
        await db.query('INSERT INTO watchlist (user_id, stock_symbol) VALUES (?, ?)', [req.user.id, symbol.toUpperCase()]);
        res.status(201).json({ message: 'Added to watchlist' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Watchlist: Remove stock
router.delete('/watchlist/:symbol', auth, async (req, res) => {
    try {
        const symbol = req.params.symbol;
        await db.query('DELETE FROM watchlist WHERE user_id = ? AND stock_symbol = ?', [req.user.id, symbol.toUpperCase()]);
        res.json({ message: 'Removed from watchlist' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Portfolio: Get user portfolio
router.get('/portfolio', auth, async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM portfolio WHERE user_id = ?', [req.user.id]);
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Portfolio: Buy stock (Add to portfolio)
router.post('/portfolio', auth, async (req, res) => {
    try {
        const { symbol, quantity, buy_price } = req.body;
        await db.query('INSERT INTO portfolio (user_id, stock_symbol, quantity, buy_price) VALUES (?, ?, ?, ?)', 
            [req.user.id, symbol.toUpperCase(), quantity, buy_price]);
        res.status(201).json({ message: 'Added to portfolio' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

// Portfolio: Sell/Remove stock
router.delete('/portfolio/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM portfolio WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.json({ message: 'Removed from portfolio' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

module.exports = router;
