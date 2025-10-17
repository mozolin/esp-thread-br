/*
 * SPDX-FileCopyrightText: 2021-2023 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: CC0-1.0
 *
 * OpenThread Radio Co-Processor (RCP) Example
 *
 * This example code is in the Public Domain (or CC0-1.0 licensed, at your option.)
 *
 * Unless required by applicable law or agreed to in writing, this
 * software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied.
 */

#include <stdio.h>
#include <unistd.h>

#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_openthread.h"
#include "esp_ot_config.h"
#include "esp_vfs_eventfd.h"
#include "driver/uart.h"

#if CONFIG_EXTERNAL_COEX_ENABLE
#include "esp_coexist.h"
#endif

#if !SOC_IEEE802154_SUPPORTED
#error "RCP is only supported for the SoCs which have IEEE 802.15.4 module"
#endif

#define TAG "ot_esp_rcp"

#define CMD_UART_NUM 0
//-->
#include "esp_log.h"
// LED для индикации UART активности
#define LED_RX_GPIO GPIO_NUM_22
#define LED_TX_GPIO GPIO_NUM_25

// Таймаут моргания в миллисекундах
#define LED_BLINK_TIME_MS 50

//static const char *TAG = "UART_LED";

// Переменные для управления LED
static volatile bool rx_led_active = false;
static volatile bool tx_led_active = false;
static TickType_t rx_led_off_time = 0;
static TickType_t tx_led_off_time = 0;

// Функция для включения RX LED
static void IRAM_ATTR activate_rx_led(void) {
    gpio_set_level(LED_RX_GPIO, 1);
    rx_led_active = true;
    rx_led_off_time = xTaskGetTickCount() + pdMS_TO_TICKS(LED_BLINK_TIME_MS);
}

// Функция для включения TX LED  
static void IRAM_ATTR activate_tx_led(void) {
    gpio_set_level(LED_TX_GPIO, 1);
    tx_led_active = true;
    tx_led_off_time = xTaskGetTickCount() + pdMS_TO_TICKS(LED_BLINK_TIME_MS);
}

// Инициализация LED GPIO
static void init_uart_leds(void) {
    // Настройка RX LED
    gpio_reset_pin(LED_RX_GPIO);
    gpio_set_direction(LED_RX_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(LED_RX_GPIO, 0);
    
    // Настройка TX LED
    gpio_reset_pin(LED_TX_GPIO);
    gpio_set_direction(LED_TX_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(LED_TX_GPIO, 0);
    
    ESP_LOGW(TAG, "UART LEDs initialized - RX:GPIO%d, TX:GPIO%d", 
             LED_RX_GPIO, LED_TX_GPIO);
}
//<--


extern void otAppNcpInit(otInstance *instance);

#if CONFIG_EXTERNAL_COEX_ENABLE
#if SOC_EXTERNAL_COEX_ADVANCE
static void ot_external_coexist_init(void)
{
    esp_external_coex_gpio_set_t gpio_pin = ESP_OPENTHREAD_DEFAULT_EXTERNAL_COEX_CONFIG();
    esp_external_coex_set_work_mode(EXTERNAL_COEX_FOLLOWER_ROLE);
    ESP_ERROR_CHECK(esp_enable_extern_coex_gpio_pin(CONFIG_EXTERNAL_COEX_WIRE_TYPE, gpio_pin));
}
#endif // SOC_EXTERNAL_COEX_ADVANCE
#endif // CONFIG_EXTERNAL_COEX_ENABLE

static void ot_task_worker(void *aContext)
{
    esp_openthread_platform_config_t config = {
        .radio_config = ESP_OPENTHREAD_DEFAULT_RADIO_CONFIG(),
        .host_config = ESP_OPENTHREAD_DEFAULT_HOST_CONFIG(),
        .port_config = ESP_OPENTHREAD_DEFAULT_PORT_CONFIG(),
    };

    // Initialize the OpenThread stack
    ESP_ERROR_CHECK(esp_openthread_init(&config));

#if CONFIG_EXTERNAL_COEX_ENABLE
    ot_external_coexist_init();
#endif // CONFIG_EXTERNAL_COEX_ENABLE

    // Initialize the OpenThread ncp
    otAppNcpInit(esp_openthread_get_instance());

    // Run the main loop
    esp_openthread_launch_mainloop();

    // Clean up
    esp_vfs_eventfd_unregister();
    vTaskDelete(NULL);
}

void app_main(void)
{
    // Used eventfds:
    // * ot task queue
    // * radio driver
    esp_vfs_eventfd_config_t eventfd_config = {
        .max_fds = 2,
    };

    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    ESP_ERROR_CHECK(esp_vfs_eventfd_register(&eventfd_config));
    xTaskCreate(ot_task_worker, "ot_rcp_main", 3072, xTaskGetCurrentTaskHandle(), 5, NULL);

    //-->
    // Инициализация LED для индикации UART
    init_uart_leds();
    /*
    printf("=== H2 Ready - UART LEDs on GPIO%d(RX), GPIO%d(TX) ===\n", 
           LED_RX_GPIO, LED_TX_GPIO);
    // Тестовое моргание при старте
    vTaskDelay(1000 / portTICK_PERIOD_MS);
    activate_rx_led();
    vTaskDelay(200 / portTICK_PERIOD_MS);
    activate_tx_led();
    vTaskDelay(200 / portTICK_PERIOD_MS);
    activate_rx_led();
    activate_tx_led();
    */

    bool blinkFlag = false;
    while(1) {
    	
    	if(blinkFlag) {
    		gpio_set_level(LED_RX_GPIO, 0);
    		gpio_set_level(LED_TX_GPIO, 1);
    	} else {
    		gpio_set_level(LED_RX_GPIO, 1);
    		gpio_set_level(LED_TX_GPIO, 0);
    	}
    	
    	blinkFlag = !blinkFlag;
    	vTaskDelay(500 / portTICK_PERIOD_MS);
    }
    //<--

}
