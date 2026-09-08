#!/usr/bin/env node
/**
 * Читает portfolio.project.json в подпапках и генерирует:
 * - proxy/demos.generated.conf — location для /demos/<id>/
 * - docker-compose.demos.generated.yml — сервисы демо (если есть Dockerfile)
 *
 * Запуск: node scripts/portfolio-sync.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NGINX_OUT = path.join(ROOT, 'proxy', 'demos.generated.conf');
const COMPOSE_OUT = path.join(ROOT, 'docker-compose.demos.generated.yml');

/**
 * @param {string} dir
 * @returns {Promise<{ id: string; title: string; demoBase: string; folder: string } | null>}
 */
async function readManifest(dir) {
  const manifestPath = path.join(dir, 'portfolio.project.json');
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.id || !data.demoBase || !data.folder) return null;
    return data;
  } catch {
    return null;
  }
}

async function discoverProjects() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (
      entry.name.startsWith('.') ||
      entry.name === 'node_modules' ||
      entry.name === 'proxy' ||
      entry.name === 'scripts'
    ) {
      continue;
    }

    const absFolder = path.join(ROOT, entry.name);
    const manifest = await readManifest(absFolder);
    if (!manifest) continue;

    const hasDockerfile = await fs
      .access(path.join(absFolder, 'Dockerfile'))
      .then(() => true)
      .catch(() => false);

    projects.push({ ...manifest, absFolder, hasDockerfile });
  }

  return projects.sort((a, b) => a.id.localeCompare(b.id));
}

/** Нормализует demoBase: /demos/flowcrm/ */
function normalizeDemoBase(demoBase) {
  let base = demoBase.startsWith('/') ? demoBase : `/${demoBase}`;
  if (!base.endsWith('/')) base += '/';
  return base;
}

function buildNginx(projects) {
  const lines = [
    '# Автогенерация: node scripts/portfolio-sync.mjs — не править вручную',
    '',
  ];

  if (projects.length === 0) {
    lines.push('# Манифесты portfolio.project.json не найдены');
    lines.push('');
    return lines.join('\n');
  }

  for (const project of projects) {
    const base = normalizeDemoBase(project.demoBase);
    const service = `demo-${project.id}`;

    if (project.hasDockerfile) {
      lines.push(`# ${project.title} → ${service}`);
      lines.push(`location ${base} {`);
      lines.push(`  proxy_pass http://${service}:80;`);
      lines.push('  proxy_http_version 1.1;');
      lines.push('  proxy_set_header Host $host;');
      lines.push('  proxy_set_header X-Real-IP $remote_addr;');
      lines.push('  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
      lines.push('  proxy_set_header X-Forwarded-Proto $scheme;');
      lines.push('}');
      lines.push('');
    } else {
      lines.push(`# ${project.title} — Dockerfile отсутствует (этап 5)`);
      lines.push(`location ${base} {`);
      lines.push('  default_type text/plain;');
      lines.push(
        '  return 503 "Demo image not built yet. Run portfolio-sync after adding Dockerfile.";',
      );
      lines.push('}');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function buildCompose(projects) {
  const withDocker = projects.filter((p) => p.hasDockerfile);
  const header = '# Автогенерация: node scripts/portfolio-sync.mjs — не править вручную\n';

  if (withDocker.length === 0) {
    return `${header}services: {}\n`;
  }

  const lines = [header.trimEnd(), 'services:'];

  for (const project of withDocker) {
    const service = `demo-${project.id}`;
    lines.push(`  ${service}:`);
    lines.push('    build:');
    lines.push(`      context: ./${project.folder}`);
    lines.push('      dockerfile: Dockerfile');
    lines.push('    restart: unless-stopped');
    lines.push('    networks:');
    lines.push('      - portfolio');
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  await fs.mkdir(path.join(ROOT, 'proxy'), { recursive: true });

  const projects = await discoverProjects();
  await fs.writeFile(NGINX_OUT, buildNginx(projects), 'utf8');
  await fs.writeFile(COMPOSE_OUT, buildCompose(projects), 'utf8');

  console.log(`Найдено проектов: ${projects.length}`);
  for (const p of projects) {
    console.log(`  - ${p.id} (${p.folder}) Dockerfile: ${p.hasDockerfile ? 'yes' : 'no'}`);
  }
  console.log(`Записано: ${path.relative(ROOT, NGINX_OUT)}`);
  console.log(`Записано: ${path.relative(ROOT, COMPOSE_OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
