@echo off
cd /d "%~dp0"
:loop
node server.js
echo Servidor parou. Reiniciando em 3 segundos... (feche esta janela para desligar)
timeout /t 3 >nul
goto loop
