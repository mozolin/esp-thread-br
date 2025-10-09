const multicastdns = require('multicast-dns');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Конфигурация
const CONFIG = {
    port: 3000,
    logFile: 'logs/mdns_discovery.log',
    devicesFile: 'logs/discovered_devices.json',
    scanInterval: 10000, // 10 секунд
    cleanupInterval: 30000, // 30 секунд
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5
};

class Logger {
    constructor() {
        this.logFile = CONFIG.logFile;
        this.initLog();
    }

    initLog() {
        // Создаем файл лога если не существует
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '');
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

        // Вывод в консоль
        console.log(logLine.trim());

        // Запись в файл
        this.writeToLog(logLine);

        // Ротация логов
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
            const stats = fs.statSync(this.logFile);
            if (stats.size > CONFIG.maxLogSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = `${this.logFile}.${timestamp}.bak`;
                
                fs.renameSync(this.logFile, backupFile);
                fs.writeFileSync(this.logFile, '');
                
                this.log('info', 'Log file rotated', { backupFile });
                
                // Удаляем старые backup файлы
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
        const deviceWithId = {
            ...device,
            id: deviceId,
            firstSeen: device.firstSeen || new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            seenCount: (this.devices.get(deviceId)?.seenCount || 0) + 1
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
}

// Инициализация
const logger = new Logger();
const deviceManager = new DeviceManager();

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/') {
        serveFile(res, 'client.html', 'text/html');
    } else if (parsedUrl.pathname === '/client/client.js') {
        serveFile(res, '/client/client.js', 'text/javascript');
    } else if (parsedUrl.pathname === '/client/client.css') {
        serveFile(res, '/client/client.css', 'text/css');
    } else if (parsedUrl.pathname === '/devices') {
        // API endpoint для получения устройств
        const devices = deviceManager.getAllDevices();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ devices }));
    } else if (parsedUrl.pathname === '/logs') {
        // API endpoint для получения логов (только для админов)
        try {
            const logs = fs.readFileSync(CONFIG.logFile, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(logs);
        } catch (error) {
            res.writeHead(500);
            res.end('Error reading logs');
        }
    } else if (parsedUrl.pathname === '/stats') {
        // API endpoint для статистики
        const stats = {
            totalDevices: deviceManager.getAllDevices().length,
            activeDevices: deviceManager.getActiveDevices().length,
            lastScan: new Date().toISOString(),
            serverUptime: process.uptime()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
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
            answers: response.answers?.length || 0,
            additionals: response.additionals?.length || 0
        });
        
        const devices = parseResponse(response);
        
        if (devices.length > 0) {
            logger.info(`Found ${devices.length} devices in response`);
            
            devices.forEach(device => {
                const savedDevice = deviceManager.addDevice(device);
                logger.info('Device discovered', {
                    name: savedDevice.name,
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
            questions: query.questions?.length || 0
        });
    });
    
    mdns.on('error', (error) => {
        logger.error('mDNS error', { error: error.message });
    });
    
    function sendQueries() {
        logger.info('Sending mDNS queries');
        
        mdns.query({
            questions: [
                { name: '_meshcop._udp.local', type: 'PTR' },
                { name: '_services._dns-sd._udp.local', type: 'PTR' },
                { name: '_hap._tcp.local', type: 'PTR' },
                { name: '_http._tcp.local', type: 'PTR' },
                { name: '_printer._tcp.local', type: 'PTR' },
                { name: '_ssh._tcp.local', type: 'PTR' },
                { name: '_googlecast._tcp.local', type: 'PTR' }
            ]
        });
    }
    
    // Регулярные запросы
    setInterval(sendQueries, CONFIG.scanInterval);
    
    // Очистка старых устройств
    setInterval(() => {
        const removedCount = deviceManager.cleanupOldDevices();
        if (removedCount > 0) {
            logger.info(`Cleaned up ${removedCount} old devices`);
            broadcastToClients(deviceManager.getAllDevices());
        }
    }, CONFIG.cleanupInterval);
    
    // Первый запрос
    sendQueries();
    
    return mdns;
}

function parseResponse(response) {
    const devices = [];
    
    response.answers?.forEach(answer => {
        if (answer.type === 'PTR' && (
            answer.name.includes('_meshcop._udp') || 
            answer.name.includes('_services._dns-sd') ||
            answer.name.includes('_hap._tcp') ||
            answer.name.includes('_http._tcp')
        )) {
            
            const device = {
                name: answer.data,
                type: getServiceType(answer.name),
                service: answer.name,
                timestamp: new Date().toISOString()
            };
            
            // Ищем дополнительные данные
            response.additionals?.forEach(additional => {
                if (additional.name === answer.data) {
                    if (additional.type === 'TXT') {
                        device.txtRecords = parseTXTRecords(additional.data);
                    }
                    if (additional.type === 'A') {
                        device.ipv4 = additional.data;
                    }
                    if (additional.type === 'AAAA') {
                        device.ipv6 = additional.data;
                    }
                    if (additional.type === 'SRV') {
                        device.srv = additional.data;
                    }
                }
            });
            
            devices.push(device);
        }
    });
    
    return devices;
}

function getServiceType(serviceName) {
    const serviceMap = {
        '_meshcop._udp': 'Thread Commissioning',
        '_hap._tcp': 'HomeKit Accessory',
        '_http._tcp': 'HTTP Service',
        '_printer._tcp': 'Printer',
        '_ssh._tcp': 'SSH Service',
        '_googlecast._tcp': 'Google Cast'
    };
    
    for (const [key, value] of Object.entries(serviceMap)) {
        if (serviceName.includes(key)) {
            return value;
        }
    }
    
    return 'Network Service';
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

// WebSocket соединения
wss.on('connection', (ws) => {
    logger.info('New WebSocket connection', { clients: wss.clients.size });
    
    // Отправляем текущие устройства новому клиенту
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

// Запуск сервера
server.listen(CONFIG.port, () => {
    logger.info('Server started', { 
        port: CONFIG.port,
        logFile: CONFIG.logFile,
        devicesFile: CONFIG.devicesFile
    });
    
    console.log(`🚀 Server running on http://localhost:${CONFIG.port}`);
    console.log(`📝 Logs are being saved to: ${CONFIG.logFile}`);
    console.log(`💾 Devices are being saved to: ${CONFIG.devicesFile}`);
    console.log('🔍 Starting mDNS discovery...');
    
    startMDNSDiscovery();
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Server shutting down');
    console.log('\n👋 Shutting down server...');
    
    // Сохраняем устройства перед выходом
    deviceManager.saveDevices();
    
    process.exit(0);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason: reason.toString(), promise });
});