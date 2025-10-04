<?
$typeOS = 'unix';
if(strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
  $typeOS = 'windows';
} elseif (PHP_OS_FAMILY === 'Windows') {
  $typeOS = 'windows';
}

if($typeOS === 'windows') {
	$command = "wmic path Win32_PnPEntity where \"ConfigManagerErrorCode = 0 and Caption like '%(COM%)'\" get Caption /value";
} else {
	$command = "ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null";
}
$output = shell_exec($command);


$matches = [];
$matches[0] = [];
$matches[1] = [];
$matches[2] = [];

$comPortList = [];
if($typeOS === 'windows') {
  $utf8Output = mb_convert_encoding($output, "UTF-8", "CP866");
  preg_match_all('/Caption=(.*?)\(COM(\d+)\)/', $utf8Output, $matches);
} else {
  $ports = explode("\n", trim($output));
  $idx = 0;
  foreach($ports as $port) {
    $matches[0][] = $port;
  	$matches[2][] = $port;
    $name = 'COM port';
  	if(strpos($port, "ACM") !== false) {
  	  $name = "USB{$idx} Modem";
  	}
  	if(strpos($port, "USB") !== false) {
  	  $name = "USB{$idx} Converter";
  	}
  	$matches[1][] = $name;
  	$idx++;
  }
}
$comPorts = [];

if(!empty($matches[2])) {
	$numItems = count($matches[2]);
	echo $numItems."<br/>";
	for($i=0;$i<$numItems;$i++) {
		$comPortNum = $matches[2][$i];
		$comPortName = $matches[1][$i];
		$comPorts[$comPortNum] = $comPortName;
	}

	ksort($comPorts);

	?>
	<div id="div-get-esp32-chip-info" name="get-esp32-chip-info">
		<b>Get ESP32 Chip Info</b><br/>
		<div id="div-over-select">
			<select id="select-com-ports-list" class="frm">
				<?
				foreach($comPorts as $comPortNum => $comPortName) {
					if($typeOS === 'windows') {
					  $optStr = "COM{$comPortNum}: {$comPortName}";
						$comPortN = "COM{$comPortNum}";
					} else {
					  $optStr = "{$comPortNum}: {$comPortName}";
					  $comPortN = "{$comPortNum}";
					}
					?>
					<option value="<?=$comPortN?>"><?=$optStr?></option>
					<?
				}
				?>
			</select><button id="button-esptool-flash-id" class="btn btn-primary">Get FlashID</button>
			<div id="div-status"></div>
		</div>
	</div>
	<?
}
