<?
class SpiffsAnalysis
{
	static public function analyzeSpiffsContent($webStoragePath) {
    if (!is_dir($webStoragePath)) {
        return "Папка не найдена: $webStoragePath";
    }
    
    $totalSize = 0;
    $fileCount = 0;
    $fileSizes = [];
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($webStoragePath, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $size = $file->getSize();
            $totalSize += $size;
            $fileCount++;
            $fileSizes[] = [
                'name' => $file->getPathname(),
                'size' => $size
            ];
        }
    }
    
    return [
        'total_files' => $fileCount,
        'total_source_size' => $totalSize,
        'total_source_kb' => round($totalSize / 1024, 2),
        'files' => $fileSizes
    ];
	}

	static public function analyzeSpiffsStructure($filePath) {
    $content = file_get_contents($filePath);
    $size = strlen($content);
    
    // Анализ паттернов SPIFFS
    $analysis = [
        'file_size' => $size,
        'spiffs_headers' => 0,
        'page_headers' => 0,
        'object_headers' => 0,
        'free_space' => 0,
        'used_space' => 0
    ];
    
    // Ищем признаки структуры SPIFFS
    $pos = 0;
    while ($pos < $size) {
        // Проверяем возможные заголовки SPIFFS
        if ($pos + 8 < $size) {
            $magic = substr($content, $pos, 4);
            
            // Возможные сигнатуры SPIFFS
            if ($magic === "SPI\xFF") {
                $analysis['spiffs_headers']++;
            }
            
            // Анализ паттернов (упрощенно)
            $byte = ord($content[$pos]);
            if ($byte === 0xFF || $byte === 0x00) {
                $analysis['free_space']++;
            } else {
                $analysis['used_space']++;
            }
        }
        $pos++;
    }
    
    return $analysis;
	}
}
