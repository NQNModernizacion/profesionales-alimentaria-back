/**
 * initTemplate.ts
 *
 * Script de inicialización del template NestJS.
 *
 * Pregunta nombre, slug y descripción de la nueva app, y actualiza:
 *   - package.json (name, description)
 *   - src/main.ts (Swagger title/description)
 *   - docker-compose.yml y docker-compose.test.yml (name, image, POSTGRES_*)
 *   - .env.example, .env.docker.example, .env.test.docker.example (DATABASE_URL)
 *   - postman/nest-template.postman_collection.json (renombrado + info.name/description)
 *   - README.md, DOCS.md, CLAUDE.md, AGENTS.md (reemplazo de slug/nombre)
 *
 * Opcionalmente copia los .example → .env, .env.docker, .env.test.docker.
 *
 * Al terminar se autoelimina (junto con configApp.ts legacy).
 *
 * Ejecución:
 *   pnpm tsx initTemplate.ts
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'

const COLORS = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
}

const DEFAULT_DESCRIPTION =
  'Backend API basada en el template NestJS (identidad dual MySQL admin + PostgreSQL + Redis + JWT + Docker).'

const DEFAULT_SLUG = 'nest-template'
const DEFAULT_NAME = 'Nest Template'
const DEFAULT_SNAKE = 'nest_template'

interface TemplateValues {
  appName: string
  appSlug: string
  appDescription: string
  snake: string
  dbName: string
  dbUser: string
  dbPassword: string
  dbNameTest: string
  dbUserTest: string
  dbPasswordTest: string
  composeName: string
  composeNameTest: string
  dockerImage: string
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

async function askRequired(label: string, hint: string): Promise<string> {
  while (true) {
    const value = await prompt(
      `${COLORS.cyan}${label} ${COLORS.reset}${COLORS.yellow}(${hint})${COLORS.reset}: `,
    )
    if (value) return value
    console.log(
      `${COLORS.red}Este campo no puede estar vacío. Intenta de nuevo.${COLORS.reset}`,
    )
  }
}

function toKebab(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function deriveValues(
  appName: string,
  appSlug: string,
  appDescription: string,
): TemplateValues {
  const snake = appSlug.replace(/-/g, '_')
  return {
    appName,
    appSlug,
    appDescription,
    snake,
    dbName: snake,
    dbUser: `${snake}_user`,
    dbPassword: `${snake}_password`,
    dbNameTest: `${snake}_test`,
    dbUserTest: `${snake}_test_user`,
    dbPasswordTest: `${snake}_test_password`,
    composeName: appSlug,
    composeNameTest: `${appSlug}-test`,
    dockerImage: `${appSlug}:latest`,
  }
}

/**
 * Reemplaza en `content` los tokens del template por los valores de la nueva app.
 *
 * El orden importa: snake ("nest_template") es prefijo de otros tokens; para evitar
 * que la sustitución rompa cadenas ya reemplazadas, usamos un reemplazo global sobre
 * cada variante textual completa. Como todos los derivados se construyen sobre snake
 * (`{snake}_user`, `{snake}_test`, etc.), basta con reemplazar `nest_template` por
 * `snake` — las subcadenas quedan bien encadenadas.
 */
function applyReplacements(content: string, v: TemplateValues): string {
  let next = content
  next = next.split(DEFAULT_SNAKE).join(v.snake)
  next = next.split(DEFAULT_SLUG).join(v.appSlug)
  next = next.split(DEFAULT_NAME).join(v.appName)
  return next
}

async function updateTextFile(
  absPath: string,
  v: TemplateValues,
): Promise<void> {
  if (!fs.existsSync(absPath)) return
  const original = await fs.promises.readFile(absPath, 'utf8')
  const updated = applyReplacements(original, v)
  if (updated !== original) {
    await fs.promises.writeFile(absPath, updated, 'utf8')
    console.log(
      `${COLORS.green}✓ Actualizado:${COLORS.reset} ${path.relative(__dirname, absPath)}`,
    )
  }
}

async function updatePackageJson(v: TemplateValues): Promise<void> {
  const pkgPath = path.join(__dirname, 'package.json')
  const raw = await fs.promises.readFile(pkgPath, 'utf8')
  const pkg = JSON.parse(raw)
  pkg.name = v.appSlug
  pkg.description = v.appDescription
  await fs.promises.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  console.log(`${COLORS.green}✓ Actualizado:${COLORS.reset} package.json`)
}

async function updatePostmanCollection(v: TemplateValues): Promise<void> {
  const postmanDir = path.join(__dirname, 'postman')
  if (!fs.existsSync(postmanDir)) return

  const defaultName = `${DEFAULT_SLUG}.postman_collection.json`
  const targetName = `${v.appSlug}.postman_collection.json`
  const defaultPath = path.join(postmanDir, defaultName)
  const targetPath = path.join(postmanDir, targetName)

  // Encuentra la colección: preferir el nombre por defecto; si no, cualquier .postman_collection.json.
  let sourcePath: string | null = null
  if (fs.existsSync(defaultPath)) {
    sourcePath = defaultPath
  } else {
    const entries = await fs.promises.readdir(postmanDir)
    const match = entries.find((e) => e.endsWith('.postman_collection.json'))
    if (match) sourcePath = path.join(postmanDir, match)
  }
  if (!sourcePath) return

  const raw = await fs.promises.readFile(sourcePath, 'utf8')
  const json = JSON.parse(raw)
  if (json.info) {
    json.info.name = v.appName
    json.info.description = `Colección base de endpoints de ${v.appName}: root y auth (login, me, refresh, logout).`
  }
  await fs.promises.writeFile(sourcePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8')

  if (sourcePath !== targetPath) {
    await fs.promises.rename(sourcePath, targetPath)
  }
  console.log(
    `${COLORS.green}✓ Actualizado:${COLORS.reset} postman/${targetName}`,
  )
}

async function copyEnvFiles(): Promise<void> {
  const pairs: Array<[string, string]> = [
    ['.env.example', '.env'],
    ['.env.docker.example', '.env.docker'],
    ['.env.test.docker.example', '.env.test.docker'],
  ]
  for (const [src, dest] of pairs) {
    const srcPath = path.join(__dirname, src)
    const destPath = path.join(__dirname, dest)
    if (!fs.existsSync(srcPath)) {
      console.log(
        `${COLORS.yellow}⚠ Saltado:${COLORS.reset} ${src} no existe`,
      )
      continue
    }
    const content = await fs.promises.readFile(srcPath, 'utf8')
    await fs.promises.writeFile(destPath, content, 'utf8')
    console.log(`${COLORS.green}✓ Creado:${COLORS.reset} ${dest}`)
  }
}

async function selfCleanup(): Promise<void> {
  // Elimina configApp.ts legacy (pertenece al template anterior de frontend) y este mismo script.
  const legacy = path.join(__dirname, 'configApp.ts')
  if (fs.existsSync(legacy)) {
    try {
      await fs.promises.unlink(legacy)
      console.log(`${COLORS.green}✓ Eliminado:${COLORS.reset} configApp.ts`)
    } catch (err) {
      console.error(
        `${COLORS.red}No se pudo eliminar configApp.ts:${COLORS.reset}`,
        err,
      )
    }
  }
  try {
    await fs.promises.unlink(__filename)
    console.log(
      `${COLORS.green}✓ Eliminado:${COLORS.reset} ${path.basename(__filename)}`,
    )
  } catch (err) {
    console.error(
      `${COLORS.red}No se pudo autoeliminar el script:${COLORS.reset}`,
      err,
    )
  }
}

async function main(): Promise<void> {
  console.log(
    `${COLORS.bold}${COLORS.green}Inicialización del template NestJS${COLORS.reset}\n`,
  )
  console.log(
    `Este script personaliza el template con el nombre, slug y descripción de tu nueva app.\n`,
  )

  try {
    const appName = await askRequired(
      'Nombre de la aplicación',
      'ej. Mi Backend API',
    )
    const suggestedSlug = toKebab(appName) || 'mi-app'
    const slugAnswer = await prompt(
      `${COLORS.cyan}Slug kebab-case ${COLORS.reset}${COLORS.yellow}(por defecto: ${suggestedSlug})${COLORS.reset}: `,
    )
    const appSlug = slugAnswer || suggestedSlug

    const descAnswer = await prompt(
      `${COLORS.cyan}Descripción ${COLORS.reset}${COLORS.yellow}(Enter para la descripción por defecto)${COLORS.reset}: `,
    )
    const appDescription = descAnswer || DEFAULT_DESCRIPTION

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(appSlug)) {
      console.log(
        `${COLORS.red}El slug debe estar en kebab-case (solo minúsculas, números y guiones). Recibido: ${appSlug}${COLORS.reset}`,
      )
      rl.close()
      return
    }

    const values = deriveValues(appName, appSlug, appDescription)

    console.log(`\n${COLORS.bold}Valores derivados:${COLORS.reset}`)
    console.log(`  Nombre:         ${COLORS.cyan}${values.appName}${COLORS.reset}`)
    console.log(`  Slug:           ${COLORS.cyan}${values.appSlug}${COLORS.reset}`)
    console.log(`  Compose base:   ${COLORS.cyan}${values.composeName}${COLORS.reset}`)
    console.log(`  Compose tests:  ${COLORS.cyan}${values.composeNameTest}${COLORS.reset}`)
    console.log(`  Imagen Docker:  ${COLORS.cyan}${values.dockerImage}${COLORS.reset}`)
    console.log(`  Postgres DB:    ${COLORS.cyan}${values.dbName}${COLORS.reset}`)
    console.log(`  Postgres user:  ${COLORS.cyan}${values.dbUser}${COLORS.reset}`)
    console.log(`  Postgres pass:  ${COLORS.cyan}${values.dbPassword}${COLORS.reset}`)
    console.log(`  Test DB:        ${COLORS.cyan}${values.dbNameTest}${COLORS.reset}`)
    console.log(`  Test user:      ${COLORS.cyan}${values.dbUserTest}${COLORS.reset}`)
    console.log(`  Test pass:      ${COLORS.cyan}${values.dbPasswordTest}${COLORS.reset}`)

    const confirm = await prompt(
      `\n${COLORS.cyan}¿Aplicar estos cambios? (s/n): ${COLORS.reset}`,
    )
    const yes = ['s', 'si', 'sí', 'y', 'yes'].includes(confirm.toLowerCase())
    if (!yes) {
      console.log(`${COLORS.yellow}Operación cancelada.${COLORS.reset}`)
      rl.close()
      return
    }

    console.log(`\n${COLORS.bold}Actualizando archivos...${COLORS.reset}`)

    const filesToPatch = [
      'docker-compose.yml',
      'docker-compose.test.yml',
      'docker-compose.dev.yml',
      '.env',
      '.env.example',
      '.env.docker',
      '.env.docker.example',
      '.env.test.docker',
      '.env.test.docker.example',
      'src/main.ts',
      'README.md',
      'DOCS.md',
      'CLAUDE.md',
      'AGENTS.md',
    ]

    for (const rel of filesToPatch) {
      await updateTextFile(path.join(__dirname, rel), values)
    }

    await updatePackageJson(values)
    await updatePostmanCollection(values)

    console.log(
      `\n${COLORS.bold}${COLORS.green}Archivos base actualizados.${COLORS.reset}`,
    )

    const copyAns = await prompt(
      `\n${COLORS.cyan}¿Regenerar .env, .env.docker y .env.test.docker desde los .example? ${COLORS.bold}(sobrescribe si existen)${COLORS.reset} (s/n): `,
    )
    if (['s', 'si', 'sí', 'y', 'yes'].includes(copyAns.toLowerCase())) {
      console.log(
        `\n${COLORS.yellow}Copiando .example → runtime...${COLORS.reset}`,
      )
      await copyEnvFiles()
    } else {
      console.log(
        `${COLORS.yellow}Se omitió la regeneración de archivos .env.${COLORS.reset}`,
      )
    }

    console.log(
      `\n${COLORS.bold}${COLORS.green}Template personalizado correctamente.${COLORS.reset}`,
    )
    console.log(
      `${COLORS.yellow}Revisa los valores sensibles (JWT_SECRET, contraseñas de BD, BOOTSTRAP_ADMIN_EMAIL) antes de desplegar.${COLORS.reset}`,
    )

    rl.close()
    await selfCleanup()
  } catch (error) {
    console.error(
      `${COLORS.red}Error durante la ejecución:${COLORS.reset}`,
      error,
    )
    rl.close()
    process.exit(1)
  }
}

void main()
