<?
namespace app\helpers;

class Settings
{
	public static $_ESP32_CHIP;
	public static $_PATH_ESP_IDF;

	private static $_PATH_OTBR_COMPONENTS;
	private static $_PATH_OTBR_EXAMPLE;
	
	public static $_FILE_SDKCONFIG;
	public static $_FILE_SDKCONFIG_DEFAULTS;

	public static $SWITCHABLE_SECTIONS = 'CONFIG_SWITCHABLE_SECTIONS_';

	public static $_FILE_PARTITIONS;
	public static $_FILE_PARTITIONS_CSV;
	public static $_FILE_CMAKE_TXT;

	public static $_PATH_OTBR_EXAMPLE_BUILD;

	public static $_FIRMWARE_BIN_FILES;
	public static $_PARTITION_TABLE_BUILDS;


	public static function _init()
	{
		self::$_ESP32_CHIP = \Yii::$app->params["ESP32_CHIP"];
		self::$_PATH_ESP_IDF = \Yii::$app->params["PATH_ESP_IDF"];
		
		self::$_PATH_OTBR_COMPONENTS = \Yii::$app->params["PATH_OTBR_COMPONENTS"];
		self::$_PATH_OTBR_EXAMPLE = \Yii::$app->params["PATH_OTBR_EXAMPLE"];
		self::$_FILE_SDKCONFIG = \Yii::$app->params["FILE_SDKCONFIG"];
		self::$_FILE_SDKCONFIG_DEFAULTS = self::$_PATH_OTBR_EXAMPLE.'/'.self::$_FILE_SDKCONFIG;

		self::$_FILE_PARTITIONS = \Yii::$app->params["FILE_PARTITIONS"];
		self::$_FILE_PARTITIONS_CSV = self::$_PATH_OTBR_EXAMPLE.'/'.self::$_FILE_PARTITIONS;

		self::$_FILE_CMAKE_TXT = self::$_PATH_OTBR_EXAMPLE.'/CMakeLists.txt';
		self::$_PATH_OTBR_EXAMPLE_BUILD = self::$_PATH_OTBR_EXAMPLE.'/build';

		self::$_FIRMWARE_BIN_FILES = \Yii::$app->params["FIRMWARE_BIN_FILES"];
		
		self::$_PARTITION_TABLE_BUILDS = \Yii::$app->params["PARTITION_TABLE_BUILDS"];
		//-- add path to the PHY bin-file
		$esp32Chip = strtolower(str_replace('-', '', Settings::$_ESP32_CHIP));
		$phyBinFN = str_replace('\\', '/', realpath(Settings::$_PATH_ESP_IDF.'/components/esp_phy/'.$esp32Chip)).'/phy_multiple_init_data.bin';
		if(file_exists($phyBinFN)) {
			self::$_PARTITION_TABLE_BUILDS['phy_init'] = [
				'bin'      => '[phy]',
	  		'filesize' => '(ceil)(filesize("'.$phyBinFN.'")/4096)*4096',
			];
			self::$_FIRMWARE_BIN_FILES['[phy]'] = $phyBinFN;
		}
	}

}
