/**
 * ===========================================
 * Sound Effects Module
 * Retro-style synthesized audio using Web Audio API
 * ===========================================
 * 
 * No external audio files needed - all sounds are
 * generated programmatically for that authentic
 * 8-bit arcade feel!
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initialized = false;
    }
    
    /**
     * Initialize the audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('[Sound] Audio system initialized');
        } catch (e) {
            console.warn('[Sound] Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
    
    /**
     * Create an oscillator with envelope
     */
    createOscillator(type, frequency, duration, volumeMod = 1) {
        if (!this.enabled || !this.audioContext) return null;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        gain.gain.value = this.volume * volumeMod;
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        return { osc, gain, duration };
    }
    
    /**
     * Play a simple tone
     */
    playTone(type, frequency, duration, volumeMod = 1) {
        const sound = this.createOscillator(type, frequency, duration, volumeMod);
        if (!sound) return;
        
        const { osc, gain } = sound;
        const now = this.audioContext.currentTime;
        
        // Fade out
        gain.gain.setValueAtTime(this.volume * volumeMod, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    }
    
    // ===========================================
    // Game Sound Effects
    // ===========================================
    
    /**
     * Player shoots
     */
    shoot() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    /**
     * Player shoots laser
     */
    shootLaser() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        
        gain.gain.setValueAtTime(this.volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    
    /**
     * Player shoots missile
     */
    shootMissile() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
    
    /**
     * Spread shot
     */
    shootSpread() {
        if (!this.enabled || !this.audioContext) return;
        
        [400, 500, 600].forEach((freq, i) => {
            setTimeout(() => {
                this.playTone('square', freq, 0.08, 0.25);
            }, i * 20);
        });
    }
    
    /**
     * Enemy destroyed
     */
    enemyHit() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Noise burst for explosion
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        
        const noise = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        noise.start(now);
        
        // Add a tone underneath
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        
        oscGain.gain.setValueAtTime(this.volume * 0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(oscGain);
        oscGain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    
    /**
     * Player hit / lose life
     */
    playerHit() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Descending tone
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        
        gain.gain.setValueAtTime(this.volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.4);
        
        // Add noise
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(this.volume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        noise.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noise.start(now);
    }
    
    /**
     * Collect power-up
     */
    powerUp() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    /**
     * Weapon power-up collected
     */
    weaponPowerUp() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const notes = [330, 440, 554, 660, 880]; // E4 to A5
        
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.05;
            gain.gain.setValueAtTime(this.volume * 0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }
    
    /**
     * Extra life gained
     */
    extraLife() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const melody = [523, 659, 784, 1047, 784, 1047]; // Fanfare
        
        melody.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.1;
            gain.gain.setValueAtTime(this.volume * 0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    /**
     * Bomb explosion
     */
    bomb() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Big noise explosion
        const bufferSize = this.audioContext.sampleRate * 0.8;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const decay = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * decay * decay;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);
        
        gain.gain.setValueAtTime(this.volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        noise.start(now);
        
        // Deep bass boom
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        
        oscGain.gain.setValueAtTime(this.volume * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.connect(oscGain);
        oscGain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.5);
    }
    
    /**
     * Level complete fanfare
     */
    levelComplete() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        // Victory jingle
        const melody = [
            { freq: 523, time: 0, dur: 0.15 },     // C5
            { freq: 659, time: 0.15, dur: 0.15 },  // E5
            { freq: 784, time: 0.3, dur: 0.15 },   // G5
            { freq: 1047, time: 0.45, dur: 0.3 },  // C6
            { freq: 784, time: 0.75, dur: 0.15 },  // G5
            { freq: 1047, time: 0.9, dur: 0.4 }    // C6
        ];
        
        melody.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = note.freq;
            
            const startTime = now + note.time;
            gain.gain.setValueAtTime(this.volume * 0.25, startTime);
            gain.gain.setValueAtTime(this.volume * 0.25, startTime + note.dur - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + note.dur);
        });
    }
    
    /**
     * Game over
     */
    gameOver() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        // Sad descending tones
        const melody = [
            { freq: 392, time: 0, dur: 0.3 },     // G4
            { freq: 349, time: 0.3, dur: 0.3 },   // F4
            { freq: 330, time: 0.6, dur: 0.3 },   // E4
            { freq: 262, time: 0.9, dur: 0.6 }    // C4
        ];
        
        melody.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = note.freq;
            
            const startTime = now + note.time;
            gain.gain.setValueAtTime(this.volume * 0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + note.dur);
        });
    }
    
    /**
     * Enemy shoots
     */
    enemyShoot() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        
        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(now);
        osc.stop(now + 0.1);
    }
    
    /**
     * Menu / UI click
     */
    menuClick() {
        if (!this.enabled || !this.audioContext) return;
        
        this.playTone('square', 800, 0.05, 0.2);
    }
    
    /**
     * Start game
     */
    startGame() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        [262, 330, 392, 523].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const startTime = now + i * 0.1;
            gain.gain.setValueAtTime(this.volume * 0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
}

// Create and export singleton
const soundManager = new SoundManager();

export { soundManager };
