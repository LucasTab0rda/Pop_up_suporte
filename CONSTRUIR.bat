@echo off
setlocal enabledelayedexpansion
title Implantar - Gerando Instalador
color 1F

echo.
echo  =====================================================
echo   Implantar Telecom - Gerador do Instalador
echo  =====================================================
echo.

set "NP=%ProgramFiles%\nodejs"

:: Node instalado?
if not exist "%NP%\node.exe" (
    echo  [..] Baixando Node.js...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node.msi' -UseBasicParsing"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process msiexec -ArgumentList '/i %TEMP%\node.msi /quiet /norestart' -Wait -Verb RunAs"
    timeout /t 8 /nobreak >nul
)

if not exist "%NP%\node.exe" (
    echo  [ERRO] node.exe nao encontrado em: %NP%
    pause & exit /b 1
)

echo  [OK] Node.js encontrado em %NP%
"%NP%\node.exe" --version
echo.
echo  Pressione qualquer tecla para instalar as dependencias...
pause

echo.
echo  [..] Instalando dependencias (5-10 min)...
echo.
"%NP%\npm.cmd" install
if %errorlevel% neq 0 (
    echo  [ERRO] npm install falhou.
    pause & exit /b 1
)

echo.
echo  [OK] Dependencias instaladas!
echo  Pressione qualquer tecla para gerar o instalador...
pause

echo.
echo  [..] Gerando instalador .exe...
echo.
"%NP%\npx.cmd" electron-builder --win --x64
if %errorlevel% neq 0 (
    echo  [ERRO] electron-builder falhou.
    pause & exit /b 1
)

echo.
echo  ======================================================
echo   INSTALADOR GERADO! Pasta: dist\
echo  ======================================================
if exist "dist\" explorer dist
pause
