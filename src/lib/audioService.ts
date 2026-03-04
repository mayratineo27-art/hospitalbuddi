// src/lib/audioService.ts

const context = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playTone(
    frequency: number,
    type: OscillatorType = "square",
    duration: number = 0.1,
    vol: number = 0.1
) {
    if (context.state === "suspended") {
        context.resume();
    }
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);

    // Attack-decay envelope to avoid clicking
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(vol, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
}

export function playCoinSound() {
    playTone(880, "square", 0.05, 0.05); // A5
    setTimeout(() => playTone(1318.51, "square", 0.15, 0.05), 50); // E6
}

export function playHitSound() {
    playTone(200, "sawtooth", 0.1, 0.1);
    setTimeout(() => playTone(150, "sawtooth", 0.1, 0.1), 30);
    setTimeout(() => playTone(100, "sawtooth", 0.1, 0.1), 60);
}

export function playJumpSound() {
    playTone(400, "sine", 0.1, 0.05);
    setTimeout(() => playTone(600, "sine", 0.1, 0.05), 50);
}

export function playClickSound() {
    playTone(600, "sine", 0.02, 0.03);
}
