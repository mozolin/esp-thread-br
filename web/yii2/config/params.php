<?php

$_PATH_OTBR_COMPONENTS = __DIR__.'/../../../optimized/components/esp_ot_br_server';
$_PATH_OTBR_EXAMPLE    = __DIR__.'/../../../optimized/examples/basic_thread_border_router';
$_FIRMWARE_BIN_FILES   = [
	'[btl]' => 'bootloader/bootloader.bin',
	'[ptb]' => 'partition_table/partition-table.bin',
	'[odt]' => 'ota_data_initial.bin',
	'[app]' => 'esp_ot_br.bin',
	'[web]' => 'web_storage.bin',
	'[rcp]' => 'rcp_fw.bin',
	'[phy]' => 'phy_multiple_init_data.bin',
];

return [
  'ESP32_CHIP'             => 'ESP32-S3',
  'PATH_ESP_IDF'           => 'D:/Espressif/esp-idf',
  'PATH_OTBR_COMPONENTS'   => $_PATH_OTBR_COMPONENTS,
  'PATH_OTBR_EXAMPLE'      => $_PATH_OTBR_EXAMPLE,
  'FILE_SDKCONFIG'         => 'sdkconfig.defaults',
  'FILE_PARTITIONS'        => 'partitions.csv',
  'FIRMWARE_BIN_FILES'     => $_FIRMWARE_BIN_FILES,
  'PARTITION_TABLE_BUILDS' => [
 		'nvs' => [
	  	'bin'      => '',
	  	'filesize' => '(ceil)((filesize("[btl]")+filesize("[ptb]"))/4096)*4096',
	  ],
	  'otadata' => [
	  	'bin'      => '[odt]',
	  	'filesize' => '',
	  ],
	  'phy_init' => [
	  	'bin'      => '[phy]',
	  	'filesize' => '(ceil)(filesize("[phy]")/4096)*4096',
	  ],
	  'ota_0' => [
	  	'bin'      => '[app]',
	  	'filesize' => '',
	  ],
	  'ota_1' => [
	  	'bin'      => '[app]',
	  	'filesize' => '',
	  ],
	  'web_storage' => [
	  	'bin'      => '[web]',
	  	'filesize' => '',
	  ],
	  'rcp_fw' => [
	  	'bin'      => '[rcp]',
	  	'filesize' => '',
	  ],
	],
  
];
