window.addEventListener("DOMContentLoaded",()=>{
    /**
 * EXPERT SF2 PARSER & MIDI PLAYER
 * Ce script implémente un décodeur RIFF/SF2 minimaliste pour extraire les samples PCM.
 */
let sf2Buffer = null;
const {ipcRenderer} = require("electron");
ipcRenderer.send("requireSF");
ipcRenderer.on("sf",(e,buffer)=>{
sf2Buffer = buffer;
})
const log = (msg) => {
    const el = document.getElementById('log');
    el.innerHTML += `<div>> ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
};

let audioCtx = null;
let pianoSamples = {}; // Map: midiNote -> AudioBuffer
let midiData = null;
let isPlaying = false;

// Elements UI
var forMid = document.querySelector("#for-mid");
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const progress = document.getElementById('progress');

// --- 1. PARSER SOUNDFONT (SF2) SIMPLIFIÉ ---
async function parseSF2(arrayBuffer) {
    log("Parsing de la SoundFont en cours...");
    const view = new DataView(arrayBuffer);
    
    // Structure RIFF basique
    if (view.getUint32(0) !== 0x52494646) throw new Error("Pas un fichier RIFF");
    
    // Recherche de la section 'sdta' (données de samples)
    let offset = 12;
    let smplOffset = 0;
    let smplLength = 0;

    while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(
            view.getUint8(offset), view.getUint8(offset+1), 
            view.getUint8(offset+2), view.getUint8(offset+3)
        );
        const chunkSize = view.getUint32(offset + 4, true);
        
        if (chunkId === 'LIST') {
            const listType = String.fromCharCode(
                view.getUint8(offset+8), view.getUint8(offset+9), 
                view.getUint8(offset+10), view.getUint8(offset+11)
            );
            if (listType === 'sdta') {
                // On a trouvé les samples !
                smplOffset = offset + 20; // Skip LIST, size, sdta, smpl, size
                smplLength = chunkSize - 12;
                break;
            }
        }
        offset += 8 + chunkSize;
    }

    if (!smplOffset) throw new Error("Échantillons non trouvés dans le SF2");

    // Extraction d'un échantillon moyen pour le piano (Simplification : on prend un segment)
    // Dans une version complète, on lirait le chunk 'pdta' pour mapper les notes aux samples.
    // Ici, nous créons un instrument virtuel à partir d'un échantillon de référence trouvé dans le fichier.
    const rawPcm = new Int16Array(arrayBuffer, smplOffset, smplLength / 2);
    const audioBuffer = audioCtx.createBuffer(1, rawPcm.length, 44100);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < rawPcm.length; i++) {
        channelData[i] = rawPcm[i] / 32768; // Conversion Int16 vers Float32
    }

    log("SoundFont chargée avec succès.");
    return audioBuffer;
}

// --- 2. LOGIQUE DE LECTURE MIDI ---
function readVLQ(view, offset) {
    let value = 0, bytesRead = 0;
    while (true) {
        let byte = view.getUint8(offset + bytesRead++);
        value = (value << 7) | (byte & 0x7F);
        if (!(byte & 0x80)) break;
    }
    return { value, bytesRead };
}

async function getMidiEvents(view) {
    let ppq = view.getUint16(12);
    let offset = 14;
    let events = [];
    let tempo = 500000;

    while (offset < view.byteLength) {
        const type = view.getUint32(offset);
        const size = view.getUint32(offset + 4);
        offset += 8;

        if (type === 0x4D54726B) { // MTrk
            let tOffset = offset;
            let absTime = 0;
            let lastStatus = 0;
            while (tOffset < offset + size) {
                const delta = readVLQ(view, tOffset);
                tOffset += delta.bytesRead;
                absTime += delta.value;

                let status = view.getUint8(tOffset);
                if (status < 0x80) status = lastStatus; else { tOffset++; lastStatus = status; }

                const cmd = status & 0xF0;
                if (cmd === 0x90 || cmd === 0x80) {
                    const note = view.getUint8(tOffset++);
                    const vel = view.getUint8(tOffset++);
                    events.push({ time: absTime, type: 'note', cmd, note, vel });
                } else if (status === 0xFF) {
                    const meta = view.getUint8(tOffset++);
                    const len = readVLQ(view, tOffset);
                    tOffset += len.bytesRead;
                    if (meta === 0x51) {
                        tempo = (view.getUint8(tOffset) << 16) | (view.getUint8(tOffset+1) << 8) | view.getUint8(tOffset+2);
                    }
                    tOffset += len.value;
                } else if (cmd === 0xB0 || cmd === 0xE0 || cmd === 0xA0) tOffset += 2;
                else if (cmd === 0xC0 || cmd === 0xD0) tOffset += 1;
            }
        }
        offset += size;
    }
    return { events: events.sort((a,b) => a.time - b.time), ppq, initialTempo: tempo };
}

// --- 3. MOTEUR AUDIO ---
function playPianoNote(buffer, note, velocity, startTime) {
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    
    source.buffer = buffer;
    
    // Calcul du Pitch Shift : le piano SF2 est souvent basé sur le Do (note 60)
    // On ajuste la vitesse de lecture (playbackRate)
    const playbackRate = Math.pow(2, (note - 69)/ 12);
    source.playbackRate.setValueAtTime(playbackRate, startTime);

    const volume = (velocity / 127) * 0.5;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

    source.connect(gain);
    gain.connect(audioCtx.destination);
    
    source.start(startTime);
    source.stop(startTime + 1.6);
}

// --- GESTION DES FICHIERS ---

document.getElementById('midi-file').onchange = async (e) => {
    const file = e.target.files[0];
    forMid.textContent = file.name;
    const buf = await file.arrayBuffer();
    midiData = new DataView(buf);
    checkReady();
};

function checkReady() {
    if (sf2Buffer && midiData) playBtn.disabled = false;
}

playBtn.onclick = async () => {
    if (!audioCtx) audioCtx = new AudioContext();
    isPlaying = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    progress.style.width = "0%";

    const pianoBuffer = await parseSF2(sf2Buffer);
    const { events, ppq, initialTempo } = await getMidiEvents(midiData);
    
    let currentTempo = initialTempo;
    let eventIdx = 0;
    let lastTick = 0;
    let lastRealTime = audioCtx.currentTime + 0.2;

    function run() {
        if (!isPlaying) return;
        const now = audioCtx.currentTime;
        const lookAhead = 0.2;

        while (eventIdx < events.length) {
            const ev = events[eventIdx];
            const secPerTick = currentTempo / (ppq * 1000000);
            const evTime = lastRealTime + (ev.time - lastTick) * secPerTick;

            if (evTime > now + lookAhead) break;

            if (ev.type === 'note' && ev.cmd === 0x90 && ev.vel > 0) {
                playPianoNote(pianoBuffer, ev.note, ev.vel, evTime);
            }

            lastTick = ev.time;
            lastRealTime = evTime;
            eventIdx++;
            progress.style.width = (eventIdx / events.length * 100) + "%";
        }

        if (eventIdx < events.length) requestAnimationFrame(run);
        else stopBtn.click();
    }
    run();
};

stopBtn.onclick = () => {
    isPlaying = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    log("Lecture arrêtée.");
};

})