const multicastdns = require('multicast-dns');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Configuration
const CONFIG = {
    port: 3000,
    logFile: 'logs/mdns_discovery.log',
    devicesFile: 'logs/discovered_devices.json',
    scanInterval: 10000, // 10 seconds
    cleanupInterval: 30000, // 30 seconds
    maxLogSize: 1 * 1024 * 1024, // 1 MB
    maxLogFiles: 3
};

// Extended service discovery for multiple protocols
const SERVICE_DISCOVERY = {
    // Thread devices
    THREAD: {
        service: '_meshcop._udp.local',
        type: 'PTR',
        name: 'Thread'
    },
    // Matter devices (new standard)
    MATTER: {
        service: '_matterc._udp.local',
        type: 'PTR',
        name: 'Matter'
    },
    // Zigbee devices (common services)
    ZIGBEE: {
        service: '_zigbeed._tcp.local',
        type: 'PTR',
        name: 'Zigbee'
    },
    // Wi-Fi devices (various services)
    WIFI_PRINTER: {
        service: '_ipp._tcp.local',
        type: 'PTR',
        name: 'Wi-Fi Printer'
    },
    WIFI_AP: {
        service: '_apple-mobdev2._tcp.local',
        type: 'PTR',
        name: 'Wi-Fi Access Point'
    },
    WIFI_AIRPLAY: {
        service: '_airplay._tcp.local',
        type: 'PTR',
        name: 'AirPlay'
    },
    WIFI_GOOGLECAST: {
        service: '_googlecast._tcp.local',
        type: 'PTR',
        name: 'Google Cast'
    },
    // HomeKit (often uses Thread/Matter)
    HOMEKIT: {
        service: '_hap._tcp.local',
        type: 'PTR',
        name: 'HomeKit'
    },
    // General network services
    HTTP: {
        service: '_http._tcp.local',
        type: 'PTR',
        name: 'HTTP Service'
    },
    HTTPS: {
        service: '_https._tcp.local',
        type: 'PTR',
        name: 'HTTPS Service'
    },
    SSH: {
        service: '_ssh._tcp.local',
        type: 'PTR',
        name: 'SSH Service'
    },
    // IoT protocols
    IOT_MQTT: {
        service: '_mqtt._tcp.local',
        type: 'PTR',
        name: 'MQTT Broker'
    },
    IOT_COAP: {
        service: '_coap._udp.local',
        type: 'PTR',
        name: 'CoAP Device'
    },
    // Apple services (often use Thread)
    APPLE_HOMEPOD: {
        service: '_homekit._tcp.local',
        type: 'PTR',
        name: 'Apple HomePod'
    },
    // Amazon services
    AMAZON_ALEXA: {
        service: '_amazonalexa._tcp.local',
        type: 'PTR',
        name: 'Amazon Alexa'
    }
};

class Logger {
    constructor() {
        this.logFile = CONFIG.logFile;
        this.initLog();
    }

    initLog() {
        // Create log directory if it doesn't exist
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Create log file if it doesn't exist
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '');
        } else {
            // Check size of existing file and trim if needed
            this.rotateLogs();
        }
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

        // Console output
        console.log(logLine.trim());

        // File write
        this.writeToLog(logLine);

        // Check log size after writing
        this.rotateLogs();
    }

    writeToLog(logLine) {
        try {
            fs.appendFileSync(this.logFile, logLine, 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    rotateLogs() {
        try {
            if (!fs.existsSync(this.logFile)) {
                return;
            }

            const stats = fs.statSync(this.logFile);
            if (stats.size > CONFIG.maxLogSize) {
                console.log(`📏 Log file size (${stats.size} bytes) exceeds limit, trimming...`);
                
                // Read entire file
                const logContent = fs.readFileSync(this.logFile, 'utf8');
                const lines = logContent.split('\n').filter(line => line.trim());
                
                // Keep only last 1000 lines (or less if file is still too big)
                let keepLines = 1000;
                let trimmedContent = '';
                let totalSize = 0;
                
                // Start from end of file and collect lines until we reach half of limit
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i] + '\n';
                    if (totalSize + line.length > CONFIG.maxLogSize / 2) {
                        break;
                    }
                    trimmedContent = line + trimmedContent;
                    totalSize += line.length;
                }
                
                // Write trimmed content
                fs.writeFileSync(this.logFile, trimmedContent, 'utf8');
                
                const newStats = fs.statSync(this.logFile);
                console.log(`✅ Log file trimmed: ${stats.size} bytes → ${newStats.size} bytes, ${lines.length} → ${trimmedContent.split('\n').filter(line => line.trim()).length} lines`);
                
                // Clean up old backup files
                this.cleanupOldLogs();
            }
        } catch (error) {
            console.error('Log rotation failed:', error);
        }
    }

    cleanupOldLogs() {
        try {
            const files = fs.readdirSync('.').filter(file => 
                file.startsWith(CONFIG.logFile) && file.endsWith('.bak')
            ).sort();

            if (files.length > CONFIG.maxLogFiles) {
                const filesToDelete = files.slice(0, files.length - CONFIG.maxLogFiles);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file);
                    this.log('info', 'Removed old log file', { file });
                });
            }
        } catch (error) {
            console.error('Cleanup old logs failed:', error);
        }
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }
}

class DeviceManager {
    constructor() {
        this.devicesFile = CONFIG.devicesFile;
        this.devices = new Map();
        this.loadDevices();
    }

    loadDevices() {
        try {
            // Create devices directory if it doesn't exist
            const devicesDir = path.dirname(this.devicesFile);
            if (!fs.existsSync(devicesDir)) {
                fs.mkdirSync(devicesDir, { recursive: true });
            }
            
            if (fs.existsSync(this.devicesFile)) {
                const data = fs.readFileSync(this.devicesFile, 'utf8');
                const devicesArray = JSON.parse(data);
                
                devicesArray.forEach(device => {
                    this.devices.set(device.id || device.name, device);
                });
                
                console.log(`Loaded ${this.devices.size} devices from storage`);
            }
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    }

    saveDevices() {
        try {
            const devicesArray = Array.from(this.devices.values());
            const data = JSON.stringify(devicesArray, null, 2);
            fs.writeFileSync(this.devicesFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save devices:', error);
        }
    }

    addDevice(device) {
        const deviceId = device.name || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const existingDevice = this.devices.get(deviceId);
        const seenCount = existingDevice ? (existingDevice.seenCount || 0) + 1 : 1;
        
        const deviceWithId = {
            ...device,
            id: deviceId,
            firstSeen: existingDevice ? existingDevice.firstSeen : new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            seenCount: seenCount
        };

        this.devices.set(deviceId, deviceWithId);
        this.saveDevices();

        return deviceWithId;
    }

    updateDeviceSeen(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.lastSeen = new Date().toISOString();
            device.seenCount = (device.seenCount || 0) + 1;
            this.devices.set(deviceId, device);
            this.saveDevices();
        }
    }

    removeDevice(deviceId) {
        this.devices.delete(deviceId);
        this.saveDevices();
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    getDevicesByProtocol(protocol) {
        return this.getAllDevices().filter(device => device.protocol === protocol);
    }

    getActiveDevices(maxAgeMinutes = 5) {
        const now = new Date();
        return this.getAllDevices().filter(device => {
            const lastSeen = new Date(device.lastSeen);
            const diffMinutes = (now - lastSeen) / (1000 * 60);
            return diffMinutes <= maxAgeMinutes;
        });
    }

    cleanupOldDevices(maxAgeMinutes = 10) {
        const now = new Date();
        let removedCount = 0;

        for (let [deviceId, device] of this.devices.entries()) {
            const lastSeen = new Date(device.lastSeen);
            const diffMinutes = (now - lastSeen) / (1000 * 60);
            
            if (diffMinutes > maxAgeMinutes) {
                this.devices.delete(deviceId);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.saveDevices();
        }

        return removedCount;
    }

    getProtocolStats() {
        const protocols = {};
        this.getAllDevices().forEach(device => {
            const protocol = device.protocol || 'Unknown';
            protocols[protocol] = (protocols[protocol] || 0) + 1;
        });
        return protocols;
    }
}

// Initialize
const logger = new Logger();
const deviceManager = new DeviceManager();

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Serve static files from client directory
    if (parsedUrl.pathname === '/') {
        serveFile(res, 'client/index.html', 'text/html');
    } else if (parsedUrl.pathname === '/client.js') {
        serveFile(res, 'client/client.js', 'text/javascript');
    } else if (parsedUrl.pathname === '/client.css') {
        serveFile(res, 'client/client.css', 'text/css');
    } else if (parsedUrl.pathname === '/favicon.ico') {
        serveFile(res, 'client/favicon.ico', 'image/x-icon');
    } else if (parsedUrl.pathname === '/devices') {
        // API endpoint for getting devices
        const devices = deviceManager.getAllDevices();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ devices }));
    } else if (parsedUrl.pathname === '/protocols') {
        // API endpoint for protocol statistics
        const protocols = deviceManager.getProtocolStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ protocols }));
    } else if (parsedUrl.pathname === '/logs') {
        // API endpoint for getting logs (admin only)
        try {
            const logs = fs.readFileSync(CONFIG.logFile, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(logs);
        } catch (error) {
            res.writeHead(500);
            res.end('Error reading logs');
        }
    } else if (parsedUrl.pathname === '/stats') {
        // API endpoint for statistics
        const stats = {
            totalDevices: deviceManager.getAllDevices().length,
            activeDevices: deviceManager.getActiveDevices().length,
            lastScan: new Date().toISOString(),
            serverUptime: process.uptime(),
            logFileSize: fs.existsSync(CONFIG.logFile) ? fs.statSync(CONFIG.logFile).size : 0,
            protocols: deviceManager.getProtocolStats()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
    } else if (parsedUrl.pathname === '/cleanup-logs') {
        // API endpoint for forced log cleanup
        logger.rotateLogs();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Log cleanup completed' }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

function serveFile(res, filename, contentType) {
    fs.readFile(path.join(__dirname, filename), (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading file');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const wss = new WebSocket.Server({ server });

function startMDNSDiscovery() {
    const mdns = multicastdns();
    
    mdns.on('response', (response) => {
        logger.info('Received mDNS response', {
            answers: response.answers ? response.answers.length : 0,
            additionals: response.additionals ? response.additionals.length : 0
        });
        
        const devices = parseResponse(response);
        
        if (devices.length > 0) {
            logger.info(`Found ${devices.length} devices in response`, {
                protocols: devices.map(d => d.protocol)
            });
            
            devices.forEach(device => {
                const savedDevice = deviceManager.addDevice(device);
                logger.info('Device discovered', {
                    name: savedDevice.name,
                    protocol: savedDevice.protocol,
                    type: savedDevice.type,
                    service: savedDevice.service,
                    seenCount: savedDevice.seenCount
                });
            });
            
            broadcastToClients(deviceManager.getAllDevices());
        }
    });
    
    mdns.on('query', (query) => {
        logger.info('mDNS query received', {
            questions: query.questions ? query.questions.length : 0
        });
    });
    
    mdns.on('error', (error) => {
        logger.error('mDNS error', { error: error.message });
    });
    
    function sendQueries() {
        logger.info('Sending mDNS queries for multiple protocols');
        
        const questions = [];
        
        // Add all service discovery queries
        Object.values(SERVICE_DISCOVERY).forEach(service => {
            questions.push({
                name: service.service,
                type: service.type
            });
        });
        
        // Also query for general services
        questions.push({ name: '_services._dns-sd._udp.local', type: 'PTR' });
        
        mdns.query({ questions });
    }
    
    // Regular queries
    setInterval(sendQueries, CONFIG.scanInterval);
    
    // Cleanup old devices
    setInterval(() => {
        const removedCount = deviceManager.cleanupOldDevices();
        if (removedCount > 0) {
            logger.info(`Cleaned up ${removedCount} old devices`);
            broadcastToClients(deviceManager.getAllDevices());
        }
    }, CONFIG.cleanupInterval);
    
    // First query
    sendQueries();
    
    return mdns;
}

function parseResponse(response) {
    const devices = [];
    
    if (response.answers) {
        response.answers.forEach(answer => {
            // Check for all supported services
            Object.entries(SERVICE_DISCOVERY).forEach(([protocol, serviceInfo]) => {
                if (answer.type === 'PTR' && answer.name.includes(serviceInfo.service)) {
                    
                    const device = {
                        name: answer.data,
                        protocol: protocol,
                        type: serviceInfo.name,
                        service: answer.name,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Look for additional data
                    if (response.additionals) {
                        response.additionals.forEach(additional => {
                            if (additional.name === answer.data) {
                                if (additional.type === 'TXT') {
                                    device.txtRecords = parseTXTRecords(additional.data);
                                    
                                    // Extract specific information from TXT records
                                    if (device.txtRecords) {
                                        device.details = parseDeviceDetails(device.txtRecords, protocol);
                                    }
                                }
                                if (additional.type === 'A') {
                                    device.ipv4 = additional.data;
                                }
                                if (additional.type === 'AAAA') {
                                    device.ipv6 = additional.data;
                                }
                                if (additional.type === 'SRV') {
                                    device.srv = additional.data;
                                    if (additional.data && additional.data.target) {
                                        device.hostname = additional.data.target;
                                    }
                                }
                            }
                        });
                    }
                    
                    devices.push(device);
                }
            });
        });
    }
    
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

function parseDeviceDetails(txtRecords, protocol) {
    const details = {};
    
    txtRecords.forEach(record => {
        const [key, value] = record.split('=');
        if (key && value) {
            details[key] = value;
            
            // Protocol-specific parsing
            switch (protocol) {
                case 'THREAD':
                    if (key === 'rv' || key === 'tv' || key === 'id' || key === 'vn') {
                        details[key] = value;
                    }
                    break;
                case 'MATTER':
                    if (key === 'CM' || key === 'D' || key === 'VP' || key === 'SII') {
                        details[key] = value;
                    }
                    break;
                case 'HOMEKIT':
                    if (key === 'md' || key === 'pv' || key === 'id' || key === 'c#') {
                        details[key] = value;
                    }
                    break;
                case 'WIFI_GOOGLECAST':
                    if (key === 'md' || key === 'fn' || key === 'ca' || key === 'st') {
                        details[key] = value;
                    }
                    break;
            }
        }
    });
    
    return details;
}

function broadcastToClients(devices) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'mdns_response',
                data: devices,
                timestamp: new Date().toISOString(),
                count: devices.length
            }));
        }
    });
}

// WebSocket connections
wss.on('connection', (ws) => {
    logger.info('New WebSocket connection', { clients: wss.clients.size });
    
    // Send current devices to new client
    const allDevices = deviceManager.getAllDevices();
    if (allDevices.length > 0) {
        ws.send(JSON.stringify({
            type: 'mdns_response',
            data: allDevices,
            timestamp: new Date().toISOString(),
            count: allDevices.length
        }));
    }
    
    ws.on('close', () => {
        logger.info('WebSocket connection closed', { clients: wss.clients.size });
    });
    
    ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
    });
});

// Start server
server.listen(CONFIG.port, () => {
    logger.info('Server started', { 
        port: CONFIG.port,
        logFile: CONFIG.logFile,
        devicesFile: CONFIG.devicesFile,
        maxLogSize: CONFIG.maxLogSize,
        supportedProtocols: Object.keys(SERVICE_DISCOVERY)
    });
    
    console.log(`🚀 Server running on http://localhost:${CONFIG.port}`);
    console.log(`📝 Logs are being saved to: ${CONFIG.logFile} (max ${CONFIG.maxLogSize / 1024 / 1024} MB)`);
    console.log(`💾 Devices are being saved to: ${CONFIG.devicesFile}`);
    console.log('🔍 Starting mDNS discovery for multiple protocols...');
    console.log('📡 Supported protocols:');
    Object.entries(SERVICE_DISCOVERY).forEach(([protocol, service]) => {
        console.log(`   - ${protocol}: ${service.service}`);
    });
    
    startMDNSDiscovery();
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Server shutting down');
    console.log('\n👋 Shutting down server...');
    
    // Save devices before exit
    deviceManager.saveDevices();
    
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason: reason.toString() });
});