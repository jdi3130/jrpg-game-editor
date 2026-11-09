import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'editor_config.json');

const args = process.argv.slice(2);
function getArg(flag, def = '') {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const token = getArg('--token', process.env.GH_TOKEN || '').trim();
const repoName = getArg('--name', 'jrpg-game-editor').trim();
const isPrivate = args.includes('--private');

if (!token) {
  console.error('[!] Токен не указан. Запустите: node tools/create-and-push-repo.mjs --token <ghp_...> [--name <repo_name>]');
  process.exit(1);
}

function ghRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`);
    const req = https.request(url, {
      method,
      headers: {
        'User-Agent': 'JRPG-Map-Editor-Setup',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else {
          reject(new Error(json.message || `HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('========================================================');
  console.log('       JRPG MAP EDITOR - СОЗДАНИЕ И ПУШ НА GITHUB       ');
  console.log('========================================================\n');

  // 1. Verify user
  console.log('1. Проверка авторизации на GitHub...');
  let user;
  try {
    user = await ghRequest('GET', '/user');
    console.log(`[OK] Авторизован как: ${user.login} (${user.name || user.login})`);
  } catch (err) {
    console.error('[!] Ошибка проверки токена:', err.message);
    process.exit(1);
  }

  // 2. Create repo on GitHub
  console.log(`\n2. Создание репозитория "${repoName}"...`);
  let repo;
  try {
    repo = await ghRequest('POST', '/user/repos', {
      name: repoName,
      description: 'JRPG Dark Fantasy Game & Map Editor - 16-bit RPG Engine',
      private: isPrivate,
      auto_init: false
    });
    console.log(`[OK] Репозиторий успешно создан: ${repo.html_url}`);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log(`[i] Репозиторий "${repoName}" уже существует на аккаунте. Подключаюсь к нему...`);
      repo = await ghRequest('GET', `/repos/${user.login}/${repoName}`);
    } else {
      console.error('[!] Не удалось создать репозиторий:', err.message);
      process.exit(1);
    }
  }

  // 3. Git init & commit locally
  console.log('\n3. Инициализация локального Git репозитория...');
  try {
    if (!fs.existsSync(path.join(ROOT, '.git'))) {
      execSync('git init -b main', { cwd: ROOT, stdio: 'inherit' });
    }
    
    // Set author config if not present
    try {
      execSync('git config user.name', { cwd: ROOT });
    } catch {
      execSync(`git config user.name "${user.name || user.login}"`, { cwd: ROOT });
      execSync(`git config user.email "${user.email || `${user.login}@users.noreply.github.com`}"`, { cwd: ROOT });
    }

    // Configure remote with auth token for push
    const pushRemoteUrl = `https://${token}@github.com/${user.login}/${repoName}.git`;
    const cleanRemoteUrl = `https://github.com/${user.login}/${repoName}.git`;

    try {
      execSync('git remote remove origin', { cwd: ROOT });
    } catch {}

    execSync(`git remote add origin ${cleanRemoteUrl}`, { cwd: ROOT });

    console.log('4. Добавление и коммит файлов...');
    execSync('git add .', { cwd: ROOT });
    
    try {
      execSync('git commit -m "JRPG Map Editor v1.3.0 - City tiles, portals, mage, starter hero, auto-updater"', { cwd: ROOT, stdio: 'inherit' });
    } catch {
      console.log('Нет новых изменений для коммита.');
    }

    console.log('\n5. Отправка обновления на GitHub (git push)...');
    execSync(`git push -u "${pushRemoteUrl}" main --force`, { cwd: ROOT, stdio: 'inherit' });

    // Update config
    let cfg = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch {}
    }
    cfg.repo = `${user.login}/${repoName}`;
    cfg.branch = 'main';
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');

    console.log('\n========================================================');
    console.log('           ОБНОВЛЕНИЕ УСПЕШНО ОПУБЛИКОВАНО!             ');
    console.log('========================================================');
    console.log(`Репозиторий:   https://github.com/${user.login}/${repoName}`);
    console.log(`Конфигурация:  editor_config.json обновлен на "${user.login}/${repoName}"`);
    console.log('Теперь на любом другом ПК достаточно запустить Обновить_Редактор.bat!');
  } catch (gitErr) {
    console.error('[!] Ошибка Git:', gitErr.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[!] Фатальная ошибка:', err);
  process.exit(1);
});

