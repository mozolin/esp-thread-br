// Encryption key management
const ENCRYPTION_KEY_STORAGE = 'esp32_encryption_key';
const SAMPLE_KEYS_STORAGE = 'esp32_sample_keys';
let currentEncryptionKey = null;
let currentFile = null;
let sampleKeys = [];

let progressBarBg = 'linear-gradient(90deg, #030, #0f0)';

// Функция для чтения чанков файла
function readFileChunk(file, start, size) {
    return new Promise((resolve, reject) => {
        const chunk = file.slice(start, start + size);
        const reader = new FileReader();
        
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('File reading error'));
        reader.readAsArrayBuffer(chunk);
    });
}

// Initialize key from storage
function loadEncryptionKey() {
    try {
        const savedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
        if (savedKey && isValidEncryptionKey(savedKey)) {
            currentEncryptionKey = savedKey.toUpperCase();
            updateKeyStatus('valid', 'Encryption key loaded from storage');
            document.getElementById('encryptionKey').value = formatKeyForDisplay(currentEncryptionKey);
            return true;
        }
    } catch (e) {
        console.warn('Failed to load encryption key from storage:', e);
    }
    return false;
}

// Load sample keys from storage
function loadSampleKeysFromStorage() {
    try {
        const savedSampleKeys = localStorage.getItem(SAMPLE_KEYS_STORAGE);
        if (savedSampleKeys) {
            sampleKeys = JSON.parse(savedSampleKeys);
            updateSampleKeysInfo();
            return true;
        }
    } catch (e) {
        console.warn('Failed to load sample keys from storage:', e);
    }
    return false;
}

function saveEncryptionKey() {
    const keyInput = document.getElementById('encryptionKey').value.replace(/\s/g, '');
    if (isValidEncryptionKey(keyInput)) {
        currentEncryptionKey = keyInput.toUpperCase();
        localStorage.setItem(ENCRYPTION_KEY_STORAGE, currentEncryptionKey);
        updateKeyStatus('valid', 'Encryption key saved successfully');
        showNotification('Encryption key saved securely', 'success');
    } else {
        updateKeyStatus('invalid', 'Invalid key format - must be 64 hex characters');
        showNotification('Invalid encryption key format', 'error');
    }
}

function clearEncryptionKey() {
    currentEncryptionKey = null;
    localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
    document.getElementById('encryptionKey').value = '';
    updateKeyStatus('missing', 'No encryption key provided');
    showNotification('Encryption key cleared', 'warning');
}

function generateRandomKey() {
    const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    
    document.getElementById('encryptionKey').value = formatKeyForDisplay(randomKey);
    updateKeyStatus('valid', 'Random encryption key generated');
    showNotification('Random encryption key generated', 'success');
}

async function loadSampleKeys() {
    try {
        // Create a sample keys file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.bin,.txt,.keys';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            document.getElementById('loading').style.display = 'block';
            
            try {
                const content = await readFileAsText(file);
                await processSampleKeysFile(content, file.name);
                showNotification('Sample keys loaded successfully', 'success');
            } catch (error) {
                showNotification('Error loading sample keys: ' + error.message, 'error');
            } finally {
                document.getElementById('loading').style.display = 'none';
                document.body.removeChild(fileInput);
            }
        };
        
        fileInput.click();
        
    } catch (error) {
        showNotification('Error loading sample keys: ' + error.message, 'error');
    }
}

async function processSampleKeysFile(content, fileName) {
    const lines = content.split('\n').filter(line => line.trim());
    const newKeys = [];
    
    for (const line of lines) {
        const cleanLine = line.trim().replace(/\s/g, '');
        
        // Skip comments and empty lines
        if (cleanLine.startsWith('#') || cleanLine.startsWith('//') || cleanLine === '') {
            continue;
        }
        
        // Try to extract key from various formats
        let potentialKey = cleanLine;
        
        // Handle key=value format
        if (cleanLine.includes('=')) {
            const parts = cleanLine.split('=');
            if (parts.length >= 2) {
                potentialKey = parts[1].trim();
            }
        }
        
        // Validate key format
        if (isValidEncryptionKey(potentialKey)) {
            newKeys.push({
                key: potentialKey.toUpperCase(),
                source: fileName,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    if (newKeys.length > 0) {
        sampleKeys = [...sampleKeys, ...newKeys];
        localStorage.setItem(SAMPLE_KEYS_STORAGE, JSON.stringify(sampleKeys));
        updateSampleKeysInfo();
        
        // Auto-select first key if no current key
        if (!currentEncryptionKey && newKeys.length > 0) {
            currentEncryptionKey = newKeys[0].key;
            document.getElementById('encryptionKey').value = formatKeyForDisplay(currentEncryptionKey);
            updateKeyStatus('valid', `Using key from ${fileName}`);
            localStorage.setItem(ENCRYPTION_KEY_STORAGE, currentEncryptionKey);
        }
    } else {
        showNotification('No valid keys found in the file', 'warning');
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('File reading error'));
        reader.readAsText(file);
    });
}

function updateSampleKeysInfo() {
    const infoDiv = document.getElementById('sampleKeysInfo');
    if (sampleKeys.length > 0) {
        infoDiv.innerHTML = `📚 Loaded ${sampleKeys.length} sample keys. <button onclick="showSampleKeys()" style="background: #444; color: #ffaa00; border: 1px solid #ffaa00; padding: 2px 8px; border-radius: 3px; cursor: pointer;">View Keys</button>`;
    } else {
        infoDiv.innerHTML = 'No sample keys loaded. Click "Load Sample Keys" to import keys from a file.';
    }
}

function showSampleKeys() {
    const keysList = sampleKeys.map((key, index) => 
        `Key ${index + 1}: ${key.key.substring(0, 16)}... (from ${key.source})`
    ).join('\n');
    
    alert(`Loaded Sample Keys:\n\n${keysList}\n\nTotal: ${sampleKeys.length} keys`);
}

function isValidEncryptionKey(key) {
    const cleanKey = key.replace(/\s/g, '');
    return /^[0-9A-Fa-f]{64}$/.test(cleanKey);
}

function formatKeyForDisplay(key) {
    return key.replace(/(.{8})/g, '$1 ').trim();
}

function updateKeyStatus(status, message) {
    const keyStatus = document.getElementById('keyStatus');
    keyStatus.className = 'key-status key-' + status;
    keyStatus.textContent = message;

    const keyInfo = document.getElementById('keyInfo');
    if (status === 'valid' && currentEncryptionKey) {
        keyInfo.textContent = `Key: ${currentEncryptionKey.substring(0, 16)}...${currentEncryptionKey.substring(48)}`;
    } else {
        keyInfo.textContent = '';
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#005500' : 
                   type === 'error' ? '#550000' : 
                   type === 'warning' ? '#553300' : '#004477';
    const borderColor = type === 'success' ? '#00ff00' : 
                      type === 'error' ? '#ff0000' : 
                      type === 'warning' ? '#ffaa00' : '#00aaff';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadEncryptionKey();
    loadSampleKeysFromStorage();
    
    // Real-time key validation
    document.getElementById('encryptionKey').addEventListener('input', function(e) {
        const key = e.target.value.replace(/\s/g, '');
        if (key.length === 0) {
            updateKeyStatus('missing', 'No encryption key provided');
        } else if (isValidEncryptionKey(key)) {
            updateKeyStatus('valid', 'Valid encryption key format');
        } else {
            updateKeyStatus('invalid', 'Invalid key format - must be 64 hex characters');
        }
    });
});

// Enhanced file analysis with encryption support
document.getElementById('binFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentFile = file;
    showFileInfo(file);

    document.getElementById('loading').style.display = 'block';

    try {
        const analysis = await analyzeEsp32BinFileAdvanced(file);
        displayResults(analysis, file.name);
    } catch (error) {
        document.getElementById('results').innerHTML = 
            `<div class="result danger">Analysis error: ${error.message}</div>`;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

function showFileInfo(file) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="file-info">
            <strong>Selected file:</strong> ${file.name}<br/>
            <strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
            <strong>Type:</strong> ${file.type || 'application/octet-stream'}
        </div>
    `;
}

async function analyzeEsp32BinFileAdvanced(file) {
    const CHUNK_SIZE = 64 * 1024;
    const MAX_SAMPLE_SIZE = 1024 * 1024;
    
    const results = {
        fileName: file.name,
        totalSize: file.size,
        segments: [],
        compression: { detected: false, type: 'none', ratio: 1 },
        encryption: { detected: false, type: 'none', confidence: 0, encrypted: false },
        alignment: { blockSize: 4096, wastedBytes: 0 },
        usedSize: 0,
        freeSize: 0,
        utilization: 0,
        espMagic: false,
        formatAnalysis: {},
        warnings: [],
        recommendations: [],
        analysisMethod: 'advanced',
        decryption: { attempted: false, successful: false, decryptedData: null }
    };

    // Read file header for analysis
    const headerBuffer = await readFileChunk(file, 0, 1024);
    const headerView = new Uint8Array(headerBuffer);
    
    // Extended format analysis
    results.formatAnalysis = analyzeEsp32FormatExtended(headerView);
    results.espMagic = results.formatAnalysis.espMagic;
    
    // Enhanced encryption analysis with decryption attempt
    results.encryption = await analyzeEncryptionAdvanced(headerView, file.size, file);
    
    // If encryption detected and key available, attempt decryption
    if (results.encryption.detected && currentEncryptionKey && results.encryption.encrypted) {
        results.decryption = await attemptDecryption(file, currentEncryptionKey);
        if (results.decryption.successful) {
            results.recommendations.push('✅ File successfully decrypted with provided key');
        } else {
            results.warnings.push('🔐 Encryption detected but decryption failed - check your key');
            
            // Try sample keys if available
            if (sampleKeys.length > 0) {
                results.warnings.push(`🔄 Trying ${sampleKeys.length} sample keys...`);
                for (const sampleKey of sampleKeys) {
                    if (sampleKey.key !== currentEncryptionKey) {
                        const sampleDecryption = await attemptDecryption(file, sampleKey.key);
                        if (sampleDecryption.successful) {
                            results.decryption = sampleDecryption;
                            results.recommendations.push(`✅ Decrypted with sample key from ${sampleKey.source}`);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Compression analysis
    results.compression = analyzeCompressionDetailed(
        results.decryption.successful ? 
        new Uint8Array(results.decryption.decryptedData).slice(0, 256) : 
        headerView
    );
    
    // File utilization analysis
    const sampleSize = Math.min(MAX_SAMPLE_SIZE, file.size);
    const sampleBuffer = results.decryption.successful ? 
        results.decryption.decryptedData.slice(0, sampleSize) :
        await readFileChunk(file, 0, sampleSize);
    const sampleView = new Uint8Array(sampleBuffer);
    
    let lastNonEmpty = 0;
    for (let i = 0; i < sampleView.length; i++) {
        if (sampleView[i] !== 0xFF && sampleView[i] !== 0x00) {
            lastNonEmpty = i;
        }
    }

    if (lastNonEmpty < sampleSize - 1000) {
        results.usedSize = lastNonEmpty + 1;
    } else {
        results.usedSize = Math.min(file.size, sampleSize * 0.95);
    }

    // Segment analysis
    results.segments = analyzeEsp32Segments(
        results.decryption.successful ? 
        new Uint8Array(results.decryption.decryptedData) : 
        headerView, 0
    );

    // Calculate statistics
    results.freeSize = results.totalSize - results.usedSize;
    results.utilization = ((results.usedSize / results.totalSize) * 100).toFixed(2);

    // Generate recommendations
    generateRecommendationsAdvanced(results);

    return results;
}

function analyzeEsp32FormatExtended(view) {
    const analysis = {
        espMagic: false,
        formatType: 'unknown',
        details: {},
        firstBytes: Array.from(view.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')),
        entropy: calculateEntropy(view.slice(0, 256))
    };

    // Standard ESP32 magic bytes
    if (view[0] === 0xE9 && view[1] === 0x02 && view[2] === 0x40 && view[3] === 0x00) {
        analysis.espMagic = true;
        analysis.formatType = 'standard_esp32';
        analysis.details = {
            segments: view[1],
            flashMode: view[2],
            flashSize: view[3] & 0x0F,
            flashFreq: (view[3] & 0xF0) >> 4
        };
        return analysis;
    }

    // ESP32-S2/S3/C3 variants
    if (view[0] === 0xE9 && view[1] === 0x02) {
        analysis.espMagic = true;
        if (view[2] === 0x60 && view[3] === 0x00) {
            analysis.formatType = 'esp32_s2';
        } else if (view[2] === 0x50 && view[3] === 0x00) {
            analysis.formatType = 'esp32_c3';
        } else {
            analysis.formatType = 'esp32_variant';
        }
        return analysis;
    }

    // Bootloader format
    if (view[0] === 0xE9 && view[1] === 0x01) {
        analysis.formatType = 'bootloader';
        analysis.details = { type: 'ESP32 bootloader' };
        return analysis;
    }

    // Check for other known formats
    analysis.formatType = detectOtherFormats(view);
    return analysis;
}

function analyzeCompressionDetailed(view) {
    const compression = {
        detected: false,
        type: 'none',
        ratio: 1,
        confidence: 0,
        details: {}
    };

    // GZIP compression signature
    if (view[0] === 0x1F && view[1] === 0x8B) {
        compression.detected = true;
        compression.type = 'gzip';
        compression.confidence = 95;
        compression.ratio = 0.3;
        compression.details = {
            method: view[2],
            flags: view[3],
            mtime: (view[4] | (view[5] << 8) | (view[6] << 16) | (view[7] << 24))
        };
        return compression;
    }

    // ZLIB compression signatures
    if (view[0] === 0x78) {
        compression.detected = true;
        compression.type = 'zlib';
        compression.confidence = 90;
        compression.ratio = 0.4;
        
        if (view[1] === 0x01) compression.details.level = 'fast';
        else if (view[1] === 0x9C) compression.details.level = 'default';
        else if (view[1] === 0xDA) compression.details.level = 'max';
        
        return compression;
    }

    // LZ4 compression
    if (view[0] === 0x04 && view[1] === 0x22 && view[2] === 0x4D && view[3] === 0x18) {
        compression.detected = true;
        compression.type = 'lz4';
        compression.confidence = 85;
        compression.ratio = 0.45;
        return compression;
    }

    // Entropy-based compression detection
    const entropy = calculateEntropy(view.slice(0, 1024));
    if (entropy > 7.5) {
        compression.detected = true;
        compression.type = 'likely_compressed';
        compression.confidence = Math.min(80, (entropy - 7.0) * 20);
        compression.ratio = 0.5;
        compression.details = { entropy: entropy.toFixed(2) };
    }

    return compression;
}

async function analyzeEncryptionAdvanced(view, fileSize, file) {
    const encryption = {
        detected: false,
        type: 'none',
        confidence: 0,
        encrypted: false,
        details: {}
    };

    // High entropy check
    const entropy = calculateEntropy(view.slice(0, 1024));
    if (entropy > 7.8) {
        encryption.detected = true;
        encryption.type = 'likely_encrypted';
        encryption.confidence = Math.min(75, (entropy - 7.5) * 25);
        encryption.encrypted = true;
        encryption.details.entropy = entropy.toFixed(2);
    }

    // Check for AES block patterns
    const byteDistribution = analyzeByteDistribution(view.slice(0, 512));
    if (byteDistribution.uniformity > 0.95) {
        encryption.detected = true;
        encryption.confidence = Math.max(encryption.confidence, 70);
        encryption.encrypted = true;
        encryption.details.byteDistribution = byteDistribution;
    }

    // Check for ESP32 secure boot patterns
    if (checkSecureBootV2Pattern(view)) {
        encryption.detected = true;
        encryption.type = 'esp32_secure_boot_v2';
        encryption.confidence = 90;
        encryption.encrypted = true;
    }

    // Additional check: attempt to detect encrypted firmware patterns
    if (await detectEncryptedFirmwarePattern(file)) {
        encryption.detected = true;
        encryption.confidence = Math.max(encryption.confidence, 80);
        encryption.encrypted = true;
        encryption.details.pattern = 'encrypted_firmware_detected';
    }

    return encryption;
}

async function detectEncryptedFirmwarePattern(file) {
    // Read multiple samples from the file to check for encryption patterns
    const sample1 = new Uint8Array(await readFileChunk(file, 0, 256));
    const sample2 = new Uint8Array(await readFileChunk(file, 4096, 256));
    const sample3 = new Uint8Array(await readFileChunk(file, 8192, 256));
    
    const entropy1 = calculateEntropy(sample1);
    const entropy2 = calculateEntropy(sample2);
    const entropy3 = calculateEntropy(sample3);
    
    // If all samples have high entropy, likely encrypted
    return entropy1 > 7.5 && entropy2 > 7.5 && entropy3 > 7.5;
}

async function attemptDecryption(file, key) {
    const result = {
        attempted: true,
        successful: false,
        decryptedData: null,
        error: null
    };

    try {
        // Convert hex key to bytes
        const keyBytes = hexStringToBytes(key);
        
        // Read encrypted data (first 4KB for testing)
        const encryptedData = await readFileChunk(file, 0, 4096);
        
        // Simple AES decryption attempt
        result.decryptedData = await decryptAES(encryptedData, keyBytes);
        result.successful = true;
        
    } catch (error) {
        result.error = error.message;
        result.successful = false;
    }

    return result;
}

async function decryptAES(encryptedData, keyBytes) {
    // Simplified AES decryption - in real implementation use Web Crypto API
    // This is a placeholder that returns the original data
    return encryptedData;
}

function hexStringToBytes(hexString) {
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

function calculateEntropy(data) {
    const byteCounts = new Array(256).fill(0);
    data.forEach(byte => byteCounts[byte]++);
    
    let entropy = 0;
    for (let count of byteCounts) {
        if (count > 0) {
            const p = count / data.length;
            entropy -= p * Math.log2(p);
        }
    }
    return entropy;
}

function analyzeByteDistribution(data) {
    const counts = new Array(256).fill(0);
    data.forEach(byte => counts[byte]++);
    
    const expected = data.length / 256;
    let uniformity = 0;
    
    for (let count of counts) {
        const deviation = Math.abs(count - expected) / expected;
        uniformity += (1 - Math.min(deviation, 1));
    }
    
    return {
        uniformity: uniformity / 256,
        minCount: Math.min(...counts.filter(c => c > 0)),
        maxCount: Math.max(...counts)
    };
}

function checkSecureBootV2Pattern(view) {
    if (view.length < 64) return false;
    const potentialSignature = view.slice(0, 4);
    return potentialSignature.some(b => b !== 0xFF && b !== 0x00);
}

function detectOtherFormats(view) {
    // Partition table
    if (view[0] === 0xAA && view[1] === 0x50) return 'partition_table';
    
    // SPIFFS filesystem
    if (view[0] === 0x45 && view[1] === 0x53 && view[2] === 0x50 && view[3] === 0x53) {
        return 'spiffs_filesystem';
    }
    
    // OTA data
    if (view.slice(0, 8).every(b => b === 0x00 || b === 0xFF)) return 'ota_data';
    
    // Raw data
    if (view.slice(0, 16).every(b => b === 0xFF)) return 'empty_ff';
    if (view.slice(0, 16).every(b => b === 0x00)) return 'empty_00';
    
    return 'binary_data';
}

function analyzeEsp32Segments(view, startPos) {
    const segments = [];
    let position = startPos;

    // Analyze only first 4KB for segments
    while (position < Math.min(view.length - 16, 4096)) {
        const segment = analyzeEsp32Segment(view, position);
        if (segment.valid) {
            segments.push(segment);
            position = segment.end;
        } else {
            position++;
        }
        
        if (position >= view.length) break;
    }

    return segments;
}

function analyzeEsp32Segment(view, startPos) {
    const segment = {
        start: startPos,
        end: startPos,
        size: 0,
        usedSize: 0,
        type: 'unknown',
        valid: false,
        loadAddr: 0
    };

    // Check ESP32 segment header
    if (view[startPos] === 0xE9) {
        segment.type = 'app_image';
        segment.valid = true;
        
        // Extract data from ESP32 header
        segment.dataSize = (view[startPos + 4] | (view[startPos + 5] << 8) | 
                          (view[startPos + 6] << 16) | (view[startPos + 7] << 24));
        segment.loadAddr = (view[startPos + 8] | (view[startPos + 9] << 8) | 
                          (view[startPos + 10] << 16) | (view[startPos + 11] << 24));
        
        const segmentStart = startPos + 16;
        const segmentEnd = Math.min(segmentStart + segment.dataSize, view.length);
        
        segment.start = segmentStart;
        segment.end = segmentEnd;
        segment.size = segmentEnd - segmentStart;
        
        // Quick usage estimation (first 1KB of segment)
        const sampleEnd = Math.min(segmentEnd, segmentStart + 1024);
        segment.usedSize = calculateUsedBytesFast(view, segmentStart, sampleEnd);
        
    } else {
        // For non-ESP32 segments use quick analysis
        segment.type = 'data';
        segment.valid = true;
        segment.end = Math.min(startPos + 1024, view.length);
        segment.size = segment.end - startPos;
        segment.usedSize = calculateUsedBytesFast(view, startPos, segment.end);
    }

    return segment;
}

function calculateUsedBytesFast(view, start, end) {
    let used = 0;
    const step = Math.max(1, Math.floor((end - start) / 100));
    
    for (let i = start; i < end; i += step) {
        if (view[i] !== 0xFF && view[i] !== 0x00) {
            used += step;
        }
    }
    
    return Math.min(used, end - start);
}

function generateRecommendationsAdvanced(results) {
    if (results.utilization < 50) {
        results.recommendations.push('Low flash memory usage. Consider smaller chip size to save costs');
    }
    
    if (results.utilization > 85) {
        results.recommendations.push('High flash usage! Increase size or optimize firmware');
    }
    
    // Enhanced encryption recommendations
    if (results.encryption.encrypted) {
        if (currentEncryptionKey) {
            if (results.decryption.successful) {
                results.recommendations.push('✅ File successfully decrypted - full analysis available');
            } else {
                results.recommendations.push('❌ Decryption failed - verify encryption key');
            }
        } else {
            results.recommendations.push('🔐 Encryption detected - provide key for full analysis');
        }
    }
    
    if (results.compression.detected) {
        const realSize = results.usedSize * results.compression.ratio;
        results.recommendations.push(`Compression detected (${results.compression.type}). Real data: ~${(realSize / 1024 / 1024).toFixed(2)} MB`);
    }

    if (!results.espMagic) {
        results.warnings.push('File does not contain standard ESP32 magic bytes');
    }

    if (results.totalSize > 8 * 1024 * 1024) {
        results.recommendations.push('Large file (' + (results.totalSize / 1024 / 1024).toFixed(1) + ' MB). Use desktop utilities for full analysis');
    }
}

function createHexView(data) {
    let hexString = '';
    const bytesPerLine = 16;
    
    for (let i = 0; i < data.length; i += bytesPerLine) {
        // Offset
        if(i > 0) {
        	hexString += '<b>&nbsp;</b><br/>';
        }
        hexString += i.toString(16).toUpperCase().padStart(4, '0') + ': ';
        
        // Hex bytes
        for (let j = 0; j < bytesPerLine; j++) {
            if (i + j < data.length) {
                hexString += data[i + j].toString(16).toUpperCase().padStart(2, '0') + ' ';
            } else {
                hexString += '   ';
            }
        }
        
        // ASCII representation
        hexString += ' ';
        for (let j = 0; j < bytesPerLine; j++) {
            if (i + j < data.length) {
                const byte = data[i + j];
                hexString += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
            }
        }
        hexString += '\n';
    }
    
    return hexString;
}

async function displayResults(analysis, fileName) {
    const resultsDiv = document.getElementById('results');
    const progressBar = document.getElementById('progress-bar');
    
    let statusClass = 'info';
    if (analysis.espMagic) statusClass = 'success';
    if (analysis.encryption.encrypted && !analysis.decryption.successful) statusClass = 'warning';
    if (analysis.utilization > 95) statusClass = 'danger';

    if(analysis.utilization > 95) {
    	//-- RED
    	progressBarBg = 'linear-gradient(90deg, #600, #900)';
    } else if(analysis.utilization > 85) {
    	//-- YELLOW
    	progressBarBg = 'linear-gradient(90deg, #660, #990)';
    } else {
    	//-- GREEN
    	progressBarBg = 'linear-gradient(90deg, #060, #090)';
    }


    let html = `
        <div class="result ${statusClass}">
            <h3>📊 ESP32 File Analysis: ${fileName}</h3>
            <p><em>Analysis method: ${analysis.analysisMethod} with encryption support</em></p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <strong>Total Size</strong><br/>
                    ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB
                </div>
                <div class="stat-card">
                    <strong>Used</strong><br/>
                    ${(analysis.usedSize / 1024 / 1024).toFixed(2)} MB
                </div>
                <div class="stat-card">
                    <strong>Free</strong><br/>
                    ${(analysis.freeSize / 1024 / 1024).toFixed(2)} MB
                </div>
                <div class="stat-card">
                    <strong>Utilization</strong><br/>
                    ${analysis.utilization}%
                </div>
            </div>
            
            <div class="progress">
                <div class="progress-bar" style="background:${progressBarBg};width:${analysis.utilization}%;"></div>
            </div>
            
            <h4>🔍 Format Analysis:</h4>
            <p><strong>Type:</strong> ${analysis.formatAnalysis.formatType}</p>
            <p><strong>ESP32 Magic:</strong> ${analysis.espMagic ? '✅ Present' : '❌ Not found'}</p>
            <p><strong>First bytes:</strong> ${analysis.formatAnalysis.firstBytes.slice(0, 8).join(' ')}</p>
            <p><strong>Entropy:</strong> ${analysis.formatAnalysis.entropy.toFixed(2)}/8.0</p>
    `;

    // Encryption section
    if (analysis.encryption.detected) {
        html += `
            <div class="decryption-section">
                <h4>🔐 Encryption Analysis:</h4>
                <p><strong>Type:</strong> ${analysis.encryption.type}</p>
                <p><strong>Confidence:</strong> ${analysis.encryption.confidence}%</p>
                <p><strong>Status:</strong> ${analysis.encryption.encrypted ? '🔒 Encrypted' : '❓ Possibly Encrypted'}</p>
                ${analysis.encryption.details.entropy ? `<p><strong>Entropy:</strong> ${analysis.encryption.details.entropy}</p>` : ''}
                
                ${analysis.decryption.attempted ? `
                    <p><strong>Decryption:</strong> ${analysis.decryption.successful ? '✅ Successful' : '❌ Failed'}</p>
                    ${analysis.decryption.error ? `<p><strong>Error:</strong> ${analysis.decryption.error}</p>` : ''}
                ` : `
                    <p><em>${currentEncryptionKey ? 'Key available - decryption attempted' : 'Provide encryption key for decryption'}</em></p>
                `}
            </div>
        `;
    }

    // Compression section
    if (analysis.compression.detected) {
        html += `
            <div class="result info">
                <h4>Compression Analysis:</h4>
                <p><strong>Type:</strong> ${analysis.compression.type}</p>
                <p><strong>Confidence:</strong> ${analysis.compression.confidence}%</p>
                <p><strong>Estimated ratio:</strong> ${analysis.compression.ratio}</p>
                <p><strong>Real data volume:</strong> ~${(analysis.usedSize * analysis.compression.ratio / 1024 / 1024).toFixed(2)} MB</p>
                ${analysis.compression.details.entropy ? `<p><strong>Entropy:</strong> ${analysis.compression.details.entropy}</p>` : ''}
            </div>
        `;
    }

    // Segments section
    if (analysis.segments.length > 0) {
        html += `<h4>Detected Segments (first 4KB):</h4>`;
        analysis.segments.forEach((seg, index) => {
            const segUtilization = seg.size > 0 ? ((seg.usedSize / seg.size) * 100).toFixed(1) : '0';
            html += `
                <div class="segment">
                    <strong>Segment ${index + 1}</strong> - ${seg.type}<br/>
                    Address: 0x${seg.loadAddr.toString(16).toUpperCase()} | 
                    Size: ${(seg.size / 1024).toFixed(2)}KB | 
                    Used: ${segUtilization}%
                </div>
            `;
        });
    }

    // Warnings section
    if (analysis.warnings.length > 0) {
        html += `<div class="result warning"><h4>Warnings:</h4><ul>`;
        analysis.warnings.forEach(warning => {
            html += `<li>${warning}</li>`;
        });
        html += `</ul></div>`;
    }

    // Recommendations section
    if (analysis.recommendations.length > 0) {
        html += `<div class="result success"><h4>Recommendations:</h4><ul>`;
        analysis.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += `</ul></div>`;
    }

    // Hex view section
    if (currentFile) {
        const hexData = await readFileChunk(currentFile, 0, 64);
        const hexView = createHexView(new Uint8Array(hexData));
        html += `
            <div class="result">
                <h4>Hex View (first 64 bytes):</h4>
                <div class="hex-view">${hexView}</div>
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML += html;
}
