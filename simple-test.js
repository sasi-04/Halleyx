// Simple API test
const http = require('http');

function testBackend() {
    console.log('Testing backend connection...');
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/employee/expense-request',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`Response: ${data}`);
        });
    });
    
    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });
    
    // Write data to request body
    req.write(JSON.stringify({
        requestTitle: 'Test',
        amount: 100,
        department: 'Engineering',
        expenseCategory: 'other',
        expenseDate: '2024-01-01',
        priority: 'medium',
        description: 'Test request'
    }));
    
    req.end();
}

testBackend();
