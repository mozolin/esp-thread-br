<?
//-- the best with Html and Css
require("cls/PhpHtmlCssJsMinifier.php");
//-- the best with Js
require("cls/class.JavaScriptPacker.php");

require("cls/cssmin.php");;
require("cls/jsmin.php");


//-- NEW...
require("cls/Minifier.php");

define("TABLE_WIDTH", 54);
define("FIRST_ROW_WIDTH", 19);

$path = "../optimized/components/esp_ot_br_server/frontend/";

$templList = [
	[
		"src" => "templates/index.html_old",
		"dst" => "index.html",
	],
	[
		"src" => "templates/index.html_old",
		"dst" => "index.min.html",
	],
	[
		"src" => "templates/ota.html_old",
		"dst" => "ota.html",
	],
	[
		"src" => "templates/ota.html_old",
		"dst" => "ota.min.html",
	],
	[
		"src" => "templates/index.html",
		"dst" => "index.gzip.html",
	],
	[
		"src" => "templates/ota.html",
		"dst" => "ota.gzip.html",
	],
];

$minList = [
  //-- common
  "static/auth.js"        => "static/auth.min.js",
  "static/auth.css"       => "static/auth.min.css",
  //-- dark theme common
  "static/theme-switch.js" => "static/theme-switch.min.js",
  "static/icons.css"       => "static/icons.min.css",
  "static/gzip-loader.js"  => "static/gzip-loader.min.js",
  
  
  //-- index.html
  //"index.html"             => "index.min.html",
  "static/index.js"        => "static/index.min.js",
  "static/index.css"       => "static/index.min.css",
  //-- dark theme index.html
  "static/index-dark.css"  => "static/index-dark.min.css",
  
  //-- ota.html
  //"ota.html"               => "ota.min.html",
  "static/ota.js"          => "static/ota.min.js",
  "static/ota.css"         => "static/ota.min.css",
  //-- dark theme ota.html
  "static/ota-dark.css"    => "static/ota-dark.min.css",
  
];

ksort($minList);

$minify = new PhpHtmlCssJsMinifier();

echo str_repeat("-", TABLE_WIDTH)."\n";
echo "| File name (.min)".str_repeat(" ", (FIRST_ROW_WIDTH - 15))."|   Source | Minified |   %%   |\n";
echo str_repeat("-", TABLE_WIDTH)."\n";

$flagHtml = true;
foreach($minList as $fileSrc => $fileDst) {
  if(file_exists($path.$fileDst)) {
    @unlink($path.$fileDst);
  }
  if(file_exists($path.$fileSrc)) {
    $contents = file_get_contents($path.$fileSrc);
    $pathInfo = pathinfo($fileSrc);
    
    $flagReady = false;
    if($pathInfo["extension"] === "html") {
      $result = $minify->minify_html($contents);
      $flagReady = true;
      
    }
    if($pathInfo["extension"] === "css") {
      $result = $minify->minify_css($contents);
      $flagReady = true;

      $r = CssMin::minify($contents);
      //file_put_contents($path.$fileDst.'_2', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }
    }
    if($pathInfo["extension"] === "js") {
      //$result = (new JavaScriptPacker($contents, 'Normal', true, false))->pack();
      $result = (new JavaScriptPacker($contents, 'High ASCII', true, false))->pack();
      $flagReady = true;

      
      $r = $minify->minify_js($contents);
      //file_put_contents($path.$fileDst.'_0', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }

      $r = Minifier::minify($contents);
      //file_put_contents($path.$fileDst.'_1', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }

      $r = JSMin::minify($contents);
      //file_put_contents($path.$fileDst.'_2', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }
    }
    if($flagReady) {
      
      file_put_contents($path.$fileDst, $result);

      //-- gzip source file (not minimized!)
      $gZipped = base64_encode(gzencode($contents, 9));
    	$fileDstGzip = str_replace('.min.', '.gzip.', $fileDst);
    	file_put_contents($path.$fileDstGzip, $gZipped);
    	
      if(file_exists($path.$fileDst)) {
        $pathInfo = pathinfo($fileDst);
        
        $fn = str_pad($pathInfo["basename"], FIRST_ROW_WIDTH, " ", STR_PAD_RIGHT);
        $size1 = str_pad(filesize($path.$fileSrc), 8, " ", STR_PAD_LEFT);
        $size2 = str_pad(filesize($path.$fileDst), 8, " ", STR_PAD_LEFT);
        $size3 = str_pad(filesize($path.$fileDstGzip), 8, " ", STR_PAD_LEFT);
        
        /*
        if($flagHtml && $pathInfo["extension"] !== "html") {
        	echo str_repeat("-", TABLE_WIDTH)."\n";
        	$flagHtml = false;
        }
        */

        $compressionRatio = (($size1 - $size3) / $size1) * 100;
        $percent = number_format($compressionRatio, 2, '.', '');
        $percentStr = str_pad($percent, 6, ' ', STR_PAD_LEFT);

        echo "| ".$fn." | ".$size1." | ".$size2." | ".$size3." | ".$percentStr." |\n";
      }
    }
  }
}

echo str_repeat("-", TABLE_WIDTH)."\n";

$r1 = [
	'[START-SRC-SECTION]',
	'[END-SRC-SECTION]',
	'[START-MIN-SECTION]',
	'[END-MIN-SECTION]',
	'[OTA-HTML-LINK]',
	'[INDEX-HTML-LINK]',
	'[START-GZIP-SECTION]',
	'[END-GZIP-SECTION]',
];

$r2src = [
	'',
	'',
	'<!--',
	'-->',
	'ota.html',
	'index.html',
	'',
	'',
];

$r2min = [
	'<!--',
	'-->',
	'',
	'',
	'ota.min.html',
	'index.min.html',
	'',
	'',
];


$r2gzip = [
	'',
	'',
	'',
	'',
	'ota.gzip.html',
	'index.gzip.html',
	'',
	'',
];

foreach($templList as $templItem) {
	$fileSrc = $templItem['src'];
	$fileDst = $templItem['dst'];

	if(file_exists($path.$fileDst)) {
    @unlink($path.$fileDst);
  }
  if(file_exists($path.$fileSrc)) {
		@copy($path.$fileSrc, $path.$fileDst);
		if(file_exists($path.$fileDst)) {
    	$contents = file_get_contents($path.$fileDst);

    	$pathInfo = pathinfo($fileDst);
			$fn = $pathInfo['basename'];
			
			$isMin = preg_match("{(.*?)\.min\.html}", $fn);
			$isGZip = preg_match("{(.*?)\.gzip\.html}", $fn);

			//-- replace template tags
			if($isMin) {
				$contents = str_replace($r1, $r2min, $contents);
			} elseif($isGZip) {
				if(preg_match("{\[START-GZIP-SECTION\](.*)\[END-GZIP-SECTION\]}si", $contents, $m)) {
					$gzipLinks = $m[1];
					$gzipList = explode("\n", $gzipLinks);

					$contents = str_replace($r1, $r2gzip, $contents);

					$idx = 0;
					foreach($gzipList as $gzipItem) {
						$gzipItem = trim($gzipItem);
						if(!empty($gzipItem)) {
							//echo "{$gzipItem}\n";
							if(preg_match("{<(CSS|JS)\=\"/(static/.*?\.gzip\..*?)\">}si", $gzipItem, $v)) {
								$scrFN = $path.$v[2];
								if(file_exists($scrFN)) {
									$s = file_get_contents($scrFN);
									
									$pathInfoScrFN = pathinfo($scrFN);
									$nameScrFN = str_replace('.gzip.', '-', $pathInfoScrFN['basename']);

									if($v[1] == 'CSS') {
										$s = "<style type=\"text/gzip\" id=\"gzip-{$nameScrFN}\">".$s."</style>";
									}
									if($v[1] == 'JS') {
										$s = "<script type=\"text/gzip\" id=\"gzip-{$nameScrFN}\">".$s."</script>";
									}
									$contents = str_replace($gzipItem, $s, $contents);

									$idx++;
								}
							}
						}
					}
					
				}
			} else {
				$contents = str_replace($r1, $r2src, $contents);
			}

			//-- minify html
			$contents = $minify->minify_html($contents);

			//-- save dest file
			file_put_contents($path.$fileDst, $contents);
    }
  }
}


