@echo off
title COBAO NFC - Instalar inicio automatico
cd /d "%~dp0"

rem Crea un acceso directo en la carpeta Inicio de Windows
rem para que el lector arranque oculto al encender la PC / iniciar sesion.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS=%~dp0iniciar_nfc_silencioso.vbs"
set "LNK=%STARTUP%\COBAO_NFC_Lector.lnk"

if not exist "%~dp0nfc_reader.exe" (
    echo ERROR: falta nfc_reader.exe en esta carpeta.
    pause
    exit /b 1
)
if not exist "%VBS%" (
    echo ERROR: falta iniciar_nfc_silencioso.vbs
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%LNK%');" ^
  "$s.TargetPath='wscript.exe';" ^
  "$s.Arguments='\"%VBS%\"';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.WindowStyle=7;" ^
  "$s.Description='COBAO lector NFC (oculto)';" ^
  "$s.Save()"

if exist "%LNK%" (
    echo.
    echo OK: el lector se iniciara automaticamente al iniciar sesion en Windows.
    echo Acceso: %LNK%
    echo.
    echo Para probar ahora sin reiniciar:
    echo   wscript "%VBS%"
    echo.
    echo Para quitarlo: desinstalar_inicio_automatico.bat
) else (
    echo ERROR: no se pudo crear el acceso directo.
)
echo.
pause
