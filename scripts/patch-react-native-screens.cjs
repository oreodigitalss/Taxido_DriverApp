const fs = require('node:fs')
const path = require('node:path')

const modulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-screens',
  'android',
  'src',
  'main',
  'java',
  'com',
  'swmansion',
  'rnscreens',
  'ScreensModule.kt',
)

if (!fs.existsSync(modulePath)) {
  console.warn('[postinstall] react-native-screens Android source not found; skipping local Fabric guard.')
  process.exit(0)
}

let source = fs.readFileSync(modulePath, 'utf8')
if (source.includes('private var isFabricListenerRegistered = false')) {
  process.exit(0)
}

const replacements = [
  [
    '    private var proxy: NativeProxy? = null\n',
    '    private var proxy: NativeProxy? = null\n    private var isFabricListenerRegistered = false\n',
  ],
  [
    '            proxy = null\n\n            reactContext.removeLifecycleEventListener(this)',
    '            proxy = null\n            isFabricListenerRegistered = false\n\n            reactContext.removeLifecycleEventListener(this)',
  ],
  [
    '        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {\n            val fabricUIManager =',
    '        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED && !isFabricListenerRegistered) {\n            val fabricUIManager =',
  ],
  [
    '                nativeAddMutationsListener(fabricUIManager)\n',
    '                nativeAddMutationsListener(fabricUIManager)\n                isFabricListenerRegistered = true\n',
  ],
]

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    console.error('[postinstall] Could not apply the react-native-screens Fabric guard; source layout changed.')
    process.exit(1)
  }
  source = source.replace(before, after)
}

fs.writeFileSync(modulePath, source)
console.log('[postinstall] Applied the react-native-screens Fabric listener guard for this app.')
