<?
namespace app\helpers;

class Logs
{
	
	public static function log($data, $fileName='_tmp_.log')
	{
		@ob_start();
		print_r($data);
		$buffer = @ob_get_contents();
		@ob_end_clean();
		
		file_put_contents($fileName, $buffer);
	}

}
