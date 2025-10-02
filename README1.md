
# ESP-IDF 5.4.1 OTBR Example 1.2 Optimization
Based on [ESP-THREAD-BR Release v1.2](https://github.com/espressif/esp-thread-br/releases/tag/v1.2)  
  
<a id="web-page"></a>
# 1) Web Page
[Return to top](README.md#otbr-top)  
Considering that the ESP32-S3 chip on the ESP OTBR board can have 8MB or 16MB of flash memory, we can optimize the web page code inside the OTBR.  
Moreover, we can set custom values for mDNS instance name and mDNS hostname.  
  
In any case, this is worth checking if the flash memory capacity is really more than 4MB:  
~~~
esptool -p COM3 flash_id
~~~
> Detecting chip type... ESP32-S3  
> Chip is ESP32-S3 (QFN56) (revision v0.1)  
> Features: WiFi, BLE, Embedded PSRAM 2MB (AP_3v3)  
> Crystal is 40MHz  
> Manufacturer: c8  
> Device: 4018  
> Detected flash size: **16MB**  
> Flash type set in eFuse: quad (4 data lines)  
> Flash voltage set by eFuse to 3.3V  
  
  
<a id="web-page-change-partitions"></a>
## Change partition table
/examples/basic_thread_border_router/partitions.csv:  
Increase web_storage to **1M** or more...  
Additionally, we can increase the OTA block size to **2M** and reduce the excess RCP block size to **256K**.  
~~~
nvs,        data, nvs,      , 0x6000,
otadata,    data, ota,      , 0x2000,
phy_init,   data, phy,      , 0x1000,
ota_0,      app,  ota_0,    , 2M,
ota_1,      app,  ota_1,    , 2M,
web_storage,data, spiffs,   , 1M,
rcp_fw,     data, spiffs,   , 256K,
~~~

<a id="web-page-change-flash-size"></a>
## Change flash size in configuration
/examples/basic_thread_border_router/sdkconfig.defaults:  
Change *ESPTOOLPY_FLASHSIZE_4MB* to **ESPTOOLPY_FLASHSIZE_8MB** or **ESPTOOLPY_FLASHSIZE_16MB**
>  
> CONFIG_ESPTOOLPY_FLASHSIZE_8MB=y  
>  
  
Or  
  
>  
> CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y  
>  
  
The original HTML includes 3 links:
~~~
<link href="https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://code.jquery.com/jquery-1.10.2.min.js"></script>
<script src="https://d3js.org/d3.v3.min.js"></script>
~~~

<a id="web-page-save-locally"></a>
## Save external scripts locally
1) /components/esp_ot_br_server/frontend/static/static.min.css  
Download *https://cdn.jsdelivr.net/npm/bootstrap@3.3.7/dist/css/bootstrap.min.css* and put its code into the **static.min.css** file.

2) /components/esp_ot_br_server/frontend/static/static.min.js  
Download *https://code.jquery.com/jquery-1.10.2.min.js* and *https://d3js.org/d3.v3.min.js* and put their code into the **static.min.js** file.

Add a few lines to the */components/esp_ot_br_server/src/esp_br_web.c*:
~~~
...
    //-- added external css
    } else if (strcmp(info.file_name, "/static/static.min.css") == 0) {
        return style_css_get_handler(req, info.file_path);
    //-- added external js
    } else if (strcmp(info.file_name, "/static/static.min.js") == 0) {
        return script_js_get_handler(req, info.file_path);
...
~~~
It might be correct to change WEB_TAG from "obtr_web" to "otbr_web" (OpenThread Border Router) there:
~~~
#define WEB_TAG "otbr_web"
~~~

<a id="web-page-switch-theme"></a>
## Switch theme
Switching between dark and light themes occurs by clicking the "sun/moon" icons.  
- DARK theme:  
![](images/otbr/otbr_web_dark_01.png)  
![](images/otbr/otbr_web_dark_02.png)  
  
- LIGHT theme:  
![](images/otbr/otbr_web_light.png)  

  
Add a few lines to the */components/esp_ot_br_server/frontend/index.html*:
~~~
<!-- dark theme -->
<link href="/static/style-dark.min.css" type="text/css" rel="stylesheet">
<link href="/static/icons.min.css" type="text/css" rel="stylesheet">
<script src="/static/theme-switch.min.js" defer="true"></script>
~~~
Add a few lines to the */components/esp_ot_br_server/src/esp_br_web.c*:
~~~
...
    //-- added dark theme css
    } else if (strcmp(info.file_name, "/static/style-dark.min.css") == 0) {
        return style_css_get_handler(req, info.file_path);
    //-- added theme-switch.min.js
    } else if (strcmp(info.file_name, "/static/theme-switch.min.js") == 0) {
        return script_js_get_handler(req, info.file_path);
    //-- added minified icons.min.css
    } else if (strcmp(info.file_name, "/static/icons.min.css") == 0) {
        return style_css_get_handler(req, info.file_path);
...
~~~

<a id="web-page-minify-code"></a>
## Minify code
We can also minify html, js and css using the [*minify*](minify/) PHP-script:
  
Add new lines to the *esp_br_web.c* file:
~~~
...
    //-- added minified html
    } else if (strcmp(info.file_name, "/index.min.html") == 0) {
        return index_html_get_handler(req, info.file_path);
    //-- added minified css
    } else if (strcmp(info.file_name, "/static/style.min.css") == 0) {
        return style_css_get_handler(req, info.file_path);
    //-- added minified js
    } else if (strcmp(info.file_name, "/static/restful.min.js") == 0) {
        return script_js_get_handler(req, info.file_path);
...
~~~
Hide or remove old lines in file *esp_br_web.c*:
~~~
...
/*
    } else if (strcmp(info.file_name, "/static/style.css") == 0) {
        return style_css_get_handler(req, info.file_path);
    } else if (strcmp(info.file_name, "/static/restful.js") == 0) {
        return script_js_get_handler(req, info.file_path);
*/
...
~~~
Run PHP-script:
~~~
-----------------------------------------------
| File name           |    Source |  Minified |
-----------------------------------------------
| index.min.html      |     22556 |     16025 |
| restful.min.js      |     31645 |     15018 |
| style.min.css       |     31553 |     23913 |
| style-dark.min.css  |     10166 |      8157 |
| theme-switch.min.js |      1685 |      1168 |
| icons.min.css       |      6974 |      4479 |
-----------------------------------------------
~~~
*P.S. To run minify for JS correctly, it's necessary to make edits to the **restful.js** file code - to put the missing semicolons at the end of the expressions.*  

<a id="web-page-password-protected"></a>
## Password protected web page
The original HTML ([crypt](crypt/)) includes 2 links:
~~~
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/core.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/md5.js"></script>
~~~

1) Download *https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/core.min.js* and *https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/md5.min.js* and put their code into the **static.min.js** file.
2) Add code from the [crypt](crypt/) folder: html code to *index.html*, css code to *static/style.css* and js code to *restful.js*.  
3) Using the following commands we will get the MD5 sequence for the login and password,
~~~
const username = 'my_username';
const password = 'my_password';
const crypt_usr = CryptoJS.MD5(username).toString();
const crypt_pwd = CryptoJS.MD5(password).toString();
console.log('username:', username, ', MD5 username:', crypt_usr, 'password:', password, ', MD5 password: ', crypt_pwd);
~~~
>  
> username: my_username, MD5 username: 70410b7ffa7b5fb23e87cfaa9c5fc258, password: my_password, MD5 password: a865a7e0ddbf35fa6f6a232e0893bea4  
>  
  
replace the value of the MD5_USERNAME and MD5_PASSWORD variables in the JS code: 
~~~
const MD5_USERNAME = '70410b7ffa7b5fb23e87cfaa9c5fc258';
const MD5_PASSWORD = 'a865a7e0ddbf35fa6f6a232e0893bea4';
~~~
Now when opening a web page we will have to log in with the saved username and password. If there is an error filling out the authorization form, the message "Invalid credentials" will be displayed.  
  
![](images/web_auth/web_auth.png)  
  
<a id="web-page-final-stage"></a>
## Final stage
After that we need to compile and flash the firmware to get the latest version!  
  
When the web server starts, we will see something like this:  
~~~ 
I (10386) otbr_web: <=======================server start========================>  
I (10386) otbr_web: http://192.168.1.250:80/index.html  
I (10386) otbr_web: <===========================================================>  
~~~ 
or, in my version of the code (*esp_br_web.c*) :)  
~~~
ESP_LOGW(WEB_TAG, "### Server start ##########################");
ESP_LOGW(WEB_TAG, "#");
ESP_LOGW(WEB_TAG, "#   http://%s:%d/index.html", s_server.ip, s_server.port);
ESP_LOGW(WEB_TAG, "#");
ESP_LOGW(WEB_TAG, "###########################################");
~~~
it looks like:
~~~ 
W (4565) otbr_web: ### Server start ##########################
W (4565) otbr_web: #
W (4565) otbr_web: #   http://192.168.1.250:80/index.html
W (4565) otbr_web: #
W (4565) otbr_web: ###########################################
~~~ 
So, we can run this URL, http://192.168.1.250:80/index.html or its minified version http://192.168.1.250:80/index.min.html 

[Return to top](README.md#otbr-top)  
