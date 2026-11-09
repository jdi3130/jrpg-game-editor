@echo off
chcp 65001 > nul
title Публикация JRPG Map Editor на GitHub
echo ========================================================
echo       JRPG MAP EDITOR - ПЕРВИЧНАЯ НАСТРОЙКА И ПУШ
echo ========================================================
echo.
echo Сейчас в вашем браузере откроется страница создания токена GitHub.
echo.
echo Инструкция:
echo 1. Войдите в свой GitHub аккаунт (если ещё не вошли).
echo 2. Прокрутите страницу вниз и нажмите зелёную кнопку «Generate token».
echo 3. Скопируйте полученный токен (он начинается на ghp_...).
echo 4. Вставьте его сюда в консоль и нажмите Enter.
echo.
echo Нажмите любую клавишу, чтобы открыть GitHub в браузере...
pause > nul

start "" "https://github.com/settings/tokens/new?scopes=repo^&description=JRPG-Map-Editor"

echo.
set /p GH_TOKEN="Вставьте ваш токен GitHub: "

if "%GH_TOKEN%"=="" (
    echo [!] Токен не введён. Отмена.
    pause
    exit /b 1
)

set /p REPO_NAME="Название репозитория (по умолчанию jrpg-game-editor): "
if "%REPO_NAME%"=="" set REPO_NAME=jrpg-game-editor

echo.
echo Создаю репозиторий %REPO_NAME% и отправляю файлы...
node tools/create-and-push-repo.mjs --token "%GH_TOKEN%" --name "%REPO_NAME%"

if errorlevel 1 (
    echo.
    echo [!] Произошла ошибка. Проверьте введённый токен.
    pause
    exit /b 1
)

echo.
echo Нажмите любую клавишу для завершения...
pause > nul
