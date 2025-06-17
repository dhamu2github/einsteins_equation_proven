// Initialize Socket.IO connection
const socket = io();

// Audio Control System
class AudioController {
    constructor() {
        this.bubblingSound = document.getElementById('bubbling');
        this.transitionSound = document.getElementById('transition');
        this.introSound = document.getElementById('intro');
        this.outroSound = document.getElementById('outro');
        this.isMuted = false;
        this.isBoiling = false;
        this.hasPlayedIntro = false;  // Track if intro has been played
        this.previousVolumes = {
            bubbling: 0.3,
            transition: 0.4,
            intro: 0.5,
            outro: 0.5
        };
        
        // Set initial volumes
        if (this.bubblingSound) this.bubblingSound.volume = this.previousVolumes.bubbling;
        if (this.transitionSound) this.transitionSound.volume = this.previousVolumes.transition;
        if (this.introSound) this.introSound.volume = this.previousVolumes.intro;
        if (this.outroSound) this.outroSound.volume = this.previousVolumes.outro;
        
        // Initialize sound button
        this.soundButton = document.getElementById('toggleSound');
        this.setupSoundControl();
        
        // Play intro sound when page loads
        window.addEventListener('load', () => {
            this.playIntro();
        });
    }

    setupSoundControl() {
        if (this.soundButton) {
            this.soundButton.addEventListener('click', () => {
                this.toggleMute();
            });
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.soundButton.classList.toggle('muted');
        
        const sounds = {
            bubbling: this.bubblingSound,
            transition: this.transitionSound,
            intro: this.introSound,
            outro: this.outroSound
        };
        
        Object.entries(sounds).forEach(([key, sound]) => {
            if (sound) {
                if (this.isMuted) {
                    // Store current volume before muting
                    this.previousVolumes[key] = sound.volume;
                    sound.volume = 0;
                } else {
                    // Restore previous volume
                    sound.volume = this.previousVolumes[key];
                }
                sound.muted = this.isMuted;
            }
        });
        
        // If muted, stop all currently playing sounds
        if (this.isMuted) {
            if (this.isBoiling) {
                this.bubblingSound?.pause();
            }
            this.stopIntro();
        } else {
            // Resume bubbling if it was playing before
            if (this.isBoiling) {
                this.bubblingSound?.play().catch(e => console.log('Audio play prevented:', e));
            }
        }
    }

    playIntro() {
        if (this.introSound && !this.isMuted && !this.hasPlayedIntro) {
            this.introSound.currentTime = 0;
            this.introSound.play().catch(e => console.log('Audio play prevented:', e));
            this.hasPlayedIntro = true;
        }
    }

    stopIntro() {
        if (this.introSound) {
            this.introSound.pause();
            this.introSound.currentTime = 0;
        }
    }

    playTransition() {
        if (this.transitionSound && !this.isMuted) {
            this.transitionSound.currentTime = 0;
            this.transitionSound.play().catch(e => console.log('Audio play prevented:', e));
        }
    }

    updateBubblingSound(temperature) {
        if (!this.bubblingSound) return;

        const isNowBoiling = temperature >= boilingPoint;
        
        if (isNowBoiling && !this.isBoiling && !this.isMuted) {
            this.bubblingSound.play().catch(e => console.log('Audio play prevented:', e));
            this.isBoiling = true;
        } else if (!isNowBoiling && this.isBoiling) {
            this.bubblingSound.pause();
            this.bubblingSound.currentTime = 0;
            this.isBoiling = false;
        }

        // Adjust volume based on temperature when approaching boiling
        if (temperature > 70) {
            const volume = Math.min((temperature - 70) / 30, 1) * 0.3; // Max volume 0.3
            this.bubblingSound.volume = volume;
        } else {
            this.bubblingSound.volume = 0;
            this.bubblingSound.pause();
            this.bubblingSound.currentTime = 0;
            this.isBoiling = false;
        }
    }
}

// Canvas setup
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// Fire effect variables
let fireParticles = [];
const NUM_FIRE_PARTICLES = 100; // Increased for more density
let lastFireUpdate = 0;
const FIRE_UPDATE_INTERVAL = 20;

// Fire particle creation helper
function createFireParticle(x, y, width) {
    const isBaseFlame = Math.random() < 0.3; // 30% chance for blue base flame
    const isRedFlame = !isBaseFlame && Math.random() < 0.7; // 70% of remaining particles are red
    return {
        x: x + (Math.random() - 0.5) * width * 0.2,
        y: y,
        vx: (Math.random() - 0.5) * (isBaseFlame ? 1 : 2),
        vy: -Math.random() * (isBaseFlame ? 2 : 4) - (isRedFlame ? 3 : 2),
        size: Math.random() * (isBaseFlame ? 1.5 : 2.5) + (isRedFlame ? 2 : 1),
        life: 1.0,
        isBaseFlame: isBaseFlame,
        isRedFlame: isRedFlame,
        opacity: Math.random() * 0.3 + (isBaseFlame ? 0.7 : 0.5)
    };
}

// Set canvas size
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initial water levels and temperature
let leftWaterLevel = 0.7;  // 70% full
let rightWaterLevel = 0.0; // Start empty
let currentTemperature = 25; // Start at room temperature (25°C / 77°F)
const maxTemperature = 150;  // Maximum temperature (150°C / 302°F)
const boilingPoint = 100;    // Water boiling point (100°C / 212°F)
const minWaterLevel = 0.0;   // Empty (0%)
const maxWaterLevel = 0.7;   // Maximum water level (70%)
const vesselHeight = 200;    // Height of vessels in pixels

// Helper function to convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Helper function to format temperature display
function formatTemperature(celsius) {
    const fahrenheit = celsiusToFahrenheit(celsius);
    return `${Math.round(celsius)}°C / ${Math.round(fahrenheit)}°F`;
}

// Vessel dimensions and positions (as percentages of canvas size)
function getVesselDimensions() {
    const centerX = canvas.width / 2;
    return {
        vesselWidth: canvas.width * 0.15,      // 15% of canvas width
        vesselHeight: canvas.height * 0.15,    // 15% of canvas height
        leftVesselX: centerX - canvas.width * 0.2,  // 20% left from center
        rightVesselX: centerX + canvas.width * 0.05, // 5% right from center
        vesselY: canvas.height * 0.6,          // 60% from top
        pipeThickness: Math.max(2, canvas.height * 0.01),
        pipeLength: canvas.width * 0.12        // 12% of canvas width for connecting pipe
    };
}

// UI elements
const toggleHeatingBtn = document.getElementById('toggleHeating');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const massInput = document.getElementById('massInput');
const energyOutput = document.getElementById('energyOutput');
const infoPanel = document.getElementById('infoPanel');

// Simulation state
let isHeating = false;
let particles = [];
let lastTimestamp = 0;
const FPS = 60;
const frameInterval = 1000 / FPS;

// Add temperature update interval variable
let temperatureUpdateInterval = null;

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('heating_status', (data) => {
    const wasHeating = isHeating;
    isHeating = data.is_heating;
    toggleHeatingBtn.textContent = isHeating ? 'Stop Heating' : 'Start Heating';
    
    // Play transition sound only when state changes
    if (wasHeating !== isHeating) {
        audioController.playTransition();
        // Stop intro sound when heating starts
        if (isHeating) {
            audioController.stopIntro();
        }
    }
    
    // Reset water levels and temperature if heating stops
    if (!isHeating) {
        currentTemperature = 25;
        
        // Clear the temperature update interval
        if (temperatureUpdateInterval) {
            clearInterval(temperatureUpdateInterval);
            temperatureUpdateInterval = null;
        }
        
        // Reset temperature slider and stop sounds
        temperatureSlider.value = 25;
        temperatureValue.textContent = formatTemperature(25);
        audioController.updateBubblingSound(25); // Stop bubbling sound
    } else {
        // Start temperature update interval only if not already running
        if (!temperatureUpdateInterval) {
            temperatureUpdateInterval = setInterval(() => {
                if (isHeating && currentTemperature < maxTemperature) {
                    currentTemperature = Math.min(currentTemperature + 0.1, maxTemperature);
                    if (!temperatureSlider.matches(':active')) {
                        temperatureSlider.value = Math.round(currentTemperature);
                        temperatureValue.textContent = formatTemperature(currentTemperature);
                        socket.emit('update_temperature', { temperature: currentTemperature });
                    }
                }
            }, 50);
        }
    }
});

socket.on('simulation_update', (data) => {
    particles = data.particles;
    const temp = Math.round(data.temperature);
    
    // Update UI elements
    if (!temperatureSlider.matches(':active')) {
        temperatureSlider.value = temp;
        temperatureValue.textContent = formatTemperature(temp);
    }
    
    // Update bubbling sound based on temperature
    audioController.updateBubblingSound(temp);
    
    updateInfoPanel(data.temperature);
});

socket.on('energy_result', (data) => {
    energyOutput.textContent = `${data.energy.energy_scientific} Joules`;
    updateInfoPanel(null, data);
});

// Initialize audio controller
let audioController;
document.addEventListener('DOMContentLoaded', () => {
    audioController = new AudioController();
});

// Event listeners
toggleHeatingBtn.addEventListener('click', () => {
    audioController.playTransition();
    socket.emit('start_heating');
});

temperatureSlider.addEventListener('input', (e) => {
    const temp = parseFloat(e.target.value);
    currentTemperature = temp;
    temperatureValue.textContent = formatTemperature(temp);
    socket.emit('update_temperature', { temperature: temp });
    
    // Update bubbling sound based on temperature
    audioController.updateBubblingSound(temp);
});

massInput.addEventListener('input', (e) => {
    const mass = e.target.value;
    socket.emit('calculate_energy', { mass: mass });
});

// Labels toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const toggleLabelsBtn = document.getElementById('toggleLabels');
    const labelsContainer = document.querySelector('.simulation-labels');
    
    if (toggleLabelsBtn && labelsContainer) {
        toggleLabelsBtn.addEventListener('click', function() {
            labelsContainer.classList.toggle('show');
            toggleLabelsBtn.classList.toggle('active');
            toggleLabelsBtn.textContent = labelsContainer.classList.contains('show') ? 'Hide Labels' : 'Show Labels';
        });
    }
});

// Drawing functions
function drawCondenserSystem(ctx, width, height) {
    const centerX = width / 2;
    // Define system dimensions
    const mainVesselWidth = width/4;           
    const mainVesselHeight = mainVesselWidth;  
    const mainVesselX = centerX - mainVesselWidth - 50;  
    const mainVesselY = height/2 - mainVesselHeight/2;
    
    // Collection vessel dimensions
    const collectionX = centerX + 50;  
    const collectionY = mainVesselY;
    const collectionWidth = mainVesselWidth;
    const collectionHeight = mainVesselHeight;

    // Save context for stove and stand drawing
    ctx.save();
    
    // Draw stove top for left vessel
    function drawStoveTop() {
        const stoveWidth = mainVesselWidth * 1.4;  // Wider than vessel
        const stoveHeight = 40;  // Height of stove top
        const stoveX = mainVesselX - (stoveWidth - mainVesselWidth) / 2;
        const stoveY = mainVesselY + mainVesselHeight;

        // Draw stove body
        ctx.fillStyle = '#444';
        ctx.fillRect(stoveX, stoveY, stoveWidth, stoveHeight);

        // Add stove top texture
        ctx.fillStyle = '#333';
        for(let i = 0; i < 3; i++) {
            ctx.fillRect(stoveX + 10 + i * (stoveWidth - 20)/2, stoveY + 5, 
                        (stoveWidth - 30)/3, 2);
        }

        // Draw burner ring (always visible)
        const burnerWidth = mainVesselWidth * 1.2;
        const burnerX = mainVesselX - (burnerWidth - mainVesselWidth) / 2;
        const burnerY = stoveY - 5;
        
        // Burner base
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(burnerX + burnerWidth/2, burnerY + 5, burnerWidth/2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Burner holes
        const numHoles = 12;
        ctx.fillStyle = '#111';
        for(let i = 0; i < numHoles; i++) {
            const angle = (i / numHoles) * Math.PI * 2;
            const radius = burnerWidth/2 - 5;
            const x = burnerX + burnerWidth/2 + Math.cos(angle) * radius;
            const y = burnerY + 5 + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add metallic highlight
        const highlight = ctx.createLinearGradient(stoveX, stoveY, stoveX, stoveY + stoveHeight);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlight;
        ctx.fillRect(stoveX, stoveY, stoveWidth, stoveHeight);
    }

    // Draw stand for right vessel
    function drawStand() {
        const standWidth = collectionWidth * 1.2;  
        const standHeight = 20;  
        const standX = collectionX - (standWidth - collectionWidth) / 2;  
        const standY = collectionY + collectionHeight;  
        
        // Draw stand legs
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        const legWidth = 8;
        const legHeight = 30;
        
        // Left leg
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.fillRect(standX, standY, legWidth, legHeight);
        
        // Right leg
        ctx.beginPath();
        ctx.fillRect(standX + standWidth - legWidth, standY, legWidth, legHeight);
        
        // Stand top
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.fillRect(standX, standY, standWidth, standHeight/2);
        
        // Add shadow under stand
        const gradient = ctx.createLinearGradient(standX, standY + legHeight, standX, standY + legHeight + 10);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(standX - 5, standY + legHeight, standWidth + 10, 10);
    }
    
    // Draw the supporting elements first
    drawStoveTop();
    drawStand();
    
    // Restore context
    ctx.restore();

    // Rest of the original drawing code remains unchanged
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Draw main vessel
    ctx.strokeRect(mainVesselX, mainVesselY, mainVesselWidth, mainVesselHeight);

    // Draw slanted lid on main vessel
    ctx.beginPath();
    const lidHeight = 30;  
    const lidSlant = 20;   
    
    ctx.moveTo(mainVesselX, mainVesselY - lidHeight);
    ctx.lineTo(mainVesselX + mainVesselWidth, mainVesselY - lidHeight + lidSlant);
    ctx.lineTo(mainVesselX + mainVesselWidth, mainVesselY);
    ctx.moveTo(mainVesselX, mainVesselY - lidHeight);
    ctx.lineTo(mainVesselX, mainVesselY);
    ctx.stroke();

    // Draw collection vessel
    ctx.strokeRect(collectionX, collectionY, collectionWidth, collectionHeight);

    // Draw water levels
    const scaledLeftWaterLevel = leftWaterLevel * mainVesselHeight;
    ctx.beginPath();
    ctx.moveTo(mainVesselX, mainVesselY + mainVesselHeight - scaledLeftWaterLevel);
    ctx.lineTo(mainVesselX + mainVesselWidth, mainVesselY + mainVesselHeight - scaledLeftWaterLevel);
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill water in left vessel
    ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
    ctx.fillRect(
        mainVesselX,
        mainVesselY + mainVesselHeight - scaledLeftWaterLevel,
        mainVesselWidth,
        scaledLeftWaterLevel
    );

    // Right vessel water
    const scaledRightWaterLevel = rightWaterLevel * collectionHeight;
    ctx.beginPath();
    ctx.moveTo(collectionX, collectionY + collectionHeight - scaledRightWaterLevel);
    ctx.lineTo(collectionX + collectionWidth, collectionY + collectionHeight - scaledRightWaterLevel);
    ctx.strokeStyle = '#4a90e2';
    ctx.stroke();

    // Fill water in right vessel
    ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
    ctx.fillRect(
        collectionX,
        collectionY + collectionHeight - scaledRightWaterLevel,
        collectionWidth,
        scaledRightWaterLevel
    );

    // Draw connection pipe system
    const pipeStartY = mainVesselY - lidHeight + lidSlant;
    const pipeEndY = mainVesselY + 30;
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Horizontal section from left vessel
    ctx.beginPath();
    ctx.moveTo(mainVesselX + mainVesselWidth, pipeStartY);
    ctx.lineTo(mainVesselX + mainVesselWidth + 40, pipeStartY);
    ctx.stroke();
    
    // Angled section
    ctx.beginPath();
    ctx.moveTo(mainVesselX + mainVesselWidth + 40, pipeStartY);
    ctx.lineTo(collectionX - 40, pipeEndY);
    ctx.stroke();
    
    // Horizontal section to right vessel
    ctx.beginPath();
    ctx.moveTo(collectionX - 40, pipeEndY);
    ctx.lineTo(collectionX, pipeEndY);
    ctx.stroke();

    // Add flow direction arrows
    const arrowSize = 6;
    const arrowPositions = [
        { x: mainVesselX + mainVesselWidth + 20, y: pipeStartY },
        { x: (mainVesselX + mainVesselWidth + collectionX) / 2, y: (pipeStartY + pipeEndY) / 2 },
        { x: collectionX - 20, y: pipeEndY }
    ];
    
    arrowPositions.forEach(pos => {
        ctx.beginPath();
        ctx.moveTo(pos.x - arrowSize, pos.y);
        ctx.lineTo(pos.x + arrowSize, pos.y);
        ctx.lineTo(pos.x, pos.y + arrowSize);
        ctx.fillStyle = '#666';
        ctx.fill();
    });

    // Draw heat source only when heating is active
    if (isHeating) {
        const burnerWidth = mainVesselWidth * 1.2;
        const burnerX = mainVesselX - (burnerWidth - mainVesselWidth) / 2;
        const burnerY = mainVesselY + mainVesselHeight + 35;
        drawStaticFlame(ctx, burnerX, burnerY, burnerWidth);
    }
}

function drawStaticFlame(ctx, x, y, width) {
    const flameHeight = width * 0.08;  // Thin flame height
    const flameWidth = width * 1.2;    // 20% wider than vessel
    const centerX = x + width/2;
    const flameX = x - (flameWidth - width)/2; // Center the wider flame under vessel
    
    // Create clipping path for flame shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(flameX, y);  // Start from extended left edge
    
    // Draw left side of flame with inward curve at top
    ctx.bezierCurveTo(
        flameX, y - flameHeight * 0.2,
        flameX + flameWidth * 0.2, y - flameHeight * 0.4,
        flameX + flameWidth * 0.4, y - flameHeight * 0.7
    );
    
    // Draw top of flame (inward curve)
    ctx.bezierCurveTo(
        flameX + flameWidth * 0.45, y - flameHeight,
        flameX + flameWidth * 0.55, y - flameHeight,
        flameX + flameWidth * 0.6, y - flameHeight * 0.7
    );
    
    // Draw right side of flame
    ctx.bezierCurveTo(
        flameX + flameWidth * 0.8, y - flameHeight * 0.4,
        flameX + flameWidth, y - flameHeight * 0.2,
        flameX + flameWidth, y
    );
    
    ctx.closePath();
    ctx.clip();
    
    // Draw blue base
    const blueGradient = ctx.createLinearGradient(centerX, y, centerX, y - flameHeight * 0.3);
    blueGradient.addColorStop(0, 'rgba(30, 150, 255, 0.9)');
    blueGradient.addColorStop(1, 'rgba(30, 150, 255, 0)');
    ctx.fillStyle = blueGradient;
    ctx.fillRect(flameX, y - flameHeight * 0.3, flameWidth, flameHeight * 0.3);
    
    // Draw main flame gradient
    const flameGradient = ctx.createLinearGradient(centerX, y, centerX, y - flameHeight);
    flameGradient.addColorStop(0, 'rgba(255, 50, 0, 0.95)');    // Intense red at base
    flameGradient.addColorStop(0.3, 'rgba(255, 80, 0, 0.9)');   // Red-orange
    flameGradient.addColorStop(0.6, 'rgba(255, 120, 0, 0.85)'); // Orange
    flameGradient.addColorStop(0.8, 'rgba(255, 160, 0, 0.8)');  // Light orange
    flameGradient.addColorStop(1, 'rgba(255, 200, 0, 0.7)');    // Yellow at tips
    
    ctx.fillStyle = flameGradient;
    ctx.fillRect(flameX, y - flameHeight, flameWidth, flameHeight);
    
    // Add inner glow
    const innerGlow = ctx.createRadialGradient(
        centerX, y - flameHeight * 0.4, 0,  // Moved center point down slightly
        centerX, y - flameHeight * 0.4, flameWidth * 0.5
    );
    innerGlow.addColorStop(0, 'rgba(255, 200, 50, 0.3)');
    innerGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(flameX, y - flameHeight, flameWidth, flameHeight);
    
    ctx.restore();
}

function drawHeatSource(ctx, x, y, width) {
    // Draw the burner base
    const burnerHeight = 15;
    const burnerRingHeight = 5;
    const burnerWidth = width * 1.2; // Make burner match flame width
    const burnerX = x - (burnerWidth - width)/2; // Center the wider burner
    
    // Draw burner stand
    ctx.beginPath();
    ctx.fillStyle = '#444';
    ctx.fillRect(burnerX + burnerWidth * 0.1, y, burnerWidth * 0.8, burnerHeight);
    
    // Draw burner ring
    ctx.beginPath();
    ctx.fillStyle = '#666';
    const ringWidth = burnerWidth * 0.9;
    const ringX = burnerX + (burnerWidth - ringWidth) / 2;
    ctx.fillRect(ringX, y, ringWidth, burnerRingHeight);
    
    // Draw burner holes
    const numHoles = 20; // More holes for wider burner
    const holeRadius = 1;
    ctx.fillStyle = '#222';
    for (let i = 0; i < numHoles; i++) {
        const holeX = ringX + (ringWidth / (numHoles - 1)) * i;
        ctx.beginPath();
        ctx.arc(holeX, y + burnerRingHeight/2, holeRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw the fire effect
    if (isHeating) {
        drawStaticFlame(ctx, x, y - burnerRingHeight/2, width);
    }
}

function calculateTransferRate(temp) {
    if (temp < boilingPoint) {
        // Pre-boiling: very slow evaporation
        return 0.0002 * (temp / boilingPoint);
    } else {
        // Post-boiling: exponential increase
        const boilingExcess = (temp - boilingPoint) / (maxTemperature - boilingPoint);
        return 0.002 * (1 + Math.pow(boilingExcess, 2));
    }
}

function updateWaterLevels() {
    if (isHeating) {
        // Calculate the target water levels based on temperature
        const temperatureRatio = (currentTemperature - 25) / (maxTemperature - 25);
        const targetLeftLevel = maxWaterLevel * (1 - temperatureRatio);
        const targetRightLevel = maxWaterLevel * temperatureRatio;

        // Smoothly transition current levels to target levels
        const transitionSpeed = 0.01;
        leftWaterLevel += (targetLeftLevel - leftWaterLevel) * transitionSpeed;
        rightWaterLevel += (targetRightLevel - rightWaterLevel) * transitionSpeed;

        // Ensure water levels stay within bounds
        leftWaterLevel = Math.max(minWaterLevel, Math.min(maxWaterLevel, leftWaterLevel));
        rightWaterLevel = Math.max(minWaterLevel, Math.min(maxWaterLevel, rightWaterLevel));

        // Update particle behavior
        updateParticleBehavior();

        // Automatically stop heating if maximum temperature is reached
        if (currentTemperature >= maxTemperature) {
            socket.emit('start_heating'); // This will toggle heating off
            updateInfoPanel(currentTemperature, {
                message: "Heating automatically stopped - maximum temperature reached"
            });
        }
    } else {
        // When heating is off, gradually return to initial state
        if (currentTemperature <= 26) { // Close to room temperature
            leftWaterLevel += (0.7 - leftWaterLevel) * 0.01;
            rightWaterLevel += (0.0 - rightWaterLevel) * 0.01;
        }
    }
}

function updateTemperature() {
    if (!isHeating && currentTemperature > 25) {
        // Cooling rate increases with temperature
        const coolRate = 0.2 + (currentTemperature - 25) / maxTemperature;
        currentTemperature = Math.max(currentTemperature - coolRate, 25);
        
        // Update slider during cooling
        if (!temperatureSlider.matches(':active')) {
            temperatureSlider.value = Math.round(currentTemperature);
            temperatureValue.textContent = formatTemperature(currentTemperature);
        }
    }
}

function updateParticleBehavior() {
    const temp = currentTemperature;
    const waterRatio = leftWaterLevel / maxWaterLevel;
    
    particles.forEach(particle => {
        // Update particle state based on temperature and position
        if (particle.y < canvas.height/2) {
            // Particles in upper half
            if (temp >= boilingPoint) {
                particle.is_vapor = true;
                particle.is_condensed = false;
            }
        } else {
            // Particles in lower half
            const particleWaterLevel = canvas.height - (leftWaterLevel * canvas.height / maxWaterLevel);
            if (particle.y > particleWaterLevel) {
                particle.is_vapor = false;
                particle.is_condensed = false;
            }
        }
        
        // Adjust particle velocities based on temperature
        if (particle.is_vapor) {
            // Vapor particles move faster with higher temperature
            const speedMultiplier = 1 + (temp - boilingPoint) / 50;
            particle.vy *= speedMultiplier;
            particle.vx *= speedMultiplier;
        }
    });
}

function drawParticle(ctx, particle) {
    const radius = 2;
    ctx.beginPath();
    
    if (particle.is_vapor) {
        // Vapor particles get more transparent and faster with higher temperature
        const tempRatio = (currentTemperature - boilingPoint) / (maxTemperature - boilingPoint);
        const alpha = Math.max(0.2, 0.6 - tempRatio * 0.4);
        ctx.fillStyle = `rgba(74, 144, 226, ${alpha})`;
    } else if (particle.is_condensed) {
        // Condensed particles are more visible
        ctx.fillStyle = 'rgba(74, 144, 226, 0.8)';
    } else {
        // Regular water particles
        ctx.fillStyle = 'rgba(74, 144, 226, 1)';
    }
    
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function draw(timestamp) {
    if (timestamp - lastTimestamp < frameInterval) {
        requestAnimationFrame(draw);
        return;
    }
    lastTimestamp = timestamp;
    
    // Update temperature and water levels
    updateTemperature();
    updateWaterLevels();
    
    // Update temperature display
    if (!temperatureSlider.matches(':active')) {
        temperatureSlider.value = Math.round(currentTemperature);
        temperatureValue.textContent = formatTemperature(currentTemperature);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCondenserSystem(ctx, canvas.width, canvas.height);
    particles.forEach(particle => drawParticle(ctx, particle));
    
    // Draw heat source
    if (isHeating) {
        const centerX = canvas.width / 2;
        const mainVesselWidth = canvas.width/4;
        const mainVesselX = centerX - mainVesselWidth - 50;
        const mainVesselY = canvas.height/2 - canvas.width/8;
        const mainVesselHeight = mainVesselWidth;
        
        drawHeatSource(
            ctx,
            mainVesselX,
            mainVesselY + mainVesselHeight + 10,
            mainVesselWidth
        );
    }
    
    requestAnimationFrame(draw);
}

function updateInfoPanel(temperature, data = null) {
    let info = '';
    
    if (temperature !== null) {
        const waterTransferPercent = ((maxWaterLevel - leftWaterLevel) / maxWaterLevel * 100).toFixed(1);
        const leftPercent = (leftWaterLevel / maxWaterLevel * 100).toFixed(1);
        const rightPercent = (rightWaterLevel / maxWaterLevel * 100).toFixed(1);
        
        if (temperature < boilingPoint) {
            info = `Temperature: ${formatTemperature(temperature)}<br>
                   Pre-boiling phase<br>
                   Water transferred: ${waterTransferPercent}%<br>
                   Left vessel: ${leftPercent}%<br>
                   Right vessel: ${rightPercent}%`;
        } else {
            info = `Boiling at ${formatTemperature(temperature)}!<br>
                   Water transferred: ${waterTransferPercent}%<br>
                   Left vessel: ${leftPercent}%<br>
                   Right vessel: ${rightPercent}%`;
        }
    }
    
    if (data && data.message) {
        info += `<br><br>${data.message}`;
    }
    
    infoPanel.innerHTML = info;
}

// Draw vessels and connecting pipe
function drawVessels(leftWaterLevel, rightWaterLevel) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const dims = getVesselDimensions();
    
    // Set line properties
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';

    // Left vessel with slanted lid
    // Main vessel rectangle
    ctx.beginPath();
    ctx.rect(dims.leftVesselX, dims.vesselY, dims.vesselWidth, dims.vesselHeight);
    ctx.stroke();

    // Slanted lid for left vessel
    ctx.beginPath();
    const lidHeight = dims.vesselHeight * 0.25; // Height of the lid
    const lidSlant = dims.vesselWidth * 0.4;    // How much the lid slants
    
    // Draw lid - starting from left side
    ctx.moveTo(dims.leftVesselX - lidSlant * 0.3, dims.vesselY);
    ctx.lineTo(dims.leftVesselX + dims.vesselWidth + lidSlant * 0.3, dims.vesselY);
    ctx.lineTo(dims.leftVesselX + dims.vesselWidth + lidSlant, dims.vesselY - lidHeight);
    ctx.lineTo(dims.leftVesselX - lidSlant * 0.6, dims.vesselY - lidHeight);
    ctx.closePath();
    ctx.stroke();

    // Right vessel
    ctx.beginPath();
    ctx.rect(dims.rightVesselX, dims.vesselY, dims.vesselWidth, dims.vesselHeight);
    ctx.stroke();

    // Connecting pipe with slope
    ctx.beginPath();
    ctx.lineWidth = dims.pipeThickness;
    
    // Starting point (from left vessel)
    const startX = dims.leftVesselX + dims.vesselWidth;
    const startY = dims.vesselY + dims.vesselHeight * 0.3;
    
    // End point (at right vessel)
    const endX = dims.rightVesselX;
    const endY = dims.vesselY + dims.vesselHeight * 0.7;

    // Draw the connecting pipe with straight segments
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // First horizontal segment
    const horizontalLength = dims.pipeLength;
    ctx.lineTo(startX + horizontalLength, startY);
    
    // Diagonal segment
    const diagonalEndX = endX - horizontalLength;
    ctx.lineTo(diagonalEndX, endY);
    
    // Final horizontal segment
    ctx.lineTo(endX, endY);
    
    ctx.stroke();

    // Reset line width
    ctx.lineWidth = 2;

    // Draw water in left vessel
    const leftWaterHeight = dims.vesselHeight * leftWaterLevel;
    ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.fillRect(
        dims.leftVesselX,
        dims.vesselY + dims.vesselHeight - leftWaterHeight,
        dims.vesselWidth,
        leftWaterHeight
    );

    // Draw water in right vessel
    const rightWaterHeight = dims.vesselHeight * rightWaterLevel;
    ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.fillRect(
        dims.rightVesselX,
        dims.vesselY + dims.vesselHeight - rightWaterHeight,
        dims.vesselWidth,
        rightWaterHeight
    );
}

// Draw initial state
drawVessels(leftWaterLevel, rightWaterLevel);

// Start animation loop with timestamp
requestAnimationFrame(draw); 