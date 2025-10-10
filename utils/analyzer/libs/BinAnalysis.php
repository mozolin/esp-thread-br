<?
class BinAnalysis
{
	
	static public function detailedBinAnalysis($filePath)
	{
    if (!file_exists($filePath)) {
        return null;
    }
    
    $content = file_get_contents($filePath);
    $size = strlen($content);
    
    // Анализ паттернов данных
    $zeroBlocks = 0;
    $currentZeroBlock = 0;
    $maxZeroBlock = 0;
    
    $nonZeroData = '';
    
    for ($i = 0; $i < $size; $i++) {
        $byte = ord($content[$i]);
        
        if ($byte === 0) {
            $currentZeroBlock++;
        } else {
            if ($currentZeroBlock > 0) {
                $zeroBlocks++;
                if ($currentZeroBlock > $maxZeroBlock) {
                    $maxZeroBlock = $currentZeroBlock;
                }
                $currentZeroBlock = 0;
            }
            $nonZeroData .= $content[$i];
        }
    }
    
    $usedSize = strlen($nonZeroData);
    
    return [
        'file_size_bytes' => $size,
        'used_size_bytes' => $usedSize,
        'wasted_bytes' => $size - $usedSize,
        'efficiency_percent' => round(($usedSize / $size) * 100, 2),
        'zero_blocks_count' => $zeroBlocks,
        'max_zero_block_size' => $maxZeroBlock,
        'used_size_kb' => round($usedSize / 1024, 2),
        'used_size_mb' => round($usedSize / (1024 * 1024), 3)
    ];
	}

	static public function comprehensiveAnalysis($directory)
	{
    $files = [
        'bootloader.bin',
        'esp_ot_br.bin',
        'ota_data_initial.bin',
        'partition-table.bin', 
        'rcp_fw.bin',
        'web_storage.bin'
    ];
    
    $results = [];
    $totalUsed = 0;
    $totalFileSize = 0;
    
    foreach ($files as $file) {
        $filePath = $directory . '/' . $file;
        $analysis = self::detailedBinAnalysis($filePath);
        
        if ($analysis) {
            $results[$file] = $analysis;
            $totalUsed += $analysis['used_size_bytes'];
            $totalFileSize += $analysis['file_size_bytes'];
        }
    }
    
    $results['TOTAL'] = [
        'total_file_size_bytes' => $totalFileSize,
        'total_used_bytes' => $totalUsed,
        'total_wasted_bytes' => $totalFileSize - $totalUsed,
        'overall_efficiency_percent' => round(($totalUsed / $totalFileSize) * 100, 2),
        'total_used_kb' => round($totalUsed / 1024, 2),
        'total_used_mb' => round($totalUsed / (1024 * 1024), 3)
    ];
    
    return $results;
	}


	static public function printAnalysisReport($analysis)
	{
    echo "=== АНАЛИЗ РАЗМЕРОВ BIN-ФАЙЛОВ ESP-IDF ===\n\n";
    
    foreach ($analysis as $filename => $data) {
        if ($filename === 'TOTAL') continue;
        
        echo "Файл: {$filename}\n";
        echo "  Размер файла: " . number_format($data['file_size_bytes']) . " байт\n";
        echo "  Используется: " . number_format($data['used_size_bytes']) . " байт\n";
        echo "  Эффективность: {$data['efficiency_percent']}%\n";
        echo "  Используется: {$data['used_size_kb']} KB\n";
        echo "\n";
    }
    
    if (isset($analysis['TOTAL'])) {
        $total = $analysis['TOTAL'];
        echo "=== ОБЩАЯ СТАТИСТИКА ===\n";
        echo "Общий размер всех файлов: " . number_format($total['total_file_size_bytes']) . " байт\n";
        echo "Общий используемый объем: " . number_format($total['total_used_bytes']) . " байт\n";
        echo "Общая эффективность: {$total['overall_efficiency_percent']}%\n";
        echo "Итого используется: {$total['total_used_kb']} KB ({$total['total_used_mb']} MB)\n";
    }

    echo "\n\n";
	}
}
