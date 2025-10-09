<?
use app\helpers\PartitionsCsv;
use app\helpers\Settings;

Settings::_init();

$data = PartitionsCsv::getPartitionsCsvInfo();

$projectName = '';

$cMakeTxt = file(Settings::$_FILE_CMAKE_TXT);
foreach($cMakeTxt as $row) {
	$row = trim($row);
	if(preg_match("{project\((.*?)\)}si", $row, $m)) {
		$projectName = trim($m[1]);
		break;
	}
}
$ptTitle = 'Partitions Info';
$binSize = 0;
$binTitle = '';
if(!empty($projectName)) {
	$ptTitle .= ". Project \"{$projectName}\"";
	$binFile = Settings::$_PATH_OTBR_EXAMPLE_BUILD.'/'.$projectName.'.bin';
	if(file_exists($binFile)) {
		$binSize = filesize($binFile);
		$binTitle .= "Firmware ".$projectName.'.bin: <i>'.$binSize."</i> bytes<br/>";
	}
}

$fwBins = '';
$firmwareBinFiles = Settings::$_FIRMWARE_BIN_FILES;
$partitionTableBuilds = Settings::$_PARTITION_TABLE_BUILDS;
foreach(array_values($firmwareBinFiles) as $fwBinFile) {
	$fwF = Settings::$_PATH_OTBR_EXAMPLE_BUILD.'/'.$fwBinFile;
	$pathInfo = pathinfo($fwBinFile);
	
	$flagShow = false;
	$tblFN = '';
	$tblFS = '';
	if(file_exists($fwF)) {
		//$tblFN = $fwBinFile;
		$tblFN = $pathInfo['basename'];
		$tblFS = filesize($fwF);
		$flagShow = true;
	} elseif(substr($pathInfo['basename'], 0, 3) === 'phy' && file_exists($fwBinFile)) {
		$tblFN = $pathInfo['basename'];
		$tblFS = filesize($fwBinFile);
		$flagShow = true;
	}
	if($flagShow) {
		$fwBins .= '<tr style="background-color:var(--bs-light);color:var(--bs-dark);"><td>'.$tblFN.'</td><td align="right">'.$tblFS.'</td></tr>';
	}
}
if(!empty($fwBins)) {
	$fwBins = '<table cellpadding="5px" style="padding:0;margin:0;">'.$fwBins.'</table>';
}
?>

<div id="div-get-partitions-info" name="div-get-partitions-info">
	<b><?=$ptTitle?></b>
	
	<div class="div10"></div>

	<div id="div-over-partitions">
		<table cellpadding="5px" style="padding:0;margin:0;" id="table-partitions">
			<tr>
			  <th>&nbsp;</th>
			  <th>name</th>
			  <th>type</th>
			  <th>subtype</th>
			  <th>size</th>
			  <th>bytes</th>
			  <!--
			  <th>.bin 4K</th>
			  -->
			  <th>.bin</th>
			  <th>used</th>
			</tr>
			<?
			$idx = 0;
			foreach($data['table'] as $row) {
				$cls = ($idx % 2 === 0) ? 'tr1' : 'tr2';
				$cls = 'tr1';
				$isOTA = preg_match("{ota_\d+}si", $row['name']);

				$partitionSize = $row['sizeBytes'];

				$freeSizeStr = "";
				
				$firstCol = '&nbsp;';
				if($isOTA) {
					$checked = ' checked';
					if(substr($row['name'], 0, 1) === '#') {
						$checked = '';
						$row['name'] = substr($row['name'], 1);
						$cls .= ' unchecked';
					} else {
						$cls .= ' checked';
					}
					
					$firstCol = "<input type=\"checkbox\" class=\"checkbox-ota-input\" name=\"{$row['name']}\" value=\"{$partitionSize}\"{$checked}/>";
					
					if($binSize > 0) {
						$freeBytes = $partitionSize - $binSize;
						$freePercent = number_format(($freeBytes * 100) / $partitionSize, 1, '.', '');
					  
						$freeSizeStr = "<b>".$freePercent."%</b>";
					}
				}

				//-- try to get real bin-files
				$realFileSize4K = 0;
				$k = $row['name'];
				if(array_key_exists($k, $partitionTableBuilds)) {
					$ptRow = $partitionTableBuilds[$k];
					$ptBin = $ptRow['bin'];
					$ptFS4K = $ptRow['filesize4k'];
					$ptFS = $ptRow['filesize'];

					//echo "{$ptBin}|{$ptFS4K}<hr/>";

					//-- use this file as is && exists in FIRMWARE_BIN_FILES list
					if(!empty($ptBin) && $ptFS4K === '' && !empty($firmwareBinFiles[$ptBin])) {
						//echo "1) $ptBin<br/>";
						$fwBinFile = $firmwareBinFiles[$ptBin];
						$fwF = Settings::$_PATH_OTBR_EXAMPLE_BUILD.'/'.$fwBinFile;
						if(file_exists($fwF)) {
							$realFileSize4K = filesize($fwF);
							$realFileSize = filesize($fwF);
						}
					//-- try to parse and execute the 'filesize' formula
					} elseif(!empty($ptFS4K)) {
						
						//-- 4kB-blocks filesize
						//$realFileSize4K = evalFileData($ptFS4K);
						
						//-- original filesize
						$realFileSize = evalFileData($ptFS);
					}
				}
				?>
				<tr class="<?=$cls?>">
				  <td><?=$firstCol?></td>
				  <td><?=$row['name']?></td>
				  <td class="tdc"><?=$row['type']?></td>
				  <td class="tdc"><?=$row['subtype']?></td>
				  <td class="tdr"><?=$row['size']?></td>
				  <td class="tdr"><?=$partitionSize?></td>
				  <?/*?>
				  <td class="tdr extra">
				  	<?
					  if(!empty($realFileSize4K)) {
				  		echo $realFileSize4K;
				  	}
				  	?>
				  </td>
				  <?*/?>
				  <td class="tdr extra">
				  	<?
					  if(!empty($realFileSize)) {
				  		echo $realFileSize;
				  	}
				  	?>
				  </td>
				  <td class="tdr extra">
				  	<?
				  	if(!empty($partitionSize) && !empty($realFileSize)) {
							$freeBytes = $partitionSize - $realFileSize;
							$freePercent = number_format(100 - ($freeBytes * 100) / $partitionSize, 1, '.', '');
							
							$freeSizeStr = $freePercent."%";
						}
				  	?>
				  	<?=$freeSizeStr?>
				  </td>
				</tr>
				<?
				$idx++;
			}
			?>
			<tr>
				<th colspan="5">Total size:</th>
				<th class="tdr" id="th-partitions-total-size"><?=$data['total-size']?></th>
				<th colspan="2"></th>
			</tr>
		</table>
	</div>

	<div class="div10"></div>
	<b>List of Firmware Files</b>
	<div class="div10"></div>
	<?=$fwBins?>

</div>

<?
function evalFileData($ptFS)
{
	$firmwareBinFiles = Settings::$_FIRMWARE_BIN_FILES;

	$resultFS = 0;	

	$strEval = '';
	if(preg_match_all("{filesize\(\"(.*?)\"\)}si", $ptFS, $m)) {
		$strEval = $ptFS;
		foreach($m[1] as $key) {
			if(!empty($firmwareBinFiles[$key])) {
				$fwBinFile = $firmwareBinFiles[$key];
				//-- we need "realpath" to execute @eval() correctly
				$fwF = str_replace('\\', '/', realpath(Settings::$_PATH_OTBR_EXAMPLE_BUILD)).'/'.$fwBinFile;
				if(!file_exists($fwF)) {
					//-- we must cancel parsing if at least one of the files is not found
					$strEval = '';
					break;
				} else {
					$strEval = str_replace($key, $fwF, $strEval);
				}
			}
		}
	}
	if(!empty($strEval)) {
		$strEval = "\$resultFS = ".$strEval.";";
		//-- try to get the result @eval()
		@eval($strEval);
		if(!empty($resultFS)) {
			$realFileSize = $resultFS;
		}
	}
	return $resultFS;
}
