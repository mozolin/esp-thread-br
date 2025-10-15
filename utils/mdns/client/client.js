// DOM elements
const devicesElement = document.getElementById('devices');
const statusElement = document.getElementById('statusText');
const totalDevicesElement = document.getElementById('totalDevices');
const activeDevicesElement = document.getElementById('activeDevices');
const lastUpdateElement = document.getElementById('lastUpdate');
const logSizeElement = document.getElementById('logSize');
const autoRefreshStatusElement = document.getElementById('autoRefreshStatus');
const themeToggle = document.getElementById('themeToggle');
const protocolStatsElement = document.getElementById('protocolStats');

// Global variables
let ws = null;
let lastUpdate = new Date();
let allDevices = [];
let currentFilter = 'all';
let autoRefreshEnabled = true;
let refreshInterval = null;
let statusUpdateInterval = null;
let pausedDevices = [];

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
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
    }
}

// WebSocket connection
function connectWS() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = function() {
        if (statusElement) {
            statusElement.textContent = 'Connected - Scanning for devices...';
            statusElement.className = 'connected';
        }
        console.log('WebSocket connected');
        loadStats();
    };
    
    ws.onmessage = function(event) {
        if (!autoRefreshEnabled) {
            console.log('Message received but auto-refresh is disabled - ignoring');
            return;
        }
        
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
        if (statusElement) {
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'disconnected';
        }
        console.log('WebSocket disconnected');
        
        setTimeout(connectWS, 5000);
    };
    
    ws.onerror = function(error) {
        if (statusElement) {
            statusElement.textContent = 'Connection Error';
            statusElement.className = 'disconnected';
        }
        console.error('WebSocket error:', error);
    };
}

// Auto-refresh management
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    
    if (autoRefreshEnabled) {
        startAutoRefresh();
        if (ws && ws.readyState === WebSocket.OPEN) {
            refreshDevices();
        }
        showNotification('Auto-refresh enabled - Live data updating', 'success');
    } else {
        stopAutoRefresh();
        pausedDevices = [...allDevices];
        showNotification('Auto-refresh disabled - Data frozen', 'warning');
    }
    
    updateAutoRefreshButton();
    updateAutoRefreshStatus();
    updateDevicesDisplay();
}

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN && autoRefreshEnabled) {
            refreshDevices();
        }
    }, 10000);
    
    console.log('Auto-refresh started');
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    console.log('Auto-refresh stopped');
}

function updateAutoRefreshButton() {
    const btn = document.querySelector('.btn-refresh-toggle');
    if (btn) {
        if (autoRefreshEnabled) {
            btn.innerHTML = '⏸️ Stop Auto-Refresh';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-danger');
            btn.title = 'Stop automatic data updates';
        } else {
            btn.innerHTML = '▶️ Start Auto-Refresh';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-success');
            btn.title = 'Start automatic data updates';
        }
    }
}

function updateAutoRefreshStatus() {
    if (autoRefreshStatusElement) {
        if (autoRefreshEnabled) {
            autoRefreshStatusElement.textContent = 'On';
            autoRefreshStatusElement.style.color = 'var(--accent-success)';
            autoRefreshStatusElement.title = 'Live data updating';
        } else {
            autoRefreshStatusElement.textContent = 'Off';
            autoRefreshStatusElement.style.color = 'var(--accent-danger)';
            autoRefreshStatusElement.title = 'Data frozen - click Start to resume';
        }
    }
}

function updateDevicesDisplay() {
    const displayDevices = autoRefreshEnabled ? allDevices : pausedDevices;
    const displayCount = autoRefreshEnabled ? allDevices.length : pausedDevices.length;
    
    updateDevicesList(displayDevices, displayCount);
    updateStats();
}

// Device list management
function updateDevicesList(devices, count) {
    if (!devicesElement) return;
    
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
                ${!autoRefreshEnabled ? `<p class="auto-refresh-off">⚠️ Auto-refresh is currently disabled - data frozen</p>` : ''}
            </div>
        `;
        return;
    }
    
    devicesElement.innerHTML = `
        <h2>Discovered Devices (${filteredDevices.length}${currentFilter !== 'all' ? ` of ${count} total - Filter: ${currentFilter}` : ''}):</h2>
        <p class="last-update">Last update: ${lastUpdate.toLocaleTimeString()}</p>
        ${!autoRefreshEnabled ? `<p class="auto-refresh-off">⚠️ Auto-refresh is disabled - data frozen at ${lastUpdate.toLocaleTimeString()}</p>` : ''}
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
        
        // Enhanced device information display
        if (device.hostname) {
            html += `<div><strong>Hostname:</strong> ${escapeHtml(device.hostname)}</div>`;
        }
        
        if (device.ipv4) {
            html += `<div><strong>IPv4:</strong> ${escapeHtml(device.ipv4)}</div>`;
        }
        
        if (device.ipv6) {
            html += `<div><strong>IPv6:</strong> ${escapeHtml(device.ipv6)}</div>`;
        }
        
        if (device.port) {
            html += `<div><strong>Port:</strong> ${device.port}</div>`;
        }
        
        // Display URL for HTTP/HTTPS services
        if (device.url) {
            html += `<div><strong>URL:</strong> <a href="${escapeHtml(device.url)}" target="_blank" class="device-url">${escapeHtml(device.url)}</a></div>`;
        }
        
        // Display service type
        if (device.serviceType) {
            html += `<div><strong>Service Type:</strong> ${escapeHtml(device.serviceType)}</div>`;
        }
        
        // Display Matter device info
        if (device.matterInfo) {
            html += `<div class="matter-info"><strong>Matter Device:</strong>`;
            html += `<div class="matter-detail">Vendor ID: ${escapeHtml(device.matterInfo.vendorId)}</div>`;
            html += `<div class="matter-detail">Product ID: ${escapeHtml(device.matterInfo.productId)}</div>`;
            html += `<div class="matter-detail">Device ID: ${escapeHtml(device.matterInfo.deviceId)}</div>`;
            html += `</div>`;
        }
        
        // Enhanced Thread device information
        if (device.protocol === 'THREAD' && device.details) {
            html += `<div class="thread-network-info"><strong>Thread Network Details:</strong>`;
            
            // Display readable thread information
            if (device.details.networkName) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Network Name:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.networkName)}</span>
                </div>`;
            }
            
            if (device.details.threadVersion) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Thread Version:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.threadVersion)}</span>
                </div>`;
            }
            
            if (device.details.vendor) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Vendor:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.vendor)}</span>
                </div>`;
            }
            
            if (device.details.model) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Model:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.model)}</span>
                </div>`;
            }
            
            if (device.details.domain) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Domain:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.domain)}</span>
                </div>`;
            }
            
            if (device.details.revision) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Revision:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.revision)}</span>
                </div>`;
            }
            
            if (device.details.sequence) {
                html += `<div class="thread-info-item">
                    <span class="thread-info-key">Sequence:</span>
                    <span class="thread-info-value">${escapeHtml(device.details.sequence)}</span>
                </div>`;
            }
            
            html += `</div>`;
        }
        
        if (device.srv) {
            html += `<div><strong>SRV:</strong> ${escapeHtml(device.srv.target)}:${device.srv.port}</div>`;
        }
        
        // Display device details from TXT records
        if (device.details && Object.keys(device.details).length > 0) {
            html += `<div class="device-details"><strong>Additional Details:</strong>`;
            Object.entries(device.details).forEach(([key, value]) => {
                // Skip binary data objects and thread info for cleaner display
                if (typeof value === 'object' && value.hex) {
                    // Show binary data summary
                    html += `<div class="detail-item">
                        <span class="detail-key">${escapeHtml(key)}:</span>
                        <span class="detail-value">${escapeHtml(value.type)} (${value.size} bytes)</span>
                    </div>`;
                } else if (key.startsWith('binaryData')) {
                    // Skip raw binary data keys
                } else if (!['networkName', 'threadVersion', 'vendor', 'model', 'domain', 'revision', 'sequence'].includes(key)) {
                    // Don't duplicate thread info already displayed above
                    html += `<div class="detail-item">
                        <span class="detail-key">${escapeHtml(key)}:</span>
                        <span class="detail-value">${escapeHtml(value)}</span>
                    </div>`;
                }
            });
            html += `</div>`;
        }
        
        // Display TXT records (including binary ones)
        if (device.txtRecords && device.txtRecords.length > 0) {
            html += `<div class="txt-section"><strong>TXT Records:</strong>`;
            device.txtRecords.forEach(record => {
                if (record.startsWith('[BINARY:')) {
                    const hex = record.substring(8, record.length - 1);
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
    const displayDevices = autoRefreshEnabled ? allDevices : pausedDevices;
    const filteredDevices = currentFilter === 'all' ? displayDevices : displayDevices.filter(device => device.protocol === currentFilter);
    
    if (totalDevicesElement) {
        totalDevicesElement.textContent = filteredDevices.length;
    }
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDevices = filteredDevices.filter(device => 
        new Date(device.lastSeen) > fiveMinutesAgo
    );
    
    if (activeDevicesElement) {
        activeDevicesElement.textContent = activeDevices.length;
    }
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = lastUpdate.toLocaleTimeString();
    }
}

// Protocol management
function filterDevicesByProtocol(protocol) {
    currentFilter = protocol;
    updateDevicesDisplay();
    
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
        const displayDevices = autoRefreshEnabled ? allDevices : pausedDevices;
        const protocols = {};
        displayDevices.forEach(device => {
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
        
        const displayDevices = autoRefreshEnabled ? allDevices : pausedDevices;
        
        if (totalDevicesElement) {
            totalDevicesElement.textContent = displayDevices.length;
        }
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeDevices = displayDevices.filter(device => 
            new Date(device.lastSeen) > fiveMinutesAgo
        );
        
        if (activeDevicesElement) {
            activeDevicesElement.textContent = activeDevices.length;
        }
        
        if (lastUpdateElement) {
            lastUpdateElement.textContent = lastUpdate.toLocaleTimeString();
        }
        
        if (logSizeElement) {
            const logSizeKB = Math.round(stats.logFileSize / 1024);
            logSizeElement.textContent = `${logSizeKB} KB`;
            
            if (stats.logFileSize > 900 * 1024) {
                logSizeElement.style.color = 'var(--accent-danger)';
            } else if (stats.logFileSize > 500 * 1024) {
                logSizeElement.style.color = 'var(--accent-warning)';
            } else {
                logSizeElement.style.color = 'var(--accent-primary)';
            }
        }
        
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
        ws.send(JSON.stringify({ type: 'refresh' }));
        showNotification('Refreshing device list...', 'info');
    } else {
        showNotification('WebSocket not connected - cannot refresh', 'error');
    }
}

async function cleanupLogs() {
    try {
        const response = await fetch('/cleanup-logs');
        const result = await response.json();
        showNotification(result.message, 'success');
        loadStats();
    } catch (error) {
        console.error('Failed to cleanup logs:', error);
        showNotification('Error cleaning up logs', 'error');
    }
}

function exportDevices() {
    const displayDevices = autoRefreshEnabled ? allDevices : pausedDevices;
    
    if (displayDevices.length === 0) {
        showNotification('No devices to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(displayDevices, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mdns-devices-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification(`Exported ${displayDevices.length} devices successfully`, 'success');
}

// Utility functions
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
        box-shadow: var(--shadow);
    `;
    
    if (type === 'success') {
        notification.style.background = 'var(--accent-success)';
    } else if (type === 'error') {
        notification.style.background = 'var(--accent-danger)';
    } else if (type === 'warning') {
        notification.style.background = 'var(--accent-warning)';
        notification.style.color = '#212529';
    } else {
        notification.style.background = 'var(--accent-primary)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    connectWS();
    startAutoRefresh();
    
    statusUpdateInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN && statusElement) {
            const now = new Date();
            const diff = Math.floor((now - lastUpdate) / 1000);
            const statusText = autoRefreshEnabled ? 
                `Connected - Auto-refresh ON (Last update: ${diff}s ago)` :
                `Connected - Auto-refresh OFF (Data frozen - Last update: ${diff}s ago)`;
            statusElement.textContent = statusText;
        }
    }, 5000);
    
    setInterval(loadStats, 60000);
    loadStats();
    updateAutoRefreshStatus();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && autoRefreshEnabled) {
        loadStats();
        if (ws && ws.readyState === WebSocket.OPEN) {
            refreshDevices();
        }
    }
});

// Handle page before unload
window.addEventListener('beforeunload', function() {
    if (ws) {
        ws.close();
    }
    stopAutoRefresh();
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
});

// Add CSS for notifications and auto-refresh button
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
    
    .btn-success {
        background: var(--accent-success);
    }
    
    .btn-success:hover {
        background: #218838;
    }
    
    .auto-refresh-off {
        color: var(--accent-warning);
        background: rgba(255, 193, 7, 0.1);
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 3px solid var(--accent-warning);
        margin: 10px 0;
        font-weight: 500;
    }
    
    .device.frozen {
        opacity: 0.7;
        border-left-color: var(--accent-warning);
    }
    
    .matter-info {
        margin-top: 10px;
        padding: 10px;
        background: rgba(33, 150, 243, 0.1);
        border-radius: 6px;
        border-left: 3px solid #2196F3;
    }
    
    .matter-detail {
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        margin: 2px 0;
    }
`;
document.head.appendChild(notificationStyles);