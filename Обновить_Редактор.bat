@echo off
chcp 65001 > nul
title Обновление JRPG Map Editor с GitHub
echo ========================================================
echo        JRPG MAP EDITOR - ПРОВЕРКА И ОБНОВЛЕНИЕ
echo ========================================================
echo.
node tools/update-from-github.mjs %*
if errorlevel 1 (
    echo.
    echo [!] Ошибка обновления. Нажмите любую клавишу для выхода...
    pause > nul
    exit /b 1
)
echo.
echo [OK] Обновление успешно установлено!
echo Нажмите любую клавишу для запуска редактора...
pause > nul
start Редактор_Карт.exe
