const http = require('http');

const loginData = {
    "username": "admin",
    "password": "password"
};

const postData = JSON.stringify(loginData);
console.log('Sending login request...');
console.log('Data:', postData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/admin/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    
    let responseData = '';
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        console.log(`Full Response: ${responseData}`);
        try {
            const response = JSON.parse(responseData);
            if (response.success && response.data && response.data.token) {
                console.log(`\n🔑 New Admin Token:`);
                console.log(response.data.token);
                console.log(`\n📋 Use this in your API calls:`);
                console.log(`Authorization: Bearer ${response.data.token}`);
            } else {
                console.log(`Login failed or no token in response`);
            }
        } catch (e) {
            console.log(`Error parsing response: ${e.message}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

console.log('Writing data and ending request...');
req.write(postData);
req.end(); 