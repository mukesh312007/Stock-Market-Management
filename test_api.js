const axios = require('axios');

async function test() {
    const baseUrl = 'http://localhost:5000/api';
    
    try {
        console.log('--- Testing Registration ---');
        const regRes = await axios.post(`${baseUrl}/auth/register`, {
            username: 'tester' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'password123'
        });
        console.log('Registration:', regRes.data);

        console.log('\n--- Testing Login ---');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: regRes.config.data ? JSON.parse(regRes.config.data).email : null,
            password: 'password123'
        });
        console.log('Login:', loginRes.data);
        const token = loginRes.data.token;

        console.log('\n--- Testing Watchlist Add ---');
        const watchRes = await axios.post(`${baseUrl}/stocks/watchlist`, 
            { symbol: 'AAPL' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('Watchlist Add:', watchRes.data);

        console.log('\n--- Testing Portfolio Add ---');
        const portRes = await axios.post(`${baseUrl}/stocks/portfolio`, 
            { symbol: 'TSLA', quantity: 10, buy_price: 150 },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('Portfolio Add:', portRes.data);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

test();
