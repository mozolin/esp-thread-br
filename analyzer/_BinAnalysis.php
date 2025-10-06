<?

require('libs/BinAnalysis.php');

// Полный пример использования
$directory = './bin/esp_ot_br/';
$analysis = BinAnalysis::comprehensiveAnalysis($directory);
BinAnalysis::printAnalysisReport($analysis);

// Полный пример использования
$directory = './bin/esp_ot_br_ext/';
$analysis = BinAnalysis::comprehensiveAnalysis($directory);
BinAnalysis::printAnalysisReport($analysis);
