const multicastdns = require('multicast-dns');
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Thread mDNS</title>
                <script>
                    const eventSource = new EventSource('/events');
                    eventSource.onmessage = function(event) {
                        document.getElementById('output').innerHTML += event.data + '<br>';
                    };
                </script>
            </head>
            <body>
                <h1>Thread mDNS Discovery</h1>
                <div id="output"></div>
            </body>
            </html>
        `);
    } else if (req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        
        const mdns = multicastdns();
        mdns.on('response', (response) => {
            response.answers.forEach(answer => {
                if (answer.type === 12 && answer.name.includes('_meshcop._udp')) {
                    res.write(`data: Found Thread device: ${answer.data}\\n\\n`);
                }
            });
        });
        
        mdns.query('_meshcop._udp.local', 'PTR');
        
        // Очистка при закрытии соединения
        req.on('close', () => {
            mdns.destroy();
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3000, () => {
    console.log('SSE Server: http://localhost:3000');
});