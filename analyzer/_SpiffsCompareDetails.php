<?

require("libs/SpiffsAnalyzer.php");

// Функция для красивого вывода
function printSpiffsComparison($file1, $file2)
{
    $analyzer = new SpiffsAnalyzer();
    
    $analysis1 = $analyzer->comprehensiveAnalysis($file1);
    $analysis2 = $analyzer->comprehensiveAnalysis($file2);
    
    echo "=== ДЕТАЛЬНОЕ СРАВНЕНИЕ SPIFFS ===\n\n";
    
    echo "ФАЙЛ 1: " . basename($file1) . " ({$analysis1['basic_info']['file_size_kb']} KB)\n";
    printAnalysis($analysis1);
    
    echo "\n" . str_repeat("-", 60) . "\n\n";
    
    echo "ФАЙЛ 2: " . basename($file2) . " ({$analysis2['basic_info']['file_size_kb']} KB)\n";
    printAnalysis($analysis2);
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "РАЗНИЦА:\n";
    printDifference($analysis1, $analysis2);
}

function printAnalysis($analysis)
{
    if (isset($analysis['error'])) {
        echo "Ошибка: {$analysis['error']}\n";
        return;
    }
    
    $det = $analysis['detailed_analysis'];
    $raw = $analysis['raw_analysis'];
    
    echo "Общий размер: " . number_format($analysis['basic_info']['file_size_bytes']) . " байт\n";
    echo "Версия SPIFFS: {$analysis['basic_info']['spiffs_version']}\n\n";
    
    echo "РАСПРЕДЕЛЕНИЕ ПРОСТРАНСТВА:\n";
      echo "┌────────────────────────┬─────────────┬──────────┐\n";
      echo "│ Тип данных             │ Байт        │ Процент  │\n";
      echo "├────────────────────────┼─────────────┼──────────┤\n";
    printf("│ Данные файлов          │ %11s │ %7s%% │\n", 
        number_format($det['estimated_file_data']),
        round(($det['estimated_file_data'] / $det['total_size']) * 100, 1)
    );
    printf("│ Метаданные SPIFFS      │ %11s │ %7s%% │\n",
        number_format($det['estimated_metadata']),
        round(($det['estimated_metadata'] / $det['total_size']) * 100, 1)
    );
    printf("│ Свободное пространство │ %11s │ %7s%% │\n",
        number_format($det['estimated_free_space']),
        round(($det['estimated_free_space'] / $det['total_size']) * 100, 1)
    );
      echo "└────────────────────────┴─────────────┴──────────┘\n";
    
    echo "\nСЫРЫЕ ДАННЫЕ:\n";
    echo "Нулевые байты: {$raw['zero_percent']}% ({$raw['zero_bytes']} байт)\n";
    echo "0xFF байты: {$raw['ff_percent']}% ({$raw['ff_bytes']} байт)\n";
    echo "Данные: {$raw['data_percent']}% ({$raw['non_zero_non_ff_bytes']} байт)\n";
}

function printDifference($analysis1, $analysis2)
{
    $det1 = $analysis1['detailed_analysis'];
    $det2 = $analysis2['detailed_analysis'];
    
    $fileDataDiff = $det2['estimated_file_data'] - $det1['estimated_file_data'];
    $metadataDiff = $det2['estimated_metadata'] - $det1['estimated_metadata'];
    $freeSpaceDiff = $det2['estimated_free_space'] - $det1['estimated_free_space'];
    
    echo "Данные файлов: " . ($fileDataDiff >= 0 ? "+" : "") . number_format($fileDataDiff) . " байт\n";
    echo "Метаданные: " . ($metadataDiff >= 0 ? "+" : "") . number_format($metadataDiff) . " байт\n";
    echo "Свободное пространство: " . ($freeSpaceDiff >= 0 ? "+" : "") . number_format($freeSpaceDiff) . " байт\n";
}

// Использование
printSpiffsComparison(
    './bin/esp_ot_br/web_storage.bin',
    './bin/esp_ot_br_ext/web_storage.bin'
);
