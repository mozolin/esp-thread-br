<?

require("libs/BinAnalysis.php");
require("libs/SpiffsAnalysis.php");

$webStoragePath = "../optimized/components/esp_ot_br_server/frontend";
$sourceAnalysis = SpiffsAnalysis::analyzeSpiffsContent($webStoragePath);

// Анализ бинарного файла 1
$binAnalysis = BinAnalysis::detailedBinAnalysis('./bin/esp_ot_br/web_storage.bin');

echo "=== АНАЛИЗ SPIFFS #1 ===\n";
echo "Исходные файлы: {$sourceAnalysis['total_source_kb']} KB\n";
echo "Бинарный файл: {$binAnalysis['used_size_kb']} KB\n";
echo "Накладные расходы SPIFFS: " . 
     round(($binAnalysis['used_size_bytes'] - $sourceAnalysis['total_source_size']) / 1024, 2) . " KB\n";

// Анализ бинарного файла 2
$binAnalysis = BinAnalysis::detailedBinAnalysis('./bin/esp_ot_br_ext/web_storage.bin');

echo "=== АНАЛИЗ SPIFFS #2 ===\n";
echo "Исходные файлы: {$sourceAnalysis['total_source_kb']} KB\n";
echo "Бинарный файл: {$binAnalysis['used_size_kb']} KB\n";
echo "Накладные расходы SPIFFS: " . 
     round(($binAnalysis['used_size_bytes'] - $sourceAnalysis['total_source_size']) / 1024, 2) . " KB\n";

function compareSpiffsVersions($file1, $file2) {
    $analysis1 = SpiffsAnalysis::analyzeSpiffsStructure($file1);
    $analysis2 = SpiffsAnalysis::analyzeSpiffsStructure($file2);
    
    echo "=== СРАВНЕНИЕ SPIFFS ===\n";
    echo "Версия 1MB:\n";
    print_r($analysis1);
    echo "Версия 1200KB:\n"; 
    print_r($analysis2);
    
    $used_diff = $analysis2['used_space'] - $analysis1['used_space'];
    echo "Разница в используемом пространстве: " . number_format($used_diff) . " байт\n";
}

echo "\n\n";

// Сравниваем две версии
compareSpiffsVersions(
    './bin/esp_ot_br/web_storage.bin',
    './bin/esp_ot_br_ext/web_storage.bin'
);
