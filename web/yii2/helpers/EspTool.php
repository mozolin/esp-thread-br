<?
namespace app\helpers;

class EspTool
{
	
	public static function getFlashId($comPort)
	{
		$typeOS = 'unix';
		if(strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
		  $typeOS = 'windows';
		} elseif (PHP_OS_FAMILY === 'Windows') {
		  $typeOS = 'windows';
		}
		
		if($typeOS === 'windows') {
			$command = "esptool -p {$comPort} flash-id";
		} else {
			$command = "set_env;esptool.py -p {$comPort} flash_id";
		}
		$output = shell_exec($command);
		
		return $output;
	}

}
