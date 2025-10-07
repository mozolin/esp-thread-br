const multicastdns = require('multicast-dns');

function discoverThreadDevices() {
    console.log('Starting Thread device discovery...');
    
    const mdns = multicastdns();
    
    mdns.on('response', (response) => {
        console.log('\n=== mDNS Response ===');
        
        // Парсим ответы
        parseAnswers(response.answers);
        parseAdditionals(response.additionals);
    });
    
    // Запрос Thread сервисов
    console.log('Querying for Thread devices...');
    mdns.query('_meshcop._udp.local', 'PTR');
    mdns.query('_services._dns-sd._udp.local', 'PTR');
    
    // Остановка через 30 секунд
    setTimeout(() => {
        console.log('\nDiscovery completed.');
        mdns.destroy();
        process.exit(0);
    }, 30000);
}

function parseAnswers(answers) {
    answers.forEach((answer) => {
        switch(answer.type) {
            case 12: // PTR
                if (answer.name.includes('_meshcop._udp') || 
                    answer.name.includes('_services._dns-sd._udp')) {
                    
                    const name = decodeDNSName(answer.name);
                    const data = decodeDNSName(answer.data);
                    
                    console.log('🎯 PTR Record:');
                    console.log('   Name:', name);
                    console.log('   Points to:', data);
                    console.log('   TTL:', answer.ttl, 'seconds');
                    console.log('   Type: PTR (12)');
                }
                break;
                
            case 16: // TXT
                console.log('📄 TXT Record:');
                console.log('   Name:', decodeDNSName(answer.name));
                const txtRecords = parseTXTRecords(answer.data);
                txtRecords.forEach(record => {
                    console.log('   ', record);
                });
                break;
                
            case 33: // SRV
                console.log('🔧 SRV Record:');
                console.log('   Name:', decodeDNSName(answer.name));
                console.log('   Data:', answer.data);
                if (answer.data) {
                    console.log('   Priority:', answer.data.priority);
                    console.log('   Weight:', answer.data.weight);
                    console.log('   Port:', answer.data.port);
                    console.log('   Target:', decodeDNSName(answer.data.target));
                }
                break;
                
            default:
                // Пропускаем неизвестные типы
                break;
        }
    });
}

function parseAdditionals(additionals) {
    additionals.forEach((additional) => {
        switch(additional.type) {
            case 1: // A (IPv4)
                console.log('🌐 IPv4 Address:');
                console.log('   Name:', decodeDNSName(additional.name));
                console.log('   Address:', additional.data);
                break;
                
            case 28: // AAAA (IPv6)
                console.log('🌐 IPv6 Address:');
                console.log('   Name:', decodeDNSName(additional.name));
                console.log('   Address:', additional.data);
                break;
                
            case 16: // TXT
                const txtRecords = parseTXTRecords(additional.data);
                if (txtRecords.length > 0) {
                    console.log('📄 Additional TXT Records:');
                    txtRecords.forEach(record => {
                        console.log('   ', record);
                    });
                }
                break;
        }
    });
}

function parseTXTRecords(txtData) {
    const records = [];
    
    if (Buffer.isBuffer(txtData)) {
        // Одиночный TXT record как Buffer
        try {
            const text = txtData.toString('utf8');
            records.push(text);
        } catch (e) {
            // Если UTF-8 fails, пробуем другие кодировки
            try {
                const text = txtData.toString('ascii');
                records.push(text);
            } catch (e) {
                console.log('   Could not decode TXT record:', txtData);
            }
        }
    } else if (Array.isArray(txtData)) {
        // Массив TXT records
        txtData.forEach(buffer => {
            if (Buffer.isBuffer(buffer)) {
                try {
                    // Пробуем UTF-8 сначала
                    const text = buffer.toString('utf8');
                    records.push(text);
                } catch (e) {
                    // Затем ASCII
                    try {
                        const text = buffer.toString('ascii');
                        records.push(text);
                    } catch (e) {
                        // Показываем как hex если не декодируется
                        records.push(`[HEX: ${buffer.toString('hex')}]`);
                    }
                }
            }
        });
    }
    
    return records;
}

function decodeDNSName(name) {
    if (typeof name === 'string') {
        return name;
    }
    
    if (Buffer.isBuffer(name)) {
        try {
            return name.toString('utf8');
        } catch (e) {
            try {
                return name.toString('ascii');
            } catch (e) {
                return name.toString('hex');
            }
        }
    }
    
    return String(name);
}

// Функция для детального анализа кодировок
function analyzeEncoding(data, context = '') {
    console.log(`\n🔍 Analysis for ${context}:`);
    
    if (Buffer.isBuffer(data)) {
        console.log('   Type: Buffer');
        console.log('   Length:', data.length, 'bytes');
        console.log('   Hex:', data.toString('hex'));
        
        // Пробуем разные кодировки
        const encodings = ['utf8', 'ascii', 'latin1', 'ucs2'];
        encodings.forEach(encoding => {
            try {
                const decoded = data.toString(encoding);
                // Проверяем на печатные символы
                if (/^[\x20-\x7E]*$/.test(decoded)) {
                    console.log(`   ${encoding.toUpperCase()}: "${decoded}"`);
                }
            } catch (e) {
                console.log(`   ${encoding.toUpperCase()}: <decode error>`);
            }
        });
    } else if (typeof data === 'string') {
        console.log('   Type: String');
        console.log('   Value:', data);
    } else {
        console.log('   Type:', typeof data);
        console.log('   Value:', data);
    }
}

// Расширенная версия с анализом кодировок
function discoverWithEncodingAnalysis() {
    console.log('Starting Thread device discovery with encoding analysis...');
    
    const mdns = multicastdns();
    
    mdns.on('response', (response) => {
        console.log('\n' + '='.repeat(50));
        console.log('mDNS RESPONSE ANALYSIS');
        console.log('='.repeat(50));
        
        // Анализ структуры ответа
        analyzeEncoding(response, 'Full response structure');
        
        // Детальный анализ каждого ответа
        response.answers.forEach((answer, index) => {
            console.log(`\n--- Answer ${index + 1} ---`);
            analyzeEncoding(answer.name, `Answer ${index + 1} Name`);
            console.log('   Type:', answer.type, getTypeName(answer.type));
            console.log('   Class:', answer.class);
            console.log('   TTL:', answer.ttl);
            analyzeEncoding(answer.data, `Answer ${index + 1} Data`);
        });
        
        // Анализ дополнительных записей
        response.additionals.forEach((additional, index) => {
            console.log(`\n--- Additional ${index + 1} ---`);
            analyzeEncoding(additional.name, `Additional ${index + 1} Name`);
            console.log('   Type:', additional.type, getTypeName(additional.type));
            analyzeEncoding(additional.data, `Additional ${index + 1} Data`);
        });
    });
    
    mdns.query('_meshcop._udp.local', 'PTR');
    
    setTimeout(() => {
        console.log('\nDiscovery completed.');
        mdns.destroy();
        process.exit(0);
    }, 30000);
}

function getTypeName(type) {
    const types = {
        1: 'A',
        12: 'PTR', 
        16: 'TXT',
        28: 'AAAA',
        33: 'SRV'
    };
    return types[type] || `UNKNOWN (${type})`;
}

// Выберите одну из функций для запуска:
// discoverThreadDevices(); // Базовая версия
discoverWithEncodingAnalysis(); // Версия с анализом кодировок