import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'editor_config.json');

// Helper to read config
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.warn('Не удалось сохранить editor_config.json:', e.message);
  }
}

// Read CLI args
const args = process.argv.slice(2);
function getArg(flag, def = '') {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const config = loadConfig();

let repo = getArg('--repo', process.env.GH_REPO || config.repo || '');
let branch = getArg('--branch', config.branch || 'main');
let token = getArg('--token', process.env.GH_TOKEN || config.token || '');

async function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('========================================================');
  console.log('       JRPG MAP EDITOR - ОБНОВЛЕНИЕ С GITHUB            ');
  console.log('========================================================\n');

  if (!repo) {
    console.log('Репозиторий GitHub ещё не настроен.');
    console.log('Введите репозиторий в формате "владелец/репозиторий" (например: alex/jrpg-game)');
    repo = await askQuestion('GitHub Repo: ');
    if (!repo) {
      console.log('Отмена. Репозиторий не указан.');
      process.exit(1);
    }
    const b = await askQuestion('Ветка (по умолчанию main): ');
    if (b) branch = b;
    const t = await askQuestion('Токен GitHub (опционально, для приватных репо): ');
    if (t) token = t;

    config.repo = repo;
    config.branch = branch;
    if (token) config.token = token;
    saveConfig(config);
    console.log('\n[OK] Настройки сохранены в editor_config.json!\n');
  }

  console.log(`Репозиторий: ${repo}`);
  console.log(`Ветка:       ${branch}`);
  console.log('--------------------------------------------------------\n');

  // 1. If this is a git clone, run git pull
  if (fs.existsSync(path.join(ROOT, '.git'))) {
    console.log('Обнаружен локальный Git репозиторий (.git). Выполняю git pull...');
    try {
      const out = execSync(`git pull origin ${branch}`, { cwd: ROOT, encoding: 'utf8' });
      console.log(out);
      console.log('[OK] Успешно синхронизировано через Git!');
      process.exit(0);
    } catch (err) {
      console.warn('git pull завершился с ошибкой, переключаюсь на скачивание архива:', err.message);
    }
  }

  // 2. Otherwise download latest zipball from GitHub
  console.log(`Запрашиваю архив ветки "${branch}" с GitHub...`);
  const zipUrl = `https://api.github.com/repos/${repo}/zipball/${encodeURIComponent(branch)}`;

  function fetchWithRedirect(url, headers, onDone) {
    const req = https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchWithRedirect(res.headers.location, { 'User-Agent': 'JRPG-Map-Editor' }, onDone);
      }
      if (res.statusCode !== 200) {
        return onDone(new Error(`GitHub вернул статус ${res.statusCode}: ${res.statusMessage}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => onDone(null, Buffer.concat(chunks)));
    });
    req.on('error', onDone);
  }

  const reqHeaders = {
    'User-Agent': 'JRPG-Map-Editor-AutoUpdater',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  fetchWithRedirect(zipUrl, reqHeaders, async (err, zipBuffer) => {
    if (err) {
      console.error('\n[!] Ошибка при скачивании архива с GitHub:', err.message);
      console.error('Проверьте правильность имени репозитория или подключение к интернету.');
      process.exit(1);
    }

    const zipPath = path.join(ROOT, 'update_temp.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`Архив скачан (${Math.round(zipBuffer.length / 1024)} КБ). Распаковка...`);

    try {
      const extractDir = path.join(ROOT, 'update_extracted');
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      fs.mkdirSync(extractDir, { recursive: true });

      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { cwd: ROOT });

      const entries = fs.readdirSync(extractDir);
      const innerDir = entries.length === 1 && fs.statSync(path.join(extractDir, entries[0])).isDirectory()
        ? path.join(extractDir, entries[0])
        : extractDir;

      // Copy files over ROOT, safely preserving user maps and configs
      function copyRecursive(src, dst) {
        const items = fs.readdirSync(src);
        for (const item of items) {
          const sPath = path.join(src, item);
          const dPath = path.join(dst, item);

          // Preserve local custom user maps
          if (item === 'maps' && fs.existsSync(dPath)) {
            console.log('-> Защита: сохраняю пользовательские карты в maps/ ...');
            continue;
          }
          // Preserve local editor_config.json
          if (item === 'editor_config.json' && fs.existsSync(dPath)) {
            console.log('-> Защита: сохраняю локальный editor_config.json ...');
            continue;
          }

          const stat = fs.statSync(sPath);
          if (stat.isDirectory()) {
            if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
            copyRecursive(sPath, dPath);
          } else {
            fs.copyFileSync(sPath, dPath);
          }
        }
      }

      copyRecursive(innerDir, ROOT);
      console.log('\n[OK] Все файлы редактора и игры успешно обновлены!');

      // Cleanup
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      } catch {}

      process.exit(0);
    } catch (extractErr) {
      console.error('\n[!] Ошибка при распаковке файлов:', extractErr.message);
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});
