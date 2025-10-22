@echo off

set ESP_THREAD_BORDER_ROUTER="D:\!HA!\!LINKS!\esp-thread-br"
echo ESP_THREAD_BORDER_ROUTER=%ESP_THREAD_BORDER_ROUTER%

setlocal enabledelayedexpansion

set SDKCONFIG=sdkconfig
set SDKCONFIG_DEFAULTS=sdkconfig.defaults.4mb

rem Form a complete command for display
set "args=%*"
set "full_command=idf.py -D SDKCONFIG=!SDKCONFIG! -D SDKCONFIG_DEFAULTS=!SDKCONFIG_DEFAULTS! !args!"
set "message=   !full_command!   "

rem Create a separator string of the required length
call :strlen message len
set "separator="
set "empty="
for /l %%i in (1,1,!len!) do (
    set "separator=!separator!#"
    set "empty=!empty! "
)

echo.
echo #!separator!#
echo #!message!#
echo #!separator!#
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

rem Execute the command
idf.py -D SDKCONFIG="!SDKCONFIG!" -D SDKCONFIG_DEFAULTS="!SDKCONFIG_DEFAULTS!" %*
endlocal
goto :eof

:strlen
setlocal enabledelayedexpansion
set "s=!%~1!"
set "len=0"
if defined s (
    set "tmp=!s:%%=%%A!"
    for %%# in (4096 2048 1024 512 256 128 64 32 16 8 4 2 1) do (
        if not "!tmp:~%%#,1!"=="" set /a "len+=%%#" & set "tmp=!tmp:~%%#!"
    )
)
endlocal & set "%~2=%len%"
goto :eof
