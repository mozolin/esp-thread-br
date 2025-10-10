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
    // Thread RELAY devices
    THREAD_RELAY: {
        service: '_trel._udp.local',
        type: 'PTR',
        name: 'Thread Relay'
    },
    // Matter devices (new standard)
    MATTER: {
        service: '_matter._tcp.local',
        type: 'PTR',
        name: 'Matter'
    },
    MATTER_COMMISSIONING: {
        service: '_matterc._udp.local',
        type: 'PTR',
        name: 'Matter Commissioning'
    },
    // Zigbee devices (common services)
    ZIGBEE: {
        service: '_zigbeed._tcp.local',
        type: 'PTR',
        name: 'Zigbee'
    },
    // SLZB-06 Zigbee coordinator
    SLZB_06: {
        service: '_slzb-06._tcp.local',
        type: 'PTR',
        name: 'SLZB-06 Zigbee'
    },
    // Home Assistant
    HOME_ASSISTANT: {
        service: '_home-assistant._tcp.local',
        type: 'PTR',
        name: 'Home Assistant'
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
    WORKSTATION: {
        service: '_workstation._tcp.local',
        type: 'PTR',
        name: 'Workstation'
    },
    DEVICE_INFO: {
        service: '_device-info._tcp.local',
        type: 'PTR',
        name: 'Device Info'
    },
    // Windows Network services
    WINDOWS_NETWORK: {
        service: '_smb._tcp.local',
        type: 'PTR',
        name: 'Windows Network'
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

function parseResponse(response) {
    const devices = [];
    const deviceMap = new Map();
    
    if (response.answers) {
        response.answers.forEach(answer => {
            // Check for all supported services
            Object.entries(SERVICE_DISCOVERY).forEach(([protocol, serviceInfo]) => {
                if (answer.type === 'PTR' && answer.name.includes(serviceInfo.service)) {
                    
                    const deviceKey = answer.data; // Use the PTR data as key
                    
                    if (!deviceMap.has(deviceKey)) {
                        const device = {
                            name: answer.data,
                            protocol: protocol,
                            type: serviceInfo.name,
                            service: answer.name,
                            timestamp: new Date().toISOString()
                        };
                        deviceMap.set(deviceKey, device);
                    }
                }
            });
        });
    }
    
    // Process additionals to enrich device information
    if (response.additionals) {
        response.additionals.forEach(additional => {
            // Find device by name
            for (let [deviceKey, device] of deviceMap.entries()) {
                // Match by exact name or check if additional belongs to this device
                if (additional.name === deviceKey || 
                    additional.name.includes(device.name) ||
                    device.name.includes(additional.name)) {
                    
                    switch (additional.type) {
                        case 'TXT':
                            if (!device.txtRecords) device.txtRecords = [];
                            const txtRecords = parseTXTRecords(additional.data);
                            device.txtRecords.push(...txtRecords);
                            
                            // Extract specific information from TXT records
                            if (txtRecords.length > 0) {
                                device.details = parseDeviceDetails(txtRecords, device.protocol);
                            }
                            break;
                            
                        case 'A':
                            device.ipv4 = additional.data;
                            break;
                            
                        case 'AAAA':
                            device.ipv6 = additional.data;
                            break;
                            
                        case 'SRV':
                            device.srv = additional.data;
                            if (additional.data && additional.data.target) {
                                device.hostname = additional.data.target;
                                // Also try to extract IP from the hostname in subsequent records
                                extractIPFromHostname(device, additional.data.target, response.additionals);
                            }
                            break;
                    }
                }
            }
        });
        
        // Second pass: try to match IP addresses by hostname
        for (let [deviceKey, device] of deviceMap.entries()) {
            if (device.hostname && (!device.ipv4 && !device.ipv6)) {
                extractIPFromHostname(device, device.hostname, response.additionals);
            }
        }
    }
    
    const resultDevices = Array.from(deviceMap.values());
    
    // Enhance devices with additional information
    return resultDevices.map(device => {
        // Enhance HTTP/HTTPS devices
        if (device.protocol === 'HTTP' || device.protocol === 'HTTPS') {
            return enhanceHTTPDevice(device);
        }
        
        // Enhance Thread devices
        if (device.protocol === 'THREAD' && device.details) {
            device.threadInfo = extractThreadNetworkInfo(device.details);
        }
        
        // Enhance Home Assistant devices
        if (device.protocol === 'HOME_ASSISTANT') {
            device = enhanceHomeAssistantDevice(device);
        }
        
        // Enhance Matter devices
        if (device.protocol === 'MATTER') {
            device = enhanceMatterDevice(device);
        }
        
        return device;
    });
}

function extractIPFromHostname(device, hostname, additionals) {
    additionals.forEach(additional => {
        if ((additional.type === 'A' || additional.type === 'AAAA') && 
            additional.name === hostname) {
            if (additional.type === 'A') {
                device.ipv4 = additional.data;
            } else if (additional.type === 'AAAA') {
                device.ipv6 = additional.data;
            }
        }
    });
}

function enhanceHTTPDevice(device) {
    if (device.protocol === 'HTTP' || device.protocol === 'HTTPS') {
        // Extract port from SRV record if available
        if (device.srv && device.srv.port) {
            device.port = device.srv.port;
        }
        
        // Try to construct URL
        if (device.ipv4 || device.ipv6 || device.hostname) {
            const protocol = device.protocol.toLowerCase();
            const host = device.ipv4 || device.ipv6 || device.hostname;
            const port = device.port && device.port !== 80 && device.port !== 443 ? `:${device.port}` : '';
            const path = device.details && device.details.path ? device.details.path : '/';
            
            device.url = `${protocol}://${host}${port}${path}`;
        }
        
        // Add service type info
        if (device.details) {
            if (device.details.u) {
                device.serviceType = 'Printer';
            } else if (device.details.p) {
                device.serviceType = 'Remote Access';
            }
        }
    }
    return device;
}

function enhanceHomeAssistantDevice(device) {
    if (device.protocol === 'HOME_ASSISTANT') {
        // Extract port from SRV record if available
        if (device.srv && device.srv.port) {
            device.port = device.srv.port;
        }
        
        // Construct Home Assistant URL
        if (device.ipv4 || device.ipv6 || device.hostname) {
            const host = device.ipv4 || device.ipv6 || device.hostname;
            const port = device.port && device.port !== 8123 ? `:${device.port}` : ':8123';
            device.url = `http://${host}${port}`;
        }
        
        device.serviceType = 'Home Automation';
    }
    return device;
}

function enhanceMatterDevice(device) {
    if (device.protocol === 'MATTER') {
        // Extract Matter device information from name
        const matterMatch = device.name.match(/([A-F0-9]+)-([A-F0-9]+)/);
        if (matterMatch) {
            device.matterInfo = {
                vendorId: matterMatch[1],
                productId: matterMatch[2],
                deviceId: matterMatch[0]
            };
        }
        
        device.serviceType = 'Smart Home';
    }
    return device;
}

function parseTXTRecords(txtData) {
    const records = [];
    if (Array.isArray(txtData)) {
        txtData.forEach(buffer => {
            if (Buffer.isBuffer(buffer)) {
                try {
                    const text = buffer.toString('utf8');
                    // Check if the string contains only printable ASCII characters
                    if (/^[\x20-\x7E]*$/.test(text)) {
                        records.push(text);
                    } else {
                        // Convert binary data to hex representation
                        const hex = buffer.toString('hex');
                        records.push(`[BINARY:${hex}]`);
                    }
                } catch (e) {
                    // If UTF-8 conversion fails, use hex
                    const hex = buffer.toString('hex');
                    records.push(`[BINARY:${hex}]`);
                }
            } else if (typeof buffer === 'string') {
                records.push(buffer);
            }
        });
    }
    return records;
}

function parseDeviceDetails(txtRecords, protocol) {
    const details = {};
    
    // Use specialized decoding for Thread devices
    if (protocol === 'THREAD') {
        const threadData = decodeThreadData(txtRecords);
        return { ...details, ...threadData };
    }
    
    // Use specialized decoding for Matter devices
    if (protocol === 'MATTER') {
        const matterData = decodeMatterData(txtRecords);
        return { ...details, ...matterData };
    }
    
    txtRecords.forEach(record => {
        // Skip binary records (they're handled by specialized decoders)
        if (record.startsWith('[BINARY:')) {
            return;
        }
        
        const separatorIndex = record.indexOf('=');
        if (separatorIndex > 0) {
            const key = record.substring(0, separatorIndex);
            const value = record.substring(separatorIndex + 1);
            
            if (key && value) {
                details[key] = value;
                
                // Protocol-specific parsing
                switch (protocol) {
                    case 'MATTER_COMMISSIONING':
                        if (key === 'CM' || key === 'D' || key === 'VP' || key === 'SII' || 
                            key === 'PH' || key === 'PI' || key === 'CD') {
                            details[key] = value;
                        }
                        break;
                    case 'HOMEKIT':
                        if (key === 'md' || key === 'pv' || key === 'id' || key === 'c#' || 
                            key === 's#' || key === 'sf' || key === 'ff' || key === 'ci') {
                            details[key] = value;
                        }
                        break;
                    case 'WIFI_GOOGLECAST':
                        if (key === 'md' || key === 'fn' || key === 'ca' || key === 'st' || 
                            key === 'bs' || key === 'nf' || key === 'rs') {
                            details[key] = value;
                        }
                        break;
                    case 'HTTP':
                    case 'HTTPS':
                        if (key === 'path' || key === 'u' || key === 'p' || key === 'note') {
                            details[key] = value;
                        }
                        break;
                    case 'SSH':
                        if (key === 'v' || key === 'k' || key === 'h' || key === 'p') {
                            details[key] = value;
                        }
                        break;
                    case 'WIFI_PRINTER':
                        if (key === 'rp' || key === 'note' || key === 'ty' || key === 'product' || 
                            key === 'usb_MFG' || key === 'usb_MDL') {
                            details[key] = value;
                        }
                        break;
                    case 'HOME_ASSISTANT':
                        if (key === 'version' || key === 'base_url' || key === 'requires_api_password') {
                            details[key] = value;
                        }
                        break;
                    case 'SLZB_06':
                        if (key === 'version' || key === 'model' || key === 'serial') {
                            details[key] = value;
                        }
                        break;
                    case 'WORKSTATION':
                        if (key === 'id' || key === 'model' || key === 'os') {
                            details[key] = value;
                        }
                        break;
                }
            }
        } else if (record && record.trim()) {
            // Record without '=' - treat as flag or value
            details[record.trim()] = 'true';
        }
    });
    
    return details;
}

function decodeThreadData(txtRecords) {
    const threadInfo = {};
    const binaryData = [];
    
    txtRecords.forEach(record => {
        if (record.startsWith('[BINARY:')) {
            const hex = record.substring(8, record.length - 1);
            const buffer = Buffer.from(hex, 'hex');
            binaryData.push({ hex, buffer });
        } else if (record.includes('=')) {
            const [key, value] = record.split('=');
            switch (key) {
                case 'rv':
                    threadInfo.revision = value;
                    break;
                case 'tv':
                    threadInfo.threadVersion = value;
                    break;
                case 'vn':
                    threadInfo.vendor = value;
                    break;
                case 'nn':
                    threadInfo.networkName = value;
                    break;
                case 'mn':
                    threadInfo.model = value;
                    break;
                case 'dn':
                    threadInfo.domain = value;
                    break;
                case 'sq':
                    threadInfo.sequence = parseInt(value) || value;
                    break;
                case 'xp':
                    threadInfo.xpanid = value;
                    // Try to decode Extended PAN ID
                    if (value && value.length === 16) {
                        threadInfo.extendedPanId = value.match(/.{2}/g).join(':');
                    }
                    break;
                case 'xa':
                    threadInfo.xaddr = value;
                    break;
                case 'at':
                    threadInfo.activeTimestamp = value;
                    break;
                case 'pt':
                    threadInfo.partitionId = value;
                    break;
                case 'omr':
                    threadInfo.omr = value;
                    break;
                case 'bb':
                    threadInfo.bbrSeqNumber = value;
                    break;
                case 'sb':
                    threadInfo.stableData = value;
                    break;
                case 'id':
                    threadInfo.networkId = value;
                    break;
                default:
                    threadInfo[key] = value;
            }
        }
    });
    
    // Process binary data for Thread
    binaryData.forEach((data, index) => {
        if (data.buffer.length === 8) {
            // Likely Extended PAN ID (8 bytes)
            threadInfo[`binaryData${index}`] = {
                type: 'Extended PAN ID (likely)',
                hex: data.hex,
                size: data.buffer.length
            };
        } else if (data.buffer.length === 16) {
            // Likely Network Key (16 bytes)
            threadInfo[`binaryData${index}`] = {
                type: 'Network Key (likely)',
                hex: data.hex,
                size: data.buffer.length
            };
        } else {
            threadInfo[`binaryData${index}`] = {
                type: 'Unknown',
                hex: data.hex,
                size: data.buffer.length
            };
        }
    });
    
    return threadInfo;
}

function decodeMatterData(txtRecords) {
    const matterInfo = {};
    
    txtRecords.forEach(record => {
        if (record.includes('=')) {
            const [key, value] = record.split('=');
            switch (key) {
                case 'VP':
                    matterInfo.vendorProduct = value;
                    break;
                case 'D':
                    matterInfo.deviceType = value;
                    break;
                case 'CM':
                    matterInfo.commissioningMode = value;
                    break;
                case 'DT':
                    matterInfo.deviceType = value;
                    break;
                case 'DN':
                    matterInfo.deviceName = value;
                    break;
                case 'SII':
                    matterInfo.sleepyIdleInterval = value;
                    break;
                case 'SAI':
                    matterInfo.sleepyActiveInterval = value;
                    break;
                default:
                    matterInfo[key] = value;
            }
        }
    });
    
    return matterInfo;
}

function extractThreadNetworkInfo(details) {
    const networkInfo = {};
    
    if (details.networkName) networkInfo.networkName = details.networkName;
    if (details.threadVersion) networkInfo.version = details.threadVersion;
    if (details.revision) networkInfo.revision = details.revision;
    if (details.sequence) networkInfo.sequence = details.sequence;
    if (details.extendedPanId) networkInfo.extendedPanId = details.extendedPanId;
    if (details.xpanid) networkInfo.xpanid = details.xpanid;
    if (details.vendor) networkInfo.vendor = details.vendor;
    if (details.model) networkInfo.model = details.model;
    if (details.domain) networkInfo.domain = details.domain;
    if (details.networkId) networkInfo.networkId = details.networkId;
    
    return networkInfo;
}

function getServiceType(serviceName) {
    const serviceMap = {
        '_meshcop._udp': 'Thread Commissioning',
        '_trel._udp': 'Thread Relay',
        '_matter._tcp': 'Matter Device',
        '_matterc._udp': 'Matter Commissioning',
        '_home-assistant._tcp': 'Home Assistant',
        '_slzb-06._tcp': 'SLZB-06 Zigbee Coordinator',
        '_hap._tcp': 'HomeKit Accessory',
        '_http._tcp': 'HTTP Service',
        '_https._tcp': 'HTTPS Service',
        '_ipp._tcp': 'IP Printer',
        '_printer._tcp': 'Printer',
        '_ssh._tcp': 'SSH Service',
        '_workstation._tcp': 'Workstation',
        '_device-info._tcp': 'Device Info',
        '_smb._tcp': 'Windows Network',
        '_googlecast._tcp': 'Google Cast',
        '_airplay._tcp': 'AirPlay',
        '_zigbeed._tcp': 'Zigbee Device'
    };
    
    for (const [key, value] of Object.entries(serviceMap)) {
        if (serviceName.includes(key)) {
            return value;
        }
    }
    
    return 'Network Service';
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