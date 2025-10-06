<?
class SpiffsAnalyzer
{
  private function detectSpiffsVersion($content) {
      // Проверяем различные сигнатуры SPIFFS
      $signatures = [
          "SPIFFS" => "SPIFFS",
          "SPI\xFF" => "SPIFFS Magic",
          "\x50\x46\x53" => "PFS" // Possible SPIFFS variant
      ];
      
      foreach ($signatures as $sig => $desc) {
          if (strpos($content, $sig) !== false) {
              return $desc;
          }
      }
      return "Unknown";
  }
  
  private function analyzeSpiffsMetadata($content, $fileSize) {
      $analysis = [
          'total_size' => $fileSize,
          'estimated_file_data' => 0,
          'estimated_metadata' => 0,
          'estimated_free_space' => 0,
          'spiffs_structures' => [],
          'file_count_estimate' => 0
      ];
      
      $pos = 0;
      $blockSize = 4096; // Типичный размер блока SPIFFS
      $fileDataMarkers = 0;
      $metadataMarkers = 0;
      
      // Анализируем по блокам
      for ($block = 0; $block < $fileSize / $blockSize; $block++) {
          $blockStart = $block * $blockSize;
          $blockData = substr($content, $blockStart, min($blockSize, $fileSize - $blockStart));
          
          $blockAnalysis = $this->analyzeBlock($blockData, $blockStart);
          
          if ($blockAnalysis['type'] === 'file_data') {
              $fileDataMarkers += $blockAnalysis['confidence'];
              $analysis['estimated_file_data'] += $blockSize;
          } elseif ($blockAnalysis['type'] === 'metadata') {
              $metadataMarkers += $blockAnalysis['confidence'];
              $analysis['estimated_metadata'] += $blockSize;
          }
      }
      
      // Более точная оценка на основе эвристик
      $analysis = $this->refineEstimation($analysis, $content, $fileDataMarkers, $metadataMarkers);
      
      return $analysis;
  }
  
  private function analyzeBlock($blockData, $offset) {
      $size = strlen($blockData);
      $zeroCount = substr_count($blockData, "\0");
      $ffCount = substr_count($blockData, "\xFF");
      
      // Эвристики для определения типа блока
      if ($zeroCount > $size * 0.9 || $ffCount > $size * 0.9) {
          return ['type' => 'free_space', 'confidence' => 0.9];
      }
      
      // Проверяем на структурированные данные (возможно файлы)
      $entropy = $this->calculateEntropy($blockData);
      if ($entropy > 6.5) { // Высокая энтропия = вероятно данные файлов
          return ['type' => 'file_data', 'confidence' => 0.7];
      }
      
      // Проверяем на повторяющиеся паттерны (метаданные)
      if ($this->hasRepeatedPatterns($blockData)) {
          return ['type' => 'metadata', 'confidence' => 0.8];
      }
      
      return ['type' => 'unknown', 'confidence' => 0.5];
  }
  
  private function calculateEntropy($data) {
      $entropy = 0;
      $size = strlen($data);
      $frequencies = count_chars($data, 1);
      
      foreach ($frequencies as $freq) {
          $p = $freq / $size;
          $entropy -= $p * log($p, 2);
      }
      
      return $entropy;
  }
  
  private function hasRepeatedPatterns($data) {
      // Ищем повторяющиеся 4-байтные паттерны
      $patterns = [];
      for ($i = 0; $i < strlen($data) - 4; $i += 4) {
          $pattern = substr($data, $i, 4);
          if (isset($patterns[$pattern])) {
              return true;
          }
          $patterns[$pattern] = true;
      }
      return false;
  }
  
  private function refineEstimation($analysis, $content, $fileMarkers, $metaMarkers) {
      $totalMarkers = $fileMarkers + $metaMarkers;
      
      if ($totalMarkers > 0) {
          $fileRatio = $fileMarkers / $totalMarkers;
          $metaRatio = $metaMarkers / $totalMarkers;
          
          $analysis['estimated_file_data'] = round($analysis['total_size'] * $fileRatio);
          $analysis['estimated_metadata'] = round($analysis['total_size'] * $metaRatio);
      }
      
      $analysis['estimated_free_space'] = $analysis['total_size'] - 
                                        $analysis['estimated_file_data'] - 
                                        $analysis['estimated_metadata'];
      
      // Оценка количества файлов (очень приблизительно)
      $analysis['file_count_estimate'] = max(1, round($analysis['estimated_metadata'] / 512));
      
      return $analysis;
  }
  
  public function comprehensiveAnalysis($filePath) {
      if (!file_exists($filePath)) {
          return ['error' => "File not found: $filePath"];
      }
      
      $content = file_get_contents($filePath);
      $fileSize = strlen($content);
      
      $analysis = [
          'basic_info' => [
              'file_size_bytes' => $fileSize,
              'file_size_kb' => round($fileSize / 1024, 2),
              'file_size_mb' => round($fileSize / (1024 * 1024), 3),
              'spiffs_version' => $this->detectSpiffsVersion($content)
          ],
          'detailed_analysis' => $this->analyzeSpiffsMetadata($content, $fileSize),
          'raw_analysis' => $this->rawDataAnalysis($content)
      ];
      
      return $analysis;
  }
  
  private function rawDataAnalysis($content) {
      $size = strlen($content);
      $zeroBytes = substr_count($content, "\0");
      $ffBytes = substr_count($content, "\xFF");
      
      return [
          'total_bytes' => $size,
          'zero_bytes' => $zeroBytes,
          'ff_bytes' => $ffBytes,
          'non_zero_non_ff_bytes' => $size - $zeroBytes - $ffBytes,
          'zero_percent' => round(($zeroBytes / $size) * 100, 2),
          'ff_percent' => round(($ffBytes / $size) * 100, 2),
          'data_percent' => round((($size - $zeroBytes - $ffBytes) / $size) * 100, 2)
      ];
  }
}
