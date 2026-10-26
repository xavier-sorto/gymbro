type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;

function audioConstructor(): AudioContextConstructor | undefined {
  const scope = window as unknown as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/** Call from a tap (Save set): iPhone only lets audio start after a tap. */
export function unlockAudio(): void {
  try {
    const Constructor = audioConstructor();
    if (!Constructor) return;
    context ??= new Constructor();
    if (context.state === 'suspended') void context.resume();
  } catch (error) {
    console.warn('GymBro: audio could not be unlocked; the rest timer will not beep', error);
  }
}

/** A short beep. A blocked or silent phone just stays quiet; the bar still flashes. */
export function playBeep(): void {
  try {
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch (error) {
    console.warn('GymBro: the rest timer beep could not play', error);
  }
}
