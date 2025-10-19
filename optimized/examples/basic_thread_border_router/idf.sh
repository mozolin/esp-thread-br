#!/usr/bin/env bash

#SDKCONFIG="sdkconfig.4mb"
SDKCONFIG="sdkconfig"
SDKCONFIG_DEFAULTS="sdkconfig.defaults.4mb"

# Формируем полную команду для отображения
full_command="idf.py -D SDKCONFIG=${SDKCONFIG} -D SDKCONFIG_DEFAULTS=${SDKCONFIG_DEFAULTS} $@"
message="   $full_command   "

# Создаем строку разделителя нужной длины
separator=$(printf '%*s' "${#message}" | tr ' ' '#')
empty=$(printf '%*s' "${#message}" | tr ' ' ' ')

WHITE='\033[0;97m'
WHITE_BOLD='\033[1;97m'
GREEN='\033[0;32m'
GREEN_BOLD='\033[1;32m'
YELLOW='\033[0;33m'
YELLOW_BOLD='\033[1;33m'
BLUE='\033[0;94m'
BLUE_BOLD='\033[1;94m'
CYAN='\033[0;36m'
CYAN_BOLD='\033[1;36m'
NC='\033[0m'

echo -e "${YELLOW_BOLD}#$separator#${NC}"
#echo -e "${YELLOW_BOLD}#$empty#${NC}"
echo -e "${YELLOW_BOLD}#${CYAN_BOLD}$message${YELLOW_BOLD}#${NC}"
#echo -e "${YELLOW_BOLD}#$empty#${NC}"
echo -e "${YELLOW_BOLD}#$separator#${NC}"
#echo
echo -e "${WHITE_BOLD}Press any key to continue or Ctrl+C to cancel...${NC}"
read -n 1 -s
echo

# Выполняем команду
idf.py -D SDKCONFIG="${SDKCONFIG}" -D SDKCONFIG_DEFAULTS="${SDKCONFIG_DEFAULTS}" "$@"
