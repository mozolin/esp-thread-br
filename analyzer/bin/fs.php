<?

$fn = '';
if(!empty($argv[1])) {
	$fn = $argv[1];
} else {
	echo 'file is not found!';
	exit;
}
echo filesize($fn) / 1024 / 1024;
