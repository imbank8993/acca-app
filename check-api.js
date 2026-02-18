const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/scopes',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY START:');
        console.log(data.substring(0, 500)); // Print first 500 chars
        try {
            JSON.parse(data);
            console.log('JSON PARSE: SUCCESS');
        } catch (e) {
            console.log('JSON PARSE: FAILED');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
