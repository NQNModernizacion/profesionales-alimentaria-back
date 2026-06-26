/**
 * Test e2e para initTemplate.ts
 *
 * Estrategia:
 *   1. Crea un workspace temporal con fixtures mínimas que reproducen los
 *      tokens del template (`nest-template`, `Nest Template`, `nest_template`).
 *   2. Copia el script real `initTemplate.ts` al workspace temporal.
 *   3. Lo ejecuta vía `tsx` como subproceso, alimentando respuestas por stdin.
 *   4. Asserta el contenido final de los archivos y el auto-borrado del script.
 *
 * Se ejecuta con:
 *   pnpm test:e2e
 */

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_SRC = path.join(REPO_ROOT, 'initTemplate.ts');
// Invocamos tsx vía `node path/to/tsx/cli.mjs` en lugar del shim .cmd/.bin
// para evitar `spawn EINVAL` en Windows con Node ≥ 20 al ejecutar .cmd
// sin `shell: true`, y para no depender de cómo PATH resuelve el binario.
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Par (prompt → respuesta) para guiar la interacción.
 * Si `matcher` es null significa que no esperamos un prompt previo (respuesta
 * inicial), aunque en nuestro caso siempre esperamos al menos el prompt de
 * nombre antes de responder.
 */
interface Step {
  matcher: RegExp;
  answer: string;
}

interface PackageJson {
  name: string;
  description: string;
  version?: string;
  private?: boolean;
}

interface PostmanCollection {
  info: {
    name: string;
    description: string;
    _postman_id?: string;
    schema?: string;
  };
  item: unknown[];
}

function writeFileEnsured(fullPath: string, content: string): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function createFixtureWorkspace(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-template-'));

  writeFileEnsured(
    path.join(tempDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'nest-template',
        version: '0.0.1',
        description:
          'Template backend NestJS con identidad dual MySQL admin + PostgreSQL + Redis + JWT + Docker.',
        private: true,
      },
      null,
      2,
    )}\n`,
  );

  writeFileEnsured(
    path.join(tempDir, 'docker-compose.yml'),
    [
      'name: nest-template',
      'services:',
      '  app:',
      '    image: nest-template:latest',
      '    environment:',
      '      POSTGRES_DB: nest_template',
      '      POSTGRES_USER: nest_template_user',
      '      POSTGRES_PASSWORD: nest_template_password',
      '',
    ].join('\n'),
  );

  writeFileEnsured(
    path.join(tempDir, 'docker-compose.test.yml'),
    [
      'name: nest-template-test',
      'services:',
      '  app-test:',
      '    image: nest-template:latest',
      '    environment:',
      '      POSTGRES_DB: nest_template_test',
      '      POSTGRES_USER: nest_template_test_user',
      '      POSTGRES_PASSWORD: nest_template_test_password',
      '',
    ].join('\n'),
  );

  writeFileEnsured(
    path.join(tempDir, 'docker-compose.dev.yml'),
    [
      'name: nest-template',
      'services:',
      '  app:',
      '    image: nest-template:latest',
      '',
    ].join('\n'),
  );

  const envContent = [
    'NODE_ENV=development',
    'DATABASE_URL=postgresql://nest_template_user:nest_template_password@localhost:5432/nest_template',
    '',
  ].join('\n');
  const envTestContent = [
    'NODE_ENV=test',
    'DATABASE_URL=postgresql://nest_template_test_user:nest_template_test_password@localhost:5432/nest_template_test',
    '',
  ].join('\n');

  writeFileEnsured(path.join(tempDir, '.env.example'), envContent);
  writeFileEnsured(path.join(tempDir, '.env.docker.example'), envContent);
  writeFileEnsured(
    path.join(tempDir, '.env.test.docker.example'),
    envTestContent,
  );

  writeFileEnsured(
    path.join(tempDir, 'src', 'main.ts'),
    [
      "import { NestFactory } from '@nestjs/core';",
      "import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';",
      '',
      'async function bootstrap() {',
      '  const app = await NestFactory.create(AppModule);',
      '  const config = new DocumentBuilder()',
      "    .setTitle('Nest Template')",
      "    .setDescription('API del template Nest Template')",
      '    .build();',
      '  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));',
      '  await app.listen(3000);',
      '}',
      'bootstrap();',
      '',
    ].join('\n'),
  );

  writeFileEnsured(
    path.join(tempDir, 'README.md'),
    '# Nest Template\n\nProyecto basado en `nest-template`.\n',
  );
  writeFileEnsured(
    path.join(tempDir, 'DOCS.md'),
    '# Docs Nest Template\n\nDocumentación de nest-template.\n',
  );
  writeFileEnsured(
    path.join(tempDir, 'CLAUDE.md'),
    '# Nest Template (CLAUDE)\n',
  );
  writeFileEnsured(
    path.join(tempDir, 'AGENTS.md'),
    '# Nest Template (AGENTS)\n',
  );

  writeFileEnsured(
    path.join(tempDir, 'postman', 'nest-template.postman_collection.json'),
    `${JSON.stringify(
      {
        info: {
          name: 'Nest Template',
          _postman_id: 'b6b47f12-1b39-4fd4-bf01-4cdd3ebf8e14',
          description:
            'Colección base de endpoints del template: root y auth (login, me, refresh, logout).',
          schema:
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      },
      null,
      2,
    )}\n`,
  );

  writeFileEnsured(
    path.join(tempDir, 'configApp.ts'),
    '// Legacy configApp.ts — debe ser eliminado por initTemplate.\n',
  );

  fs.copyFileSync(SCRIPT_SRC, path.join(tempDir, 'initTemplate.ts'));

  return tempDir;
}

/**
 * Ejecuta `initTemplate.ts` dentro de `tempDir` como subproceso y responde cada
 * prompt cuando su matcher aparece en stdout. Esto evita carreras de readline
 * (escribir todas las respuestas de golpe hace que algunos eventos `line` se
 * emitan antes de que `rl.question` instale su listener, y los prompts
 * pendientes nunca resuelven).
 */
function runInit(tempDir: string, steps: Step[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      process.execPath,
      [TSX_CLI, 'initTemplate.ts'],
      {
        cwd: tempDir,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
        shell: false,
      },
    );

    let stdout = '';
    let stderr = '';
    let cursor = 0;
    let stepIdx = 0;

    const tryAdvance = (): void => {
      while (stepIdx < steps.length) {
        const step = steps[stepIdx];
        const match = step.matcher.exec(stdout.slice(cursor));
        if (!match) return;
        cursor += match.index + match[0].length;
        stepIdx += 1;
        child.stdin.write(`${step.answer}\n`);
      }
      // Todas las respuestas entregadas: cerramos stdin para permitir que el
      // script finalice limpiamente si aún queda código por ejecutar.
      if (!child.stdin.writableEnded) child.stdin.end();
    };

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
      tryAdvance();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function rmrf(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

describe('initTemplate.ts (e2e)', () => {
  let tempDir = '';

  afterEach(() => {
    rmrf(tempDir);
    tempDir = '';
  });

  it('personaliza todos los archivos con el nombre/slug provisto (happy path)', async () => {
    tempDir = createFixtureWorkspace();

    const steps: Step[] = [
      { matcher: /Nombre de la aplicación/, answer: 'Mi Backend API' },
      { matcher: /Slug kebab-case/, answer: 'mi-backend-api' },
      {
        matcher: /Descripción/,
        answer: 'Descripción personalizada de prueba.',
      },
      { matcher: /¿Aplicar estos cambios\?/, answer: 's' },
      { matcher: /¿Regenerar \.env/, answer: 's' },
    ];

    const result = await runInit(tempDir, steps);

    expect(result.code).toBe(0);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'),
    ) as PackageJson;
    expect(pkg.name).toBe('mi-backend-api');
    expect(pkg.description).toBe('Descripción personalizada de prueba.');

    const compose = fs.readFileSync(
      path.join(tempDir, 'docker-compose.yml'),
      'utf8',
    );
    expect(compose).toContain('name: mi-backend-api');
    expect(compose).toContain('image: mi-backend-api:latest');
    expect(compose).toContain('POSTGRES_DB: mi_backend_api');
    expect(compose).toContain('POSTGRES_USER: mi_backend_api_user');
    expect(compose).toContain('POSTGRES_PASSWORD: mi_backend_api_password');
    expect(compose).not.toMatch(/nest[-_]template/);

    const composeTest = fs.readFileSync(
      path.join(tempDir, 'docker-compose.test.yml'),
      'utf8',
    );
    expect(composeTest).toContain('name: mi-backend-api-test');
    expect(composeTest).toContain('POSTGRES_DB: mi_backend_api_test');
    expect(composeTest).toContain('POSTGRES_USER: mi_backend_api_test_user');
    expect(composeTest).toContain(
      'POSTGRES_PASSWORD: mi_backend_api_test_password',
    );
    expect(composeTest).not.toMatch(/nest[-_]template/);

    const envExample = fs.readFileSync(
      path.join(tempDir, '.env.example'),
      'utf8',
    );
    expect(envExample).toContain(
      'postgresql://mi_backend_api_user:mi_backend_api_password@localhost:5432/mi_backend_api',
    );
    expect(envExample).not.toMatch(/nest_template/);

    const envTestExample = fs.readFileSync(
      path.join(tempDir, '.env.test.docker.example'),
      'utf8',
    );
    expect(envTestExample).toContain(
      'postgresql://mi_backend_api_test_user:mi_backend_api_test_password@localhost:5432/mi_backend_api_test',
    );
    expect(envTestExample).not.toMatch(/nest_template/);

    const envRuntime = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
    expect(envRuntime).toBe(envExample);
    expect(fs.existsSync(path.join(tempDir, '.env.docker'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.env.test.docker'))).toBe(true);

    const main = fs.readFileSync(path.join(tempDir, 'src', 'main.ts'), 'utf8');
    expect(main).toContain(".setTitle('Mi Backend API')");
    expect(main).toContain('API del template Mi Backend API');
    expect(main).not.toMatch(/Nest Template/);

    const readme = fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8');
    expect(readme).toContain('# Mi Backend API');
    expect(readme).toContain('`mi-backend-api`');
    expect(readme).not.toMatch(/nest[-_]template/i);

    const docs = fs.readFileSync(path.join(tempDir, 'DOCS.md'), 'utf8');
    expect(docs).toContain('Mi Backend API');
    expect(docs).toContain('mi-backend-api');

    const renamedCollection = path.join(
      tempDir,
      'postman',
      'mi-backend-api.postman_collection.json',
    );
    const originalCollection = path.join(
      tempDir,
      'postman',
      'nest-template.postman_collection.json',
    );
    expect(fs.existsSync(renamedCollection)).toBe(true);
    expect(fs.existsSync(originalCollection)).toBe(false);

    const postman = JSON.parse(
      fs.readFileSync(renamedCollection, 'utf8'),
    ) as PostmanCollection;
    expect(postman.info.name).toBe('Mi Backend API');
    expect(postman.info.description).toContain('Mi Backend API');
    expect(postman.info.description).not.toMatch(/Nest Template/);

    // Auto-cleanup: initTemplate.ts y configApp.ts deben haber sido eliminados.
    expect(fs.existsSync(path.join(tempDir, 'initTemplate.ts'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'configApp.ts'))).toBe(false);
  }, 60_000);

  it('usa la descripción por defecto cuando se deja vacía y no copia .env si el usuario responde "n"', async () => {
    tempDir = createFixtureWorkspace();

    const steps: Step[] = [
      { matcher: /Nombre de la aplicación/, answer: 'Otra App' },
      // slug vacío → se deriva de toKebab(appName) = "otra-app"
      { matcher: /Slug kebab-case/, answer: '' },
      // descripción vacía → default
      { matcher: /Descripción/, answer: '' },
      { matcher: /¿Aplicar estos cambios\?/, answer: 's' },
      { matcher: /¿Regenerar \.env/, answer: 'n' },
    ];

    const result = await runInit(tempDir, steps);

    expect(result.code).toBe(0);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'),
    ) as PackageJson;
    expect(pkg.name).toBe('otra-app');
    expect(pkg.description).toContain(
      'Backend API basada en el template NestJS',
    );

    const envExample = fs.readFileSync(
      path.join(tempDir, '.env.example'),
      'utf8',
    );
    expect(envExample).toContain('otra_app_user');
    expect(envExample).toContain('otra_app_password');

    // No se regeneraron los runtime .env
    expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.env.docker'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.env.test.docker'))).toBe(false);

    expect(fs.existsSync(path.join(tempDir, 'initTemplate.ts'))).toBe(false);
  }, 60_000);

  it('rechaza un slug que no esté en kebab-case y no modifica el workspace', async () => {
    tempDir = createFixtureWorkspace();

    const pkgBefore = fs.readFileSync(
      path.join(tempDir, 'package.json'),
      'utf8',
    );
    const composeBefore = fs.readFileSync(
      path.join(tempDir, 'docker-compose.yml'),
      'utf8',
    );

    const steps: Step[] = [
      { matcher: /Nombre de la aplicación/, answer: 'Bad App' },
      { matcher: /Slug kebab-case/, answer: 'Bad_Slug!' },
      // Tras un slug inválido el script imprime un error y cierra rl sin
      // preguntar descripción; si readline llegase a pedir algo más, esta
      // respuesta dummy no causa daño porque stdin se cierra al final.
    ];

    const result = await runInit(tempDir, steps);

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/kebab-case/i);

    // No debió haberse modificado nada ni auto-eliminarse el script.
    expect(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')).toBe(
      pkgBefore,
    );
    expect(
      fs.readFileSync(path.join(tempDir, 'docker-compose.yml'), 'utf8'),
    ).toBe(composeBefore);
    expect(fs.existsSync(path.join(tempDir, 'initTemplate.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'configApp.ts'))).toBe(true);
  }, 60_000);

  it('cancela la operación cuando el usuario responde "n" a la confirmación', async () => {
    tempDir = createFixtureWorkspace();

    const pkgBefore = fs.readFileSync(
      path.join(tempDir, 'package.json'),
      'utf8',
    );

    const steps: Step[] = [
      { matcher: /Nombre de la aplicación/, answer: 'Mi App' },
      { matcher: /Slug kebab-case/, answer: 'mi-app' },
      { matcher: /Descripción/, answer: '' },
      { matcher: /¿Aplicar estos cambios\?/, answer: 'n' },
    ];

    const result = await runInit(tempDir, steps);

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/cancelada/i);

    expect(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')).toBe(
      pkgBefore,
    );
    expect(fs.existsSync(path.join(tempDir, 'initTemplate.ts'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'configApp.ts'))).toBe(true);
  }, 60_000);
});
