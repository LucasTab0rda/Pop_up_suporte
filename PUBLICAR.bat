@echo off
setlocal enabledelayedexpansion
title Implantar - Publicar Nova Versao
color 1F

echo.
echo  =====================================================
echo   Implantar Telecom - Publicar Atualizacao no GitHub
echo  =====================================================
echo.

:: --- Node.js ---
set "NP=%ProgramFiles%\nodejs"
if not exist "%NP%\node.exe" (
    echo  [ERRO] Node.js nao encontrado.
    goto :fim_erro
)
echo  [OK] Node.js encontrado.

:: --- npm install ---
echo.
echo  [..] Verificando dependencias...
call "%NP%\npm.cmd" install --no-audit
if !errorlevel! neq 0 (
    echo  [ERRO] npm install falhou.
    goto :fim_erro
)
echo  [OK] Dependencias OK.

:: --- GitHub Token ---
if "!GH_TOKEN!"=="" (
    echo.
    echo  Necessario um GitHub Token com permissao "repo".
    echo  Crie em: https://github.com/settings/tokens
    echo.
    set /p GH_TOKEN="  Cole o token aqui: "
)
if "!GH_TOKEN!"=="" (
    echo  [ERRO] Token nao informado.
    goto :fim_erro
)
echo  [OK] Token recebido.

:: --- Versao atual ---
echo.
echo  [..] Lendo versao do package.json...
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "((Get-Content package.json -Raw | ConvertFrom-Json).version).Trim()"') do set "CURRENT=%%i"
if "!CURRENT!"=="" (
    echo  [ERRO] Nao foi possivel ler a versao do package.json.
    goto :fim_erro
)
echo  [OK] Versao atual: !CURRENT!
echo.
set "NEW_VER=!CURRENT!"
set /p NEW_VER="  Nova versao ou Enter para manter !CURRENT!: "
if "!NEW_VER!"=="" set "NEW_VER=!CURRENT!"

:: --- Atualiza versao se mudou ---
if not "!NEW_VER!"=="!CURRENT!" (
    echo.
    echo  [..] Atualizando versao para !NEW_VER!...
    call "%NP%\npm.cmd" version !NEW_VER! --no-git-tag-version --allow-same-version
    if !errorlevel! neq 0 (
        echo  [ERRO] Versao invalida ou falha ao atualizar.
        goto :fim_erro
    )
    echo  [OK] Versao atualizada.
)

:: --- Confirmacao ---
echo.
echo  =====================================================
echo   Versao : !NEW_VER!
echo   Destino: LucasTab0rda/Pop_up_suporte
echo  =====================================================
echo.
set /p CONFIRM="  Publicar agora? (S para confirmar): "
if /i not "!CONFIRM!"=="S" (
    echo  Cancelado.
    goto :fim_ok
)

:: --- Build e publicacao ---
echo.
echo  [..] Gerando instalador e enviando ao GitHub...
echo       Isso pode levar alguns minutos.
echo.
call "%NP%\npm.cmd" run publish
if !errorlevel! neq 0 (
    echo.
    echo  [ERRO] Publicacao falhou. Verifique:
    echo  - Token tem permissao "repo"?
    echo  - Repositorio esta publico no GitHub?
    echo  - Ha conexao com a internet?
    goto :fim_erro
)

echo.
echo  =====================================================
echo   VERSAO !NEW_VER! PUBLICADA COM SUCESSO!
echo   Os operadores recebem a atualizacao automaticamente.
echo  =====================================================
goto :fim_ok

:fim_erro
echo.
echo  Script encerrado com erro. Leia a mensagem acima.
echo.
pause
exit /b 1

:fim_ok
echo.
pause
exit /b 0
