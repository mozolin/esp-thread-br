// DOM elements
const devicesElement = document.getElementById('devices');
const statusElement = document.getElementById('statusText');
const totalDevicesElement = document.getElementById('totalDevices');
const activeDevicesElement = document.getElementById('activeDevices');
const lastUpdateElement = document.getElementById('lastUpdate');
const logSizeElement = document.getElementById('logSize');
const themeToggle = document.getElementById('themeToggle');

// Global variables
let ws = null;
let lastUpdate = new Date();
let allDevices = [];

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
}

// WebSocket connection
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
        
        // Attempt reconnection after 5 seconds
        setTimeout(connectWS, 5000);
    };
    
    ws.onerror = function(error) {
        statusElement.textContent = 'Connection Error';
        statusElement.className = 'disconnected';
        console.error('WebSocket error:', error);
    };
}

// Device list management
function updateDevicesList(devices, count) {
    if (devices.length === 0) {
        devicesElement.innerHTML = `
            <div class="no-devices">
                <h2>No devices discovered yet</h2>
                <p>Scanning network every 10 seconds...</p>
                <p>Make sure you have mDNS devices in your network.</p>
                <p>Last scan: ${lastUpdate.toLocaleTimeString()}</p>
            </div>
        `;
        return;
    }
    
    devicesElement.innerHTML = `
        <h2>Discovered Devices (${count}):</h2>
        <p class="last-update">Last update: ${lastUpdate.toLocaleTimeString()}</p>
    `;
    
    devices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        
        let html = `
            <div class="device-header">${device.name || 'Unknown Device'}</div>
            <div class="timestamp">First seen: ${new Date(device.firstSeen).toLocaleString()}</div>
            <div class="timestamp">Last seen: ${new Date(device.lastSeen).toLocaleString()}</div>
            <div><strong>Type:</strong> ${device.type}</div>
            <div><strong>Service:</strong> ${device.service}</div>
        `;
        
        if (device.seenCount) {
            html += `<div class="device-meta">Seen ${device.seenCount} times</div>`;
        }
        
        if (device.ipv4) {
            html += `<div><strong>IPv4:</strong> ${device.ipv4}</div>`;
        }
        
        if (device.ipv6) {
            html += `<div><strong>IPv6:</strong> ${device.ipv6}</div>`;
        }
        
        if (device.srv) {
            html += `<div><strong>SRV:</strong> ${device.srv.target}:${device.srv.port}</div>`;
        }
        
        if (device.txtRecords && device.txtRecords.length > 0) {
            html += `<div><strong>TXT Records:</strong></div>`;
            device.txtRecords.forEach(record => {
                html += `<div class="txt-record">${record}</div>`;
            });
        }
        
        deviceElement.innerHTML = html;
        devicesElement.appendChild(deviceElement);
    });
}

// Statistics management
function updateStats() {
    totalDevicesElement.textContent = allDevices.length;
    
    // Active devices (last 5 minutes)
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
        
        // Update log size information
        const logSizeKB = Math.round(stats.logFileSize / 1024);
        logSizeElement.textContent = `${logSizeKB} KB`;
        
        // Highlight if log is approaching limit
        if (stats.logFileSize > 900 * 1024) { // 900 KB
            logSizeElement.style.color = 'var(--accent-danger)';
        } else if (stats.logFileSize > 500 * 1024) { // 500 KB
            logSizeElement.style.color = 'var(--accent-warning)';
        } else {
            logSizeElement.style.color = 'var(--accent-primary)';
        }
        
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Control functions
function refreshDevices() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Send refresh request
        ws.send(JSON.stringify({ type: 'refresh' }));
    }
}

async function cleanupLogs() {
    try {
        const response = await fetch('/cleanup-logs');
        const result = await response.json();
        showNotification(result.message, 'success');
        loadStats(); // Refresh statistics
    } catch (error) {
        console.error('Failed to cleanup logs:', error);
        showNotification('Error cleaning up logs', 'error');
    }
}

function exportDevices() {
    const dataStr = JSON.stringify(allDevices, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mdns-devices-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Devices exported successfully', 'success');
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    if (type === 'success') {
        notification.style.background = 'var(--accent-success)';
    } else if (type === 'error') {
        notification.style.background = 'var(--accent-danger)';
    } else {
        notification.style.background = 'var(--accent-primary)';
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add protocol filtering functionality
function filterDevicesByProtocol(protocol) {
    if (protocol === 'all') {
        updateDevicesList(allDevices, allDevices.length);
    } else {
        const filteredDevices = allDevices.filter(device => device.protocol === protocol);
        updateDevicesList(filteredDevices, filteredDevices.length);
    }
}

// Add protocol statistics display
function updateProtocolStats(protocols) {
    const protocolStatsElement = document.getElementById('protocolStats');
    if (protocolStatsElement) {
        let html = '<div class="protocol-stats">';
        Object.entries(protocols).forEach(([protocol, count]) => {
            html += `<div class="protocol-stat" onclick="filterDevicesByProtocol('${protocol}')">
                <span class="protocol-name">${protocol}</span>
                <span class="protocol-count">${count}</span>
            </div>`;
        });
        html += '</div>';
        protocolStatsElement.innerHTML = html;
    }
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initTheme();
    
    // Add event listeners
    themeToggle.addEventListener('click', toggleTheme);
    
    // Connect to WebSocket
    connectWS();
    
    // Update status every 5 seconds
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const now = new Date();
            const diff = Math.floor((now - lastUpdate) / 1000);
            statusElement.textContent = `Connected - Scanning (Last update: ${diff}s ago)`;
        }
    }, 5000);
    
    // Load statistics every minute
    setInterval(loadStats, 60000);
    
    // Load initial statistics
    loadStats();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible, refresh data
        loadStats();
        if (ws && ws.readyState === WebSocket.OPEN) {
            refreshDevices();
        }
    }
});