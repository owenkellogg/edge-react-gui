import childProcess from 'child_process'
import fs from 'fs'
import { join } from 'path'
import { sprintf } from 'sprintf-js'

const argv = process.argv
const mylog = console.log

const _rootProjectDir = join(__dirname, '../')

let _currentPath = __dirname

/**
 * Things we expect to be set in the config file:
 */
type BuildConfigFile = {
  // Common build options:
  envJson: { [repoBranch: string]: object }

  // Android build options:
  androidKeyStore: string
  androidKeyStoreAlias: string
  androidKeyStorePassword: string
  androidTask: string

  // iOS build options:
  appleDeveloperTeamId: string
  xcodeScheme: string
  xcodeWorkspace: string

  // Upload options:
  appCenterApiToken: string
  appCenterAppName: string
  appCenterDistroGroup: string
  appCenterGroupName: string
  bugsnagApiKey: string
  hockeyAppId: string
  hockeyAppTags: string
  hockeyAppToken: string
  productName: string
  projectName: string
}

/**
 * These are basically global variables:
 */
interface BuildObj extends BuildConfigFile {
  // Set in makeCommonPre:
  guiDir: string
  guiPlatformDir: string
  platformType: string // 'android' | 'ios'
  repoBranch: string // 'develop' | 'master' | 'test'
  tmpDir: string
  buildArchivesDir: string
  bundleToolPath: string

  // Set in makeCommonPost:
  buildNum: string
  bundleMapFile: string
  bundlePath: string
  bundleUrl: string
  guiHash: string
  version: string

  // Set in build steps:
  dSymFile: string
  dSymZip: string
  ipaFile: string // Also APK
}

main()

function main() {
  if (argv.length < 4) {
    mylog('Usage: node -r sucrase/register deploy.ts [project] [platform] [branch]')
    mylog('  project options: edge')
    mylog('  platform options: ios, android')
    mylog('  network options: master, develop')
  }

  const buildObj: BuildObj = {} as any

  makeCommonPre(argv, buildObj)
  makeProject(buildObj)
  makeCommonPost(buildObj)

  // buildCommonPre()
  if (argv[3] === 'ios') {
    buildIos(buildObj)
  } else if (argv[3] === 'android') {
    buildAndroid(buildObj)
  }
  buildCommonPost(buildObj)
}

function makeCommonPre(argv: string[], buildObj: BuildObj) {
  buildObj.guiDir = _rootProjectDir
  buildObj.repoBranch = argv[4] // master or develop
  buildObj.platformType = argv[3] // ios or android
  buildObj.projectName = argv[2]
  buildObj.guiPlatformDir = buildObj.guiDir + '/' + buildObj.platformType
  buildObj.tmpDir = `${buildObj.guiDir}/temp`
  buildObj.buildArchivesDir = '/Users/jenkins/buildArchives'
}

function makeProject(buildObj: BuildObj) {
  const project = buildObj.projectName
  const config = JSON.parse(fs.readFileSync(`${buildObj.guiDir}/deploy-config.json`, 'utf8'))

  Object.assign(buildObj, config[project])
  Object.assign(buildObj, config[project][buildObj.platformType])
  Object.assign(buildObj, config[project][buildObj.platformType][buildObj.repoBranch])

  console.log(buildObj)
}

function makeCommonPost(buildObj: BuildObj) {
  if (buildObj.envJson != null) {
    const envJsonPath = buildObj.guiDir + '/env.json'
    let envJson = {}
    if (fs.existsSync(envJsonPath)) {
      envJson = JSON.parse(fs.readFileSync(envJsonPath, 'utf8'))
    }
    envJson = { ...envJson, ...buildObj.envJson[buildObj.repoBranch] }
    fs.chmodSync(envJsonPath, 0o600)
    fs.writeFileSync(envJsonPath, JSON.stringify(envJson, null, 2))
  }

  const buildVersionFile = buildObj.guiDir + '/release-version.json'
  const buildVersionJson = JSON.parse(fs.readFileSync(buildVersionFile, 'utf8'))
  buildObj.buildNum = buildVersionJson.build
  buildObj.version = buildVersionJson.version

  chdir(buildObj.guiDir)
  buildObj.guiHash = rmNewline(cmd('git rev-parse --short HEAD'))

  if (buildObj.platformType === 'android') {
    buildObj.bundlePath = `${buildObj.guiPlatformDir}/app/build/intermediates/assets/release/index.android.bundle`
    buildObj.bundleUrl = 'index.android.bundle'
    buildObj.bundleMapFile = '../android-release.bundle.map'
  } else if (buildObj.platformType === 'ios') {
    buildObj.bundlePath = `${buildObj.guiPlatformDir}/main.jsbundle`
    buildObj.bundleUrl = 'main.jsbundle'
    buildObj.bundleMapFile = '../ios-release.bundle.map'
  }
}

// function buildCommonPre() {
//   call('npm install -g appcenter-cli')
// }

function buildIos(buildObj: BuildObj) {
  chdir(buildObj.guiDir)

  const patchDir = getPatchDir(buildObj)
  if (fs.existsSync(join(patchDir, 'GoogleService-Info.plist'))) {
    call(`cp -a ${join(patchDir, 'GoogleService-Info.plist')} ios/edge/`)
  } else if (fs.existsSync(`${buildObj.guiDir}/GoogleService-Info.plist`)) {
    call(`cp -a ${buildObj.guiDir}/GoogleService-Info.plist ${buildObj.guiPlatformDir}/edge/`)
  }

  // Bug fixes for React Native 0.46
  call('mkdir -p node_modules/react-native/scripts/')
  call('mkdir -p node_modules/react-native/packager/')
  call('cp -a node_modules/react-native/scripts/* node_modules/react-native/packager/')
  call('cp -a node_modules/react-native/packager/* node_modules/react-native/scripts/')
  // call('cp -a ../third-party node_modules/react-native/')
  // chdir(buildObj.guiDir + '/node_modules/react-native/third-party/glog-0.3.4')
  // call('../../scripts/ios-configure-glog.sh')

  // chdir(buildObj.guiDir)
  // call('react-native bundle --dev false --entry-file index.ios.js --bundle-output ios/main.jsbundle --platform ios')

  chdir(buildObj.guiPlatformDir)

  let cmdStr

  cmdStr = `security unlock-keychain -p '${process.env.KEYCHAIN_PASSWORD || ''}' "${process.env.HOME || ''}/Library/Keychains/login.keychain"`
  call(cmdStr)

  call(`security set-keychain-settings -l ${process.env.HOME || ''}/Library/Keychains/login.keychain`)

  cmdStr = `xcodebuild -workspace ${buildObj.xcodeWorkspace} -scheme ${buildObj.xcodeScheme} archive`
  if (process.env.DISABLE_XCPRETTY === 'false') cmdStr = cmdStr + ' | xcpretty'
  cmdStr = cmdStr + ' && exit ${PIPE' + 'STATUS[0]}'
  call(cmdStr)

  const buildDate = builddate()
  const buildDir = `${process.env.HOME || ''}/Library/Developer/Xcode/Archives/${buildDate}`

  chdir(buildDir)
  let archiveDir = cmd('ls -t')
  const archiveDirArray = archiveDir.split('\n')
  archiveDir = archiveDirArray[0]

  buildObj.dSymFile = escapePath(`${buildDir}/${archiveDir}/dSYMs/${buildObj.productName}.app.dSYM`)
  // const appFile = sprintf('%s/%s/Products/Applications/%s.app', buildDir, archiveDir, buildObj.xcodeScheme)
  buildObj.dSymZip = escapePath(`${buildObj.tmpDir}/${buildObj.productName}.dSYM.zip`)
  buildObj.ipaFile = escapePath(`${buildObj.tmpDir}/${buildObj.productName}.ipa`)

  if (fs.existsSync(buildObj.ipaFile)) {
    call('rm ' + buildObj.ipaFile)
  }

  if (fs.existsSync(buildObj.dSymZip)) {
    call('rm ' + buildObj.dSymZip)
  }

  mylog('Creating IPA for ' + buildObj.xcodeScheme)
  chdir(buildObj.guiPlatformDir)

  // Replace TeamID in exportOptions.plist
  let plist = fs.readFileSync(buildObj.guiPlatformDir + '/exportOptions.plist', { encoding: 'utf8' })
  plist = plist.replace('Your10CharacterTeamId', buildObj.appleDeveloperTeamId)
  fs.writeFileSync(buildObj.guiPlatformDir + '/exportOptions.plist', plist)

  cmdStr = `security unlock-keychain -p '${process.env.KEYCHAIN_PASSWORD || ''}'  "${process.env.HOME || ''}/Library/Keychains/login.keychain"`
  call(cmdStr)

  call(`security set-keychain-settings -l ${process.env.HOME || ''}/Library/Keychains/login.keychain`)

  cmdStr = `xcodebuild -exportArchive -archivePath "${buildDir}/${archiveDir}" -exportPath ${buildObj.tmpDir}/ -exportOptionsPlist ./exportOptions.plist`
  call(cmdStr)

  mylog('Zipping dSYM for ' + buildObj.xcodeScheme)
  cmdStr = `/usr/bin/zip -r ${buildObj.dSymZip} ${buildObj.dSymFile}`
  call(cmdStr)

  cmdStr = `cp -a "${buildDir}/${archiveDir}/Products/Applications/${buildObj.productName}.app/main.jsbundle" ${buildObj.guiPlatformDir}/`
  call(cmdStr)
}

function buildAndroid(buildObj: BuildObj) {
  const {
    buildArchivesDir,
    buildNum,
    platformType,
    repoBranch,
    guiPlatformDir,
    bundleToolPath,
    androidKeyStore,
    androidKeyStoreAlias,
    androidKeyStorePassword
  } = buildObj

  const keyStoreFile = join('/', _rootProjectDir, 'keystores', androidKeyStore)
  const patchDir = getPatchDir(buildObj)

  if (fs.existsSync(join(patchDir, 'google-services.json'))) {
    call(`cp -a ${join(patchDir, 'google-services.json')} android/app/`)
  } else if (fs.existsSync(`${buildObj.guiDir}/google-services.json`)) {
    call(`cp -a ${buildObj.guiDir}/google-services.json ${buildObj.guiPlatformDir}/app/`)
  }

  chdir(buildObj.guiDir)

  process.env.ORG_GRADLE_PROJECT_storeFile = keyStoreFile
  process.env.ORG_GRADLE_PROJECT_storePassword = buildObj.androidKeyStorePassword
  process.env.ORG_GRADLE_PROJECT_keyAlias = buildObj.androidKeyStoreAlias
  process.env.ORG_GRADLE_PROJECT_keyPassword = buildObj.androidKeyStorePassword

  chdir(buildObj.guiPlatformDir)
  call('./gradlew clean')
  call('./gradlew signingReport')
  call(sprintf('./gradlew %s', buildObj.androidTask))

  // Process the AAB files created into APK format and place in archive directory
  const archiveDir = join(buildArchivesDir, repoBranch, platformType, String(buildNum))
  fs.mkdirSync(archiveDir, { recursive: true })
  const aabPath = join(archiveDir, 'app-release.aab')
  const apksPath = join(archiveDir, 'app-release.apks')
  const apkPathDir = join(archiveDir, 'apk_container')
  fs.copyFileSync(join(guiPlatformDir, '/app/build/outputs/bundle/release/app-release.aab'), aabPath)

  call(
    `java -jar ${bundleToolPath} build-apks --overwrite --mode=universal --bundle=${aabPath} --output=${apksPath} --ks=${keyStoreFile} --ks-key-alias=${androidKeyStoreAlias} --ks-pass=pass:${androidKeyStorePassword}`
  )
  call(`unzip ${apksPath} -d ${apkPathDir}`)

  buildObj.ipaFile = join(apkPathDir, 'universal.apk')
}

function buildCommonPost(buildObj: BuildObj) {
  let curl
  const notes = `${buildObj.productName} ${buildObj.version} (${buildObj.buildNum}) branch: ${buildObj.repoBranch} #${buildObj.guiHash}`

  if (buildObj.hockeyAppToken && buildObj.hockeyAppId) {
    mylog('\n\nUploading to HockeyApp')
    mylog('**********************\n')
    const url = sprintf('https://rink.hockeyapp.net/api/2/apps/%s/app_versions/upload', buildObj.hockeyAppId)

    curl = sprintf(
      '/usr/bin/curl -F ipa=@%s -H "X-HockeyAppToken: %s" -F "notes_type=1" -F "status=2" -F "notify=0" -F "tags=%s" -F "notes=%s" ',
      buildObj.ipaFile,
      buildObj.hockeyAppToken,
      buildObj.hockeyAppTags,
      notes
    )

    if (buildObj.dSymZip !== undefined) {
      curl += sprintf('-F dsym=@%s ', buildObj.dSymZip)
    }

    curl += url

    call(curl)
    mylog('\nUploaded to HockeyApp')
  }

  if (buildObj.bugsnagApiKey && buildObj.dSymFile) {
    mylog('\n\nUploading to Bugsnag')
    mylog('*********************\n')

    const cpa = `cp -a ${buildObj.dSymFile}/Contents/Resources/DWARF/${escapePath(buildObj.productName)} ${buildObj.tmpDir}/`
    call(cpa)
    curl =
      '/usr/bin/curl https://upload.bugsnag.com/ ' +
      `-F dsym=@${buildObj.tmpDir}/${escapePath(buildObj.productName)} ` +
      `-F projectRoot=${buildObj.guiPlatformDir}`
    call(curl)
  }

  if (buildObj.appCenterApiToken && buildObj.appCenterAppName && buildObj.appCenterGroupName) {
    mylog('\n\nUploading to App Center')
    mylog('***********************\n')

    call(
      `npx appcenter distribute release --app ${buildObj.appCenterGroupName}/${buildObj.appCenterAppName} --file ${buildObj.ipaFile} --token ${
        buildObj.appCenterApiToken
      } -g ${buildObj.appCenterDistroGroup} -r ${JSON.stringify(notes)}`
    )
    mylog('\n*** Upload to App Center Complete ***')
  }
}

function builddate() {
  const date = new Date()

  const dateStr = sprintf('%d-%02d-%02d', date.getFullYear(), date.getMonth() + 1, date.getDate())
  return dateStr
}

function rmNewline(text: string) {
  return text.replace(/(\r\n|\n|\r)/gm, '')
}

function chdir(path: string) {
  console.log('chdir: ' + path)
  _currentPath = path
}

function call(cmdstring: string) {
  console.log('call: ' + cmdstring)
  childProcess.execSync(cmdstring, {
    encoding: 'utf8',
    timeout: 3600000,
    stdio: 'inherit',
    cwd: _currentPath,
    killSignal: 'SIGKILL'
  })
}

function cmd(cmdstring: string) {
  console.log('cmd: ' + cmdstring)
  const r = childProcess.execSync(cmdstring, {
    encoding: 'utf8',
    timeout: 3600000,
    cwd: _currentPath,
    killSignal: 'SIGKILL'
  })
  return r
}

function getPatchDir(buildObj: BuildObj): string {
  const { projectName, guiDir, repoBranch } = buildObj
  return join(guiDir, 'deployPatches', projectName, repoBranch)
}

function escapePath(path: string): string {
  return path.replace(/(\s+)/g, '\\$1')
}
