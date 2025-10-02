  
<a id="mdns-names"></a>
# 3) mDNS: custom instance name and hostname
[Return to top](README.md#otbr-top)  
The "CONFIG_MIKE_MDNS_HOSTNAME" parameter specifies custom values for the mDNS instance name and mDNS hostname.  
  
Example: the value of this parameter "ESP OTBR Mike Board N5" will be displayed in the flow network as:  
- Instance name: display name (ESP OTBR Mike Board N5)  
- Host name: technical name (esp-otbr-mike-board-n5.local)  
 
Adding the "CONFIG_MIKE_MDNS_HOSTNAME" parameter will affect edits in several places of the application:  
- adding the *main/Kconfig.projbuild* file with the necessary settings for "idf.py menuconfig"  
- adding the *main/mdns_utils.c* file, containing a function for correctly converting the parameter value to Hostname  
- adding the *main/mdns_utils.h* file, containing a declaration of the function from *main/mdns_utils.c*  
- adding code to the *main/CMakeLists.txt* file to include *main/mdns_utils.c* in the compilation process  
~~~
idf_component_register(SRCS "esp_ot_br.c" "mdns_utils.c"
~~~
- adding code to the *main/esp_ot_br.c* file to condition the use of this parameter  
~~~
...
#ifdef CONFIG_MIKE_MDNS_HOSTNAME
  #include "mdns_utils.h"
#endif
...
    #ifdef CONFIG_MIKE_MDNS_HOSTNAME
      char hostname[256];
      //-- convert instance name to correct hostname
      hostname_optimized(CONFIG_MIKE_MDNS_HOSTNAME, hostname);
      ESP_ERROR_CHECK(mdns_hostname_set(hostname));
      ESP_ERROR_CHECK(mdns_instance_name_set(CONFIG_MIKE_MDNS_HOSTNAME));
    #else
      //-- default values
      ESP_ERROR_CHECK(mdns_hostname_set("esp-ot-br"));
    #endif
...
~~~
- Added to /examples/basic_thread_border_router/main/CMakeLists.txt
~~~
idf_component_register(SRCS ... "mdns_utils.c"
~~~


![](images/otbr/esp_otbr_custom_mdns_names.jpg)  

[Return to top](README.md#otbr-top)  
