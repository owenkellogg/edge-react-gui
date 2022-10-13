import Sound from 'react-native-sound'

let receiveSoundPromise: Promise<Sound> | undefined
let sendSoundPromise: Promise<Sound> | undefined
Sound.setCategory('Ambient')

export async function playReceiveSound(): Promise<void> {
  if (!receiveSoundPromise) receiveSoundPromise = loadSound('audio_received.mp3')
  return receiveSoundPromise.then(playSound)
}

export async function playSendSound(): Promise<void> {
  if (!sendSoundPromise) sendSoundPromise = loadSound('audio_sent.mp3')
  return sendSoundPromise.then(playSound)
}

/**
 * Turn the node-style Sound constructor into a promise.
 */
// @ts-expect-error
async function loadSound(name): Promise<Sound> {
  return new Promise((resolve, reject) => {
    // @ts-expect-error
    const sound = new Sound(name, Sound.MAIN_BUNDLE, error => (error ? reject(error) : resolve(sound)))
  })
}

/**
 * Turn the node-style Sound.play method into a promise.
 */
async function playSound(sound: Sound): Promise<void> {
  return new Promise((resolve, reject) => {
    sound.play(success => (success ? resolve() : new Error('Could not play sound')))
  })
}
