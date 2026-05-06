// Mock In-Memory Database for testing without MySQL
let users = [{
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2a$10$8LsJHLnOGpmo/3mK0AAGZevFNkrq9y/iy9OMRUVoipjU9WYJMS6VS' // password123
}];
let watchlist = [];
let portfolio = [];
let nextId = 2;

const mockDb = {
    query: async (sql, params = []) => {
        const query = sql.toLowerCase().trim();
        console.log(`[MOCK DB] Executing: ${sql}`, params);

        // --- AUTH QUERIES ---
        if (query.startsWith('select * from users')) {
            const [email, username] = params;
            // Handle registration check (OR username = ?)
            if (query.includes('email = ? or username = ?')) {
                const found = users.filter(u => u.email === params[0] || u.username === params[1]);
                return [found];
            }
            // Handle login check
            const found = users.filter(u => u.email === params[0]);
            return [found];
        }

        if (query.startsWith('insert into users')) {
            const [username, email, password] = params;
            const newUser = { id: nextId++, username, email, password };
            users.push(newUser);
            return [{ insertId: newUser.id }];
        }

        // --- WATCHLIST QUERIES ---
        if (query.startsWith('select stock_symbol from watchlist')) {
            const [userId] = params;
            const userWatchlist = watchlist.filter(w => w.user_id === userId);
            return [userWatchlist];
        }

        if (query.startsWith('insert into watchlist')) {
            const [userId, symbol] = params;
            if (!watchlist.find(w => w.user_id === userId && w.stock_symbol === symbol)) {
                watchlist.push({ user_id: userId, stock_symbol: symbol });
            }
            return [{ insertId: nextId++ }];
        }

        if (query.startsWith('delete from watchlist')) {
            const [userId, symbol] = params;
            watchlist = watchlist.filter(w => !(w.user_id === userId && w.stock_symbol === symbol));
            return [{ affectedRows: 1 }];
        }

        // --- PORTFOLIO QUERIES ---
        if (query.startsWith('select * from portfolio')) {
            const [userId] = params;
            return [portfolio.filter(p => p.user_id === userId)];
        }

        if (query.startsWith('insert into portfolio')) {
            const [userId, symbol, quantity, buyPrice] = params;
            const newItem = { id: nextId++, user_id: userId, stock_symbol: symbol, quantity, buy_price: buyPrice };
            portfolio.push(newItem);
            return [{ insertId: newItem.id }];
        }

        if (query.startsWith('delete from portfolio')) {
            const [id] = params;
            portfolio = portfolio.filter(p => p.id !== Number(id));
            return [{ affectedRows: 1 }];
        }

        // --- OTHER QUERIES ---
        if (query.startsWith('insert into stock_history')) {
            return [{ insertId: nextId++ }];
        }

        if (query.startsWith('select 1 + 1')) {
            return [[{ solution: 2 }]];
        }

        return [[]];
    },
    // To match the pool.promise() interface
    promise: () => mockDb
};

module.exports = mockDb;
