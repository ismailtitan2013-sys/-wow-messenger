export const playMessageSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio error", e);
  }
};

let ringtoneInterval;
let ringtoneCtx;

export const startRingtone = () => {
  try {
    stopRingtone();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ringtoneCtx = new AudioContext();
    
    const playBeep = () => {
      if (!ringtoneCtx) return;
      const osc = ringtoneCtx.createOscillator();
      const gain = ringtoneCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 425; // Standard European ringing tone
      
      gain.gain.setValueAtTime(0, ringtoneCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ringtoneCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ringtoneCtx.currentTime + 1.0);
      gain.gain.linearRampToValueAtTime(0, ringtoneCtx.currentTime + 1.1);
      
      osc.connect(gain);
      gain.connect(ringtoneCtx.destination);
      
      osc.start();
      osc.stop(ringtoneCtx.currentTime + 1.1);
    };
    
    playBeep();
    ringtoneInterval = setInterval(playBeep, 4000);
  } catch (e) {
    console.error("Ringtone error", e);
  }
};

export const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneCtx) {
    try {
      ringtoneCtx.close();
    } catch(e) {}
    ringtoneCtx = null;
  }
};
