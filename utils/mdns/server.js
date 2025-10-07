const multicastdns = require('multicast-dns');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocket.Server({ server });

function startMDNSDiscovery() {
    const mdns = multicastdns();
    
    mdns.on('response', (response) => {
        const devices = parseResponse(response);
        
        // Отправляем данные всем подключенным клиентам
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'mdns_response',
                    data: devices,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    });
    
    // Запрос Thread сервисов каждые 10 секунд
    setInterval(() => {
        mdns.query('_meshcop._udp.local', 'PTR');
        mdns.query('_services._dns-sd._udp.local', 'PTR');
    }, 10000);
    
    // Первый запрос
    mdns.query('_meshcop._udp.local', 'PTR');
    
    return mdns;
}

function parseResponse(response) {
    const devices = [];
    
    response.answers.forEach(answer => {
        if (answer.type === 12 && answer.name.includes('_meshcop._udp')) {
            const device = {
                name: answer.data,
                type: 'Thread Commissioning',
                service: '_meshcop._udp.local',
                timestamp: new Date().toISOString()
            };
            
            // Ищем TXT записи для этого устройства
            response.additionals.forEach(additional => {
                if (additional.type === 16) {
                    device.txtRecords = parseTXTRecords(additional.data);
                }
                if (additional.type === 1) {
                    device.ipv4 = additional.data;
                }
                if (additional.type === 28) {
                    device.ipv6 = additional.data;
                }
            });
            
            devices.push(device);
        }
    });
    
    return devices;
}

function parseTXTRecords(txtData) {
    const records = [];
    if (Array.isArray(txtData)) {
        txtData.forEach(buffer => {
            if (Buffer.isBuffer(buffer)) {
                try {
                    records.push(buffer.toString('utf8'));
                } catch (e) {
                    records.push(buffer.toString('hex'));
                }
            }
        });
    }
    return records;
}

// Запуск сервера
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log('Open this URL in Chrome browser');
    startMDNSDiscovery();
});