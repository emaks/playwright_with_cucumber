const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const DATA = [
    {id: '#1001', date: '2025-01-05', region: 'Europe', category: 'Furniture', revenue: 1200},
    {
        id: '#1002',
        date: '2025-01-12',
        region: 'North America',
        category: 'Appliances',
        revenue: 850
    },
    {id: '#1003', date: '2025-01-18', region: 'Asia', category: 'Lighting', revenue: 640},
    {id: '#1004', date: '2025-02-03', region: 'Europe', category: 'Appliances', revenue: 2300},
    {
        id: '#1005',
        date: '2025-02-14',
        region: 'North America',
        category: 'Furniture',
        revenue: 1550
    },
    {id: '#1006', date: '2025-02-20', region: 'Asia', category: 'Furniture', revenue: 980},
    {id: '#1007', date: '2025-03-01', region: 'Europe', category: 'Lighting', revenue: 760},
    {
        id: '#1008',
        date: '2025-03-11',
        region: 'North America',
        category: 'Appliances',
        revenue: 1430
    },
    {id: '#1009', date: '2025-03-18', region: 'Asia', category: 'Lighting', revenue: 2100},
    {id: '#1010', date: '2025-03-25', region: 'Europe', category: 'Furniture', revenue: 1680}
];

function transactions(url) {
    const params = url.searchParams;
    const dateRange = params.get('dateRange') || 'none';
    const region = params.get('region') || 'none';
    const category = params.get('category') || 'none';
    const sort = params.get('sort') || 'date_asc';
    const today = Date.parse('2025-03-25T00:00:00Z');
    let rows = DATA.filter(row => {
        if (region !== 'none' && row.region !== region) {
            return false;
        }
        if (category !== 'none' && row.category !== category) {
            return false;
        }
        if (dateRange !== 'none') {
            const days = Number(dateRange);
            const timestamp = Date.parse(`${row.date}T00:00:00Z`);
            if (!Number.isFinite(days) || timestamp < today - (days - 1) * 86400000) {
                return false;
            }
        }
        return true;
    });
    rows = rows.sort((a, b) => {
        if (sort === 'date_asc') {
            return a.date.localeCompare(b.date);
        }
        if (sort === 'date_desc') {
            return b.date.localeCompare(a.date);
        }
        if (sort === 'rev_asc') {
            return a.revenue - b.revenue;
        }
        if (sort === 'rev_desc') {
            return b.revenue - a.revenue;
        }
        return 0;
    });
    return {
        data: rows,
        meta: {
            total: DATA.length,
            returned: rows.length,
            filters: {dateRange, region, category, sort}
        }
    };
}

http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/transactions') {
        // A small, intentional delay makes loading/error states testable.
        return setTimeout(() => {
            const payload = JSON.stringify(transactions(url));
            res.writeHead(200,
                {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
            res.end(payload);
        }, 250);
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const file = path.join(__dirname, 'index.html');
        res.writeHead(200,
            {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
        return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({error: 'Not found'}));
}).listen(PORT, () => console.log(`Sales Analytics task: http://localhost:${PORT}`));
