#!/usr/bin/env node
/**
 * App Android (Capacitor) : construire, installer, ouvrir. Mode d'emploi : docs/android.md.
 *
 *   npm run android -- build      construit le site et le recopie dans android/ (cap sync)
 *   npm run android -- apk        + APK de développement (android/app/build/outputs/apk/debug)
 *   npm run android -- run        + l'installe et l'ouvre sur le téléphone branché ou l'émulateur
 *   npm run android -- emulator   démarre le premier émulateur (ou celui passé après --avd)
 *   npm run android -- open       ouvre le projet dans Android Studio
 *   npm run android -- assets     icônes et écrans de démarrage (scripts/android-assets.mjs)
 *
 *   --staging   l'app parle à la préproduction (.env.staging.local) au lieu de la production.
 *
 * Exige : JDK 21 (JAVA_HOME) et le SDK Android (ANDROID_HOME).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const ANDROID = join(APP, 'android')
const APP_ID = 'com.wodbud.app'
const WIN = process.platform === 'win32'

const args = process.argv.slice(2)
const command = args.find((a) => !a.startsWith('--')) ?? 'help'
const staging = args.includes('--staging')
const avdIndex = args.indexOf('--avd')
const avd = avdIndex >= 0 ? args[avdIndex + 1] : null

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

/** Lance une commande et s'arrête si elle échoue. Windows : .cmd/.bat passent par le shell. */
function run(cmd, cmdArgs, options = {}) {
  console.log(`\n› ${cmd} ${cmdArgs.join(' ')}`)
  const r = spawnSync(cmd, cmdArgs, { cwd: APP, stdio: 'inherit', shell: WIN, ...options })
  if (r.status !== 0) fail(`${cmd} a échoué (code ${r.status}).`)
}

function output(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: APP, encoding: 'utf8', shell: WIN })
  return r.status === 0 ? r.stdout.trim() : ''
}

/** adb, emulator : des exécutables, lancés sans shell (le chemin du SDK peut contenir des espaces). */
function sdkTool(dir, name) {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!home) fail('ANDROID_HOME n’est pas défini (dossier du SDK Android).')
  return join(home, dir, WIN ? `${name}.exe` : name)
}

function sdk(dir, name, cmdArgs) {
  run(sdkTool(dir, name), cmdArgs, { shell: false })
}

function sdkOutput(dir, name, cmdArgs) {
  const r = spawnSync(sdkTool(dir, name), cmdArgs, { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : ''
}

function build() {
  const sha = output('git', ['rev-parse', '--short=7', 'HEAD']) || 'local'
  // Notifications (A4) : seulement si le fichier du projet Firebase est là,
  // sinon demander un jeton ferait planter le plugin (docs/android.md).
  const push = existsSync(join(ANDROID, 'app', 'google-services.json'))
  // Suivi des erreurs (4.5) : « android-<commit> » distingue l'app du site.
  const env = { ...process.env, WODBUD_APP_VERSION: `android-${sha}`, VITE_NATIVE_PUSH: push ? 'on' : 'off' }
  run('npx', ['vite', 'build', ...(staging ? ['--mode', 'staging'] : [])], { env })
  run('npx', ['cap', 'sync', 'android'])
  console.log(`\n✓ Site recopié dans android/ (${staging ? 'préproduction' : 'production'}, android-${sha}, notifications ${push ? 'actives' : 'absentes : pas de google-services.json'}).`)
}

function apk() {
  build()
  run(join(ANDROID, WIN ? 'gradlew.bat' : 'gradlew'), ['assembleDebug'], { cwd: ANDROID })
  const file = join(ANDROID, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  if (!existsSync(file)) fail('APK introuvable après la construction.')
  console.log(`\n✓ APK de développement : ${file}`)
  return file
}

function devices() {
  return sdkOutput('platform-tools', 'adb', ['devices'])
    .split(/\r?\n/).slice(1).filter((l) => /\tdevice$/.test(l)).map((l) => l.split('\t')[0])
}

function startEmulator() {
  const name = avd ?? sdkOutput('emulator', 'emulator', ['-list-avds']).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0]
  if (!name) fail('Aucun émulateur : en créer un dans Android Studio (Device Manager).')
  console.log(`\n› émulateur ${name} (il démarre en arrière-plan)`)
  spawn(sdkTool('emulator', 'emulator'), ['-avd', name, '-no-boot-anim'], { detached: true, stdio: 'ignore' }).unref()
}

function install() {
  const file = apk()
  if (devices().length === 0) fail('Aucun appareil : brancher un téléphone (débogage USB) ou `npm run android -- emulator`.')
  sdk('platform-tools', 'adb', ['install', '-r', file])
  sdk('platform-tools', 'adb', ['shell', 'am', 'start', '-n', `${APP_ID}/.MainActivity`])
  console.log('\n✓ WODBUD ouverte. Inspecter la page : chrome://inspect dans Chrome.')
}

switch (command) {
  case 'build': build(); break
  case 'apk': apk(); break
  case 'run': install(); break
  case 'emulator': startEmulator(); break
  case 'open': run('npx', ['cap', 'open', 'android']); break
  case 'assets': run('node', ['scripts/android-assets.mjs']); break
  default:
    console.log(readUsage())
}

function readUsage() {
  return 'npm run android -- build | apk | run | emulator | open | assets   [--staging] [--avd <nom>]'
}
