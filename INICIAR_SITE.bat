@echo off
title Corretor ENEM 2026 - servidor local
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Instale o Node.js para iniciar o servidor protegido.
    echo Nao abra index.html diretamente nem use um servidor alternativo.
    pause
    exit /b 1
)

echo Corretor ENEM 2026 - servidor local protegido
echo Acesse: http://127.0.0.1:3000
echo Disponivel apenas neste computador. Pressione CTRL+C para encerrar.
echo.
node server.js
pause
