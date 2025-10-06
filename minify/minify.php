<?
//-- the best with Html and Css
require("cls/PhpHtmlCssJsMinifier.php");
//-- the best with Js
require("cls/class.JavaScriptPacker.php");

require("cls/cssmin.php");;
require("cls/jsmin.php");


//-- NEW...
require("cls/Minifier.php");

//-- Creates only GZipped files, renames output *.gzip.html to *.gzip.html
define("OUTPUT_GZIP_HTML", true);
define("TABLE_WIDTH", 65);
define("FIRST_ROW_WIDTH", 19);

$pathDst = "../optimized/components/esp_ot_br_server/frontend/";
$pathSrc = "../optimized/components/esp_ot_br_server/frontend_src/";

//-- List of templates and output files
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

//-- List of only GZipped files, that will be renamed from *.gzip.html to *.gzip.html when output
if(OUTPUT_GZIP_HTML) {
	$templList = [
		[
			"src" => "templates/index.html",
			"dst" => "index.gzip.html",
		],
		[
			"src" => "templates/ota.html",
			"dst" => "ota.gzip.html",
		],
	];
}

//-- List of files to minify
$minList = [
  //-- common
  "static/auth.js"          => "static/auth.min.js",
  "static/auth.css"         => "static/auth.min.css",
  //-- dark theme common
  "static/theme-switch.js"  => "static/theme-switch.min.js",
  "static/icons.css"        => "static/icons.min.css",
  "static/_gzip-loader.js"  => "static/_gzip-loader.min.js",
  
  //-- index.html
  "static/index.js"         => "static/index.min.js",
  "static/index.css"        => "static/index.min.css",
  //-- dark theme index.html
  "static/index-dark.css"   => "static/index-dark.min.css",
  
  //-- ota.html
  "static/ota.js"           => "static/ota.min.js",
  "static/ota.css"          => "static/ota.min.css",
  //-- dark theme ota.html
  "static/ota-dark.css"     => "static/ota-dark.min.css",
  
];

//-- List of scripts, that do not change their data and names
$reqList = [
	"static/_gzip-loader.min.js",
];

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
	OUTPUT_GZIP_HTML ? 'ota.html' : 'ota.gzip.html',
	OUTPUT_GZIP_HTML ? 'index.html' : 'index.gzip.html',
	'',
	'',
];


ksort($minList);

$minify = new PhpHtmlCssJsMinifier();

echo str_repeat("-", TABLE_WIDTH)."\n";
echo "| File name (.min)".str_repeat(" ", (FIRST_ROW_WIDTH - 15))."|   Source | Minified |  GZipped |   %%   |\n";
echo str_repeat("-", TABLE_WIDTH)."\n";

$flagHtml = true;
foreach($minList as $fileSrc => $fileDst) {
  if(file_exists($pathDst.$fileDst)) {
    @unlink($pathDst.$fileDst);
  }
  if(file_exists($pathSrc.$fileSrc)) {
    $contents = file_get_contents($pathSrc.$fileSrc);
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
      //file_put_contents($pathDst.$fileDst.'_2', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }
    }
    if($pathInfo["extension"] === "js") {
      $result = (new JavaScriptPacker($contents, 'Normal', true, false))->pack();
      //$result = (new JavaScriptPacker($contents, 'High ASCII', true, false))->pack();
      $flagReady = true;

      $r = $minify->minify_js($contents);
      //file_put_contents($pathDst.$fileDst.'_0', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }

      $r = Minifier::minify($contents);
      //file_put_contents($pathDst.$fileDst.'_1', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }

      $r = JSMin::minify($contents);
      //file_put_contents($pathDst.$fileDst.'_2', $r);
      if(strlen($r) < strlen($result)) {
      	$result = $r;
      }
    }
    if($flagReady) {
      
      $isRequired = in_array($fileDst, $reqList);
     	if(!OUTPUT_GZIP_HTML || $isRequired) {
      	echo "Saved #1: ".$fileDst."\n";
      	file_put_contents($pathDst.$fileDst, $result);
      }

      
      //-- gzip source file (not minimized!)
      $gZipped = base64_encode(gzencode($contents, 9));
    	$fileDstGzip = str_replace('.min.', '.gzip.', $fileDst);
    	if(!$isRequired) {
    		echo "Saved #2: ".$fileDst."\n";
    		file_put_contents($pathDst.$fileDstGzip, $gZipped);
    	}
    	
      if(file_exists($pathDst.$fileDst) || file_exists($pathDst.$fileDstGzip)) {
        $pathInfo = pathinfo($fileDst);
        
        $fn = str_pad($pathInfo["basename"], FIRST_ROW_WIDTH, " ", STR_PAD_RIGHT);
        $size1 = str_pad((int)@filesize($pathSrc.$fileSrc), 8, " ", STR_PAD_LEFT);
        $size2 = str_pad((int)@filesize($pathDst.$fileDst), 8, " ", STR_PAD_LEFT);
        $size3 = str_pad((int)@filesize($pathDst.$fileDstGzip), 8, " ", STR_PAD_LEFT);
        
        /*
        if($flagHtml && $pathInfo["extension"] !== "html") {
        	echo str_repeat("-", TABLE_WIDTH)."\n";
        	$flagHtml = false;
        }
        */

        
        if($size3 > 0) {
        	$compressionRatio = (($size1 - $size3) / $size1) * 100;
        } else {
        	$compressionRatio = (($size1 - $size2) / $size1) * 100;
        }
        $percent = number_format($compressionRatio, 2, '.', '');
        $percentStr = str_pad($percent, 6, ' ', STR_PAD_LEFT);

        echo "| ".$fn." | ".$size1." | ".$size2." | ".$size3." | ".$percentStr." |\n";
      }
    }
  }
}

echo str_repeat("-", TABLE_WIDTH)."\n";

foreach($templList as $templItem) {
	$fileSrc = $templItem['src'];
	$fileDst = $templItem['dst'];

	if(file_exists($pathDst.$fileDst)) {
    @unlink($pathDst.$fileDst);
  }
  //-- check template
  if(file_exists($pathSrc.$fileSrc)) {
    //-- get template
    $contents = file_get_contents($pathSrc.$fileSrc);

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
							$scrFN = $pathDst.$v[2];
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

		if(OUTPUT_GZIP_HTML) {
	  	//-- rename *.gzip.html to *.html
	  	$fileDst = str_replace('.gzip.', '.', $fileDst);
		}
		//-- save dest file
		file_put_contents($pathDst.$fileDst, $contents);
  }
}
