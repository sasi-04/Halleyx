// Test script to verify API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

async function testEndpoints() {
    console.log('Testing API endpoints...\n');
    
    // Test health endpoint
    try {
        const response = await fetch(`${BASE_URL}/`);
        console.log(`✓ Backend server is running - Status: ${response.status}`);
    } catch (error) {
        console.log(`✗ Backend server error: ${error.message}`);
        return;
    }
    
    // Test expense request endpoint (should fail without auth)
    try {
        const response = await fetch(`${BASE_URL}/api/employee/expense-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestTitle: 'Test',
                amount: 100,
                department: 'Engineering',
                expenseCategory: 'other',
                expenseDate: '2024-01-01',
                priority: 'medium',
                description: 'Test request'
            })
        });
        console.log(`✓ Expense endpoint accessible - Status: ${response.status} (${response.status === 401 ? 'Auth required (expected)' : 'Unexpected'})`);
    } catch (error) {
        console.log(`✗ Expense endpoint error: ${error.message}`);
    }
    
    // Test onboarding request endpoint (should fail without auth)
    try {
        const response = await fetch(`${BASE_URL}/api/employee/onboarding-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                newEmployeeName: 'Test Employee',
                email: 'test@example.com',
                position: 'Developer',
                department: 'Engineering',
                joiningDate: '2024-02-01',
                employmentType: 'full_time',
                managerName: 'Test Manager',
                laptopRequired: true,
                accessNeeded: ['github'],
                priority: 'medium'
            })
        });
        console.log(`✓ Onboarding endpoint accessible - Status: ${response.status} (${response.status === 401 ? 'Auth required (expected)' : 'Unexpected'})`);
    } catch (error) {
        console.log(`✗ Onboarding endpoint error: ${error.message}`);
    }
    
    console.log('\nAPI endpoint test completed!');
}

testEndpoints().catch(console.error);
