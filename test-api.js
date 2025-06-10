const https = require('http');

const data = {
    "title": "Welcome Bonus!",
    "description": "Get 25% off your first crypto transaction",
    "image_url": "https://example.com/welcome-bonus.jpg",
    "link_url": "https://7awel.com/welcome",
    "background_color": "#28a745",
    "priority": 10,
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "target_audience": "new_users",
    "locale": "en",
    "is_active": true
};

const postData = JSON.stringify(data);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/promotions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQDdhd2VsLmNvbSIsInJvbGUiOiJhZG1pbiIsInBlcm1pc3Npb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSIsImFkbWluIl0sInR5cGUiOiJhZG1pbiIsImlhdCI6MTc0OTU1ODc0NSwiZXhwIjoxNzQ5NjQ1MTQ1fQ.-LI1s0x9IkzKZV7Trez-BOxtEgnfaLWn2v-BvWtU7zo',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing promotion creation...');
console.log('Data:', JSON.stringify(data, null, 2));

const req = https.request(options, (res) => {
    console.log(`\n📊 Status: ${res.statusCode}`);
    res.setEncoding('utf8');
    
    let responseData = '';
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        console.log(`\n📋 Response:`);
        try {
            const response = JSON.parse(responseData);
            console.log(JSON.stringify(response, null, 2));
            
            if (res.statusCode === 201 && response.success) {
                console.log(`\n✅ SUCCESS! Promotion created successfully!`);
                console.log(`🆔 Promotion ID: ${response.data.promotion.id}`);
                console.log(`📝 Title: ${response.data.promotion.title}`);
                console.log(`🌍 Locale: ${response.data.promotion.locale}`);
            } else {
                console.log(`\n❌ FAILED: ${response.message || 'Unknown error'}`);
            }
        } catch (e) {
            console.log(`Raw response: ${responseData}`);
            console.log(`Error parsing: ${e.message}`);
        }
        console.log(`\nRequest completed`);
    });
});

req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
});

req.write(postData);
req.end(); 