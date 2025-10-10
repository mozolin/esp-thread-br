// DOM elements
const devicesElement = document.getElementById('devices');
const statusElement = document.getElementById('statusText');
const totalDevicesElement = document.getElementById('totalDevices');
const activeDevicesElement = document.getElementById('activeDevices');
const lastUpdateElement = document.getElementById('lastUpdate');
const logSizeElement = document.getElementById('logSize');
const themeToggle = document.getElementById('themeToggle');
const protocolStatsElement = document.getElementById('protocolStats');

// Global variables
let ws = null;
let lastUpdate = new Date();
let allDevices = [];
let currentFilter = 'all';

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
            loadProtocolStats();
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
    // Apply current filter
    let filteredDevices = devices;
    if (currentFilter !== 'all') {
        filteredDevices = devices.filter(device => device.protocol === currentFilter);
    }
    
    if (filteredDevices.length === 0) {
        devicesElement.innerHTML = `
            <div class="no-devices">
                <h2>No devices discovered yet</h2>
                <p>Scanning network every 10 seconds...</p>
                <p>Make sure you have mDNS devices in your network.</p>
                <p>Last scan: ${lastUpdate.toLocaleTimeString()}</p>
                ${currentFilter !== 'all' ? `<p>Current filter: ${currentFilter}</p>` : ''}
            </div>
        `;
        return;
    }
    
    devicesElement.innerHTML = `
        <h2>Discovered Devices (${filteredDevices.length}${currentFilter !== 'all' ? ` of ${count} total - Filter: ${currentFilter}` : ''}):</h2>
        <p class="last-update">Last update: ${lastUpdate.toLocaleTimeString()}</p>
    `;
    
    filteredDevices.forEach(device => {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        
        const protocolClass = device.protocol ? `protocol-${device.protocol.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'protocol-unknown';
        const protocolName = device.protocol ? device.protocol.replace(/_/g, ' ') : 'Unknown';
        
        let html = `
            <div class="device-header">${escapeHtml(device.name || 'Unknown Device')}</div>
            <div class="protocol-badge ${protocolClass}">${protocolName}</div>
            <div class="timestamp">First seen: ${new Date(device.firstSeen).toLocaleString()}</div>
            <div class="timestamp">Last seen: ${new Date(device.lastSeen).toLocaleString()}</div>
            <div><strong>Type:</strong> ${escapeHtml(device.type)}</div>
            <div><strong>Service:</strong> ${escapeHtml(device.service)}</div>
        `;
        
        if (device.seenCount) {
            html += `<div class="device-meta">Seen ${device.seenCount} times</div>`;
        }
        
        if (device.ipv4) {
            html += `<div><strong>IPv4:</strong> ${escapeHtml(device.ipv4)}</div>`;
        }
        
        if (device.ipv6) {
            html += `<div><strong>IPv6:</strong> ${escapeHtml(device.ipv6)}</div>`;
        }
        
        if (device.hostname) {
            html += `<div><strong>Hostname:</strong> ${escapeHtml(device.hostname)}</div>`;
        }
        
        if (device.srv) {
            html += `<div><strong>SRV:</strong> ${escapeHtml(device.srv.target)}:${device.srv.port}</div>`;
        }
        
        // Display device details from TXT records
        if (device.details && Object.keys(device.details).length > 0) {
            html += `<div class="device-details"><strong>Details:</strong>`;
            Object.entries(device.details).forEach(([key, value]) => {
                html += `<div class="detail-item">
                    <span class="detail-key">${escapeHtml(key)}:</span>
                    <span class="detail-value">${escapeHtml(value)}</span>
                </div>`;
            });
            html += `</div>`;
        }
        
        // Display Thread network info
        if (device.threadInfo && Object.keys(device.threadInfo).length > 0) {
            html += `<div class="thread-network-info"><strong>Thread Network Info:</strong>`;
            Object.entries(device.threadInfo).forEach(([key, value]) => {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">${escapeHtml(key)}:</span>
                    <span class="thread-info-value">${escapeHtml(value)}</span>
                </div>`;
            });
            html += `</div>`;
        }
        
        // Display TXT records (including binary ones)
        if (device.txtRecords && device.txtRecords.length > 0) {
            html += `<div class="txt-section"><strong>TXT Records:</strong>`;
            device.txtRecords.forEach(record => {
                if (record.startsWith('[BINARY:')) {
                    // Format binary data nicely
                    const hex = record.substring(8, record.length - 1); // Remove [BINARY: and ]
                    html += `<div class="txt-record binary">
                        <span class="binary-label">Binary data:</span>
                        <span class="binary-hex">${hex}</span>
                        <span class="binary-size">(${hex.length / 2} bytes)</span>
                    </div>`;
                } else {
                    html += `<div class="txt-record">${escapeHtml(record)}</div>`;
                }
            });
            html += `</div>`;
        }
        
        deviceElement.innerHTML = html;
        devicesElement.appendChild(deviceElement);
    });
}

// Statistics management
function updateStats() {
    const filteredDevices = currentFilter === 'all' ? allDevices : allDevices.filter(device => device.protocol === currentFilter);
    
    totalDevicesElement.textContent = filteredDevices.length;
    
    // Active devices (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDevices = filteredDevices.filter(device => 
        new Date(device.lastSeen) > fiveMinutesAgo
    );
    activeDevicesElement.textContent = activeDevices.length;
    
    lastUpdateElement.textContent = lastUpdate.toLocaleTimeString();
}

// Protocol management
function filterDevicesByProtocol(protocol) {
    currentFilter = protocol;
    updateDevicesList(allDevices, allDevices.length);
    updateStats();
    
    // Update active filter buttons
    document.querySelectorAll('.protocol-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (protocol !== 'all') {
        const activeBtn = document.querySelector(`.protocol-filters .btn[onclick="filterDevicesByProtocol('${protocol}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

async function loadProtocolStats() {
    try {
        const response = await fetch('/protocols');
        const data = await response.json();
        updateProtocolStats(data.protocols);
    } catch (error) {
        console.error('Failed to load protocol stats:', error);
        // Fallback: calculate from current devices
        const protocols = {};
        allDevices.forEach(device => {
            const protocol = device.protocol || 'Unknown';
            protocols[protocol] = (protocols[protocol] || 0) + 1;
        });
        updateProtocolStats(protocols);
    }
}

function updateProtocolStats(protocols) {
    if (protocolStatsElement) {
        let html = '';
        Object.entries(protocols).forEach(([protocol, count]) => {
            const protocolClass = protocol ? `protocol-${protocol.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'protocol-unknown';
            const protocolName = protocol ? protocol.replace(/_/g, ' ') : 'Unknown';
            
            html += `<div class="protocol-stat" onclick="filterDevicesByProtocol('${protocol}')">
                <span class="protocol-name ${protocolClass}">${protocolName}</span>
                <span class="protocol-count">${count}</span>
            </div>`;
        });
        protocolStatsElement.innerHTML = html;
    }
}

// Data management
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
        
        // Update protocol stats if available
        if (stats.protocols) {
            updateProtocolStats(stats.protocols);
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
        showNotification('Refreshing device list...', 'info');
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
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
    
    .btn.active {
        background: var(--accent-success) !important;
        transform: scale(1.05);
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