const devicesElement = document.getElementById('devices');
const statusElement = document.getElementById('statusText');
const totalDevicesElement = document.getElementById('totalDevices');
const activeDevicesElement = document.getElementById('activeDevices');
const lastUpdateElement = document.getElementById('lastUpdate');

let ws = null;
let lastUpdate = new Date();
let allDevices = [];

function connectWS() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = function() {
        statusElement.textContent = 'Connected - Scanning for devices...';
        statusElement.className = 'connected';
        console.log('WebSocket connected');
        loadStats();
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        lastUpdate = new Date();
        
        if (data.type === 'mdns_response') {
            allDevices = data.data;
            updateDevicesList(allDevices, data.count);
            updateStats();
        }
    };
    
    ws.onclose = function() {
        statusElement.textContent = 'Disconnected';
        statusElement.className = 'disconnected';
        console.log('WebSocket disconnected');
        
        // Попытка переподключения через 5 секунд
        setTimeout(connectWS, 5000);
    };
    
    ws.onerror = function(error) {
        statusElement.textContent = 'Connection Error';
        statusElement.className = 'disconnected';
        console.error('WebSocket error:', error);
    };
}

function refreshDevices() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Можно отправить запрос на принудительное сканирование
        ws.send(JSON.stringify({ type: 'refresh' }));
    }
}

function updateDevicesList(devices, count) {
    if (devices.length === 0) {
        devicesElement.innerHTML = `
            <h2>No devices discovered yet</h2>
            <p>Scanning network every 10 seconds...</p>
            <p>Make sure you have mDNS devices in your network.</p>
            <p>Last scan: ${lastUpdate.toLocaleTimeString()}</p>
        `;
        return;
    }
    
    devicesElement.innerHTML = `
        <h2>Discovered Devices (${count}):</h2>
        <p>Last update: ${lastUpdate.toLocaleTimeString()}</p>
    `;
    
    devices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        
        let html = `
            <div class="device-header">${device.name || 'Unknown Device'}</div>
            <div class="timestamp">First seen: ${new Date(device.firstSeen).toLocaleString()}</div>
            <div class="timestamp">Last seen: ${new Date(device.lastSeen).toLocaleString()}</div>
            <div>Type: ${device.type}</div>
            <div>Service: ${device.service}</div>
        `;
        
        if (device.seenCount) {
            html += `<div class="device-meta">Seen ${device.seenCount} times</div>`;
        }
        
        if (device.ipv4) {
            html += `<div>IPv4: ${device.ipv4}</div>`;
        }
        
        if (device.ipv6) {
            html += `<div>IPv6: ${device.ipv6}</div>`;
        }
        
        if (device.srv) {
            html += `<div>SRV: ${device.srv.target}:${device.srv.port}</div>`;
        }
        
        if (device.txtRecords && device.txtRecords.length > 0) {
            html += `<div>TXT Records:</div>`;
            device.txtRecords.forEach(record => {
                html += `<div class="txt-record">${record}</div>`;
            });
        }
        
        deviceElement.innerHTML = html;
        devicesElement.appendChild(deviceElement);
    });
}

function updateStats() {
    totalDevicesElement.textContent = allDevices.length;
    
    // Активные устройства (последние 5 минут)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDevices = allDevices.filter(device => 
        new Date(device.lastSeen) > fiveMinutesAgo
    );
    activeDevicesElement.textContent = activeDevices.length;
    
    lastUpdateElement.textContent = lastUpdate.toLocaleTimeString();
}

async function loadStats() {
    try {
        const response = await fetch('/stats');
        const stats = await response.json();
        
        totalDevicesElement.textContent = stats.totalDevices;
        activeDevicesElement.textContent = stats.activeDevices;
        lastUpdateElement.textContent = new Date(stats.lastScan).toLocaleTimeString();
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function exportDevices() {
    const dataStr = JSON.stringify(allDevices, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mdns-devices-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Автоподключение при загрузке
connectWS();

// Обновляем статус каждые 5 секунд
setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const now = new Date();
        const diff = Math.floor((now - lastUpdate) / 1000);
        statusElement.textContent = `Connected - Scanning (Last update: ${diff}s ago)`;
    }
}, 5000);

// Загружаем статистику каждую минуту
setInterval(loadStats, 60000);