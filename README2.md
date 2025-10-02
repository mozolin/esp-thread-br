
<a id="configuration"></a>
# 2) Configuration parameters
[Return to top](README.md#otbr-top)  
/examples/basic_thread_border_router/sdkconfig.defaults:  
Add to the beginning of the file:  
>  
> \# begin of ESP32-S3  
> CONFIG_IDF_TARGET="esp32s3"  
> CONFIG_OPENTHREAD_BR_AUTO_START=y  
> CONFIG_OPENTHREAD_BR_START_WEB=y  
> \# end of ESP32-S3  
>   
> \# begin of Custom Firmware Config  
> CONFIG_MIKE_MDNS_HOSTNAME="ESP OTBR Mike Board N3 OTA"  
> CONFIG_MIKE_DEVICE_ID="ESP OTBR Mike Board N3 OTA"  
> CONFIG_MIKE_FIRMWARE_VERSION="1.3.5"  
> \# end of Custom Firmware Config  
>   
  
***See "3) mDNS: custom instance name and hostname" section for descriptions of the "CONFIG_MIKE_MDNS_HOSTNAME" parameter!***  
    
Add to the "Ethernet" section:  
> CONFIG_EXAMPLE_CONNECT_ETHERNET=y  
> CONFIG_EXAMPLE_ETHERNET_EMAC_TASK_STACK_SIZE=2048  
> CONFIG_EXAMPLE_USE_SPI_ETHERNET=y  
  
Add "Wi-Fi" section:  
> \# begin of Wi-Fi
> CONFIG_EXAMPLE_CONNECT_WIFI=y  
> CONFIG_EXAMPLE_PROVIDE_WIFI_CONSOLE_CMD=y  
> CONFIG_EXAMPLE_WIFI_SSID="NETIS_WIFI_24"  
> CONFIG_EXAMPLE_WIFI_PASSWORD="secret_password"  
> CONFIG_EXAMPLE_WIFI_CONN_MAX_RETRY=1000000  
> \# end of Wi-Fi  

[Return to top](README.md#otbr-top)  
