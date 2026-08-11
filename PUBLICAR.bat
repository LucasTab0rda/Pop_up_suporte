@echo off
setlocal enabledelayedexpansion
title Implantar - Publicar Nova Versao
color 1F

echo.
echo  =====================================================
echo   Implantar Telecom - Publicar Atualizacao no GitHub
echo  =====================================================
echo.

:: ── Node.js ──────────────────────────────────────────
set "NP=%ProgramFiles%\nodejs"
if not exist "%NP%\node.exe" (
    echo  [ERRO] Node.js nao encontrado. Execute CONSTRUIR.bat primeiro.
    pause & exit /b 1
)
echo  [OK] Node.js encontrado.

:: ── npm install ──────────────────────────────────────
echo.
echo  [..] Verificando dependencias...
call "%NP%\npm.cmd" install --no-audit
if %errorlevel% neq 0 (
    echo  [ERRO] npm install falhou.
    pause & exit /b 1
)
echo  [OK] Dependencias OK.

:: ── GitHub Token ─────────────────────────────────────
if "%GH_TOKEN%"=="" (
    echo.
    echo  Para publicar no GitHub e necessario um Personal Access Token
    echo  com permissao "repo" (Contents: write).
    echo.
    echo  Onde criar: https://github.com/settings/tokens
    echo  (Token classico - repo - Generate token)
    echo.
    set /p GH_TOKEN="  Cole o token aqui: "
    if "!GH_TOKEN!"=="" (
        echo.
        echo  [ERRO] Token nao informado. Publicacao cancelada.
        pause & exit /b 1
    )
)

:: ── Versao atual ─────────────────────────────────────
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content package.json -Raw | ConvertFrom-Json).version"`) do set CURRENT=%%v
echo.
echo  Versao atual no package.json: %CURRENT%
echo.
set /p NEW_VER="  Nova versao (ex: 1.1.0) ou Enter para manter %CURRENT%: "
if "!NEW_VER!"=="" set NEW_VER=%CURRENT%

:: Validacao simples de formato x.y.z
echo !NEW_VER! | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo  [ERRO] Versao invalida. Use o formato X.Y.Z (ex: 1.2.0).
    pause & exit /b 1
)

:: Atualiza package.json se a versao mudou
if not "!NEW_VER!"=="%CURRENT%" (
    echo.
    echo  [..] Atualizando versao para !NEW_VER!...
    call "%NP%\npm.cmd" version !NEW_VER! --no-git-tag-version --allow-same-version
    if %errorlevel% neq 0 (
        echo  [ERRO] Falha ao atualizar a versao.
        pause & exit /b 1
    )
    echo  [OK] Versao atualizada.
)

:: ── Confirmacao ───────────────────────────────────────
echo.
echo  =====================================================
echo   Prestes a publicar versao !NEW_VER! no GitHub
echo   Repositorio: LucasTab0rda/Pop_up_suporte
echo   Os apps dos operadores atualizarao automaticamente
echo  =====================================================
echo.
set /p CONFIRM="  Confirmar publicacao? (S/N): "
if /i not "!CONFIRM!"=="S" (
    echo  Publicacao cancelada.
    pause & exit /b 0
)

:: ── Build + Publish ───────────────────────────────────
echo.
echo  [..] Gerando instalador e enviando para o GitHub...
echo       (pode levar alguns minutos)
echo.
set GH_TOKEN=!GH_TOKEN!
call "%NP%\npm.cmd" run publish
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Publicacao falhou.
    echo.
    echo  Causas comuns:
    echo  - Token sem permissao "repo"
    echo  - Repositorio privado (deve ser publico)
    echo  - Sem conexao com a internet
    pause & exit /b 1
)

echo.
echo  =====================================================
echo   VERSAO !NEW_VER! PUBLICADA COM SUCESSO!
echo.
echo   Os operadores recebem a atualizacao automaticamente
echo   na proxima vez que abrirem o app.
echo  =====================================================
echo.
pause
