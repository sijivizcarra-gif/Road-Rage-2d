// ===== GAME CORE VARIABLES =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;    

let inputDir = 0; // -1 left, 1 right, 0 idle

// ===== UI ELEMENTS =====
const scoreText = document.getElementById("scoreText");    
const bestText = document.getElementById("bestText");    
const powerFill = document.getElementById("powerFill");    
const powerText = document.getElementById("powerText");    
const startBox = document.getElementById("startBox");    
const gameOverBox = document.getElementById("gameOverBox");    
const finalScore = document.getElementById("finalScore");    
const pauseBtn = document.getElementById("pauseBtn");
const pauseMenu = document.getElementById("pauseMenu");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = countdownOverlay.querySelector('.countdown-number');
const bgPauseIndicator = document.getElementById("bgPauseIndicator");
const topMessage = document.getElementById("topMessage");
const carSelectBox = document.getElementById("carSelectBox");
const carGrid = document.getElementById("carGrid");
const selectedCarPreview = document.getElementById("selectedCarPreview");
const musicToggle = document.getElementById("musicToggle");

// ===== GAME STATE VARIABLES =====
let highScore = Number(localStorage.getItem("rr_high_pro")) || 0;
bestText.textContent = "Top Record: " + highScore;

const W = 500, H = 800;    
const LANES = [85, 165, 245, 325, 405];    

let car, enemies, roadLines, sideMarkers, speed, distance, score;
let gameStarted = false, gameOver = false, moveDir = 0, spawnTimer = 0;    
let powerState = null, powerTimer = 0, powerCooldown = 0, nextPowerScore = 500;    
let scoreMultiplier = 1, powerMsg = "", powerMsgTimer = 0;      
let baseDistance = 0;
let slowMultiplier = 1;
let originalSpeed = 4;
let scoreDuring2X = 0;
let gamePaused = false;
let isCountdown = false;
let autoPaused = false;
let messageTimer = 0;
let lastMessageTime = 0;
let selectedCarIndex = 0;
let currentCarPage = 0;
let unlockedCars = [0];

// ===== SIMPLE MUSIC SYSTEM =====
let currentMusic = null;
let musicEnabled = true;
let deferredPrompt = null;

// Music files - Will load on demand
const musicFiles = [
  "music/ms1.mp3",
  "music/ms2.mp3", 
  "music/ms3.mp3",
  "music/ms4.mp3",
  "music/ms5.mp3"
];

function toggleMusic() {
  musicEnabled = !musicEnabled;
  musicToggle.textContent = musicEnabled ? "🔊 MUSIC: ON" : "🔇 MUSIC: OFF";
  
  if (!musicEnabled && currentMusic) {
    currentMusic.pause();
  } else if (musicEnabled && gameStarted && !gameOver && !gamePaused) {
    playRandomMusic();
  }
}

function playRandomMusic() {
  if (!musicEnabled) return;
  
  // Stop current music
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  
  // Pick random music
  const randomIndex = Math.floor(Math.random() * musicFiles.length);
  const musicUrl = musicFiles[randomIndex];
  
  // Create new audio element
  currentMusic = new Audio(musicUrl);
  currentMusic.volume = 0.6;
  currentMusic.loop = false;
  
  // Try to play
  const playPromise = currentMusic.play();
  
  if (playPromise !== undefined) {
    playPromise.then(() => {
      console.log("🎵 Music playing:", musicUrl);
    }).catch(error => {
      console.log("⚠️ Music autoplay blocked:", error);
      // Show message to user
      showTopMessage("🔇 Click MUSIC button to enable sound");
    });
  }
  
  // When music ends, play next one
  currentMusic.onended = () => {
    if (musicEnabled && gameStarted && !gameOver && !gamePaused) {
      setTimeout(playRandomMusic, 1000);
    }
  };
}

function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
}

// ===== IMAGE LOADING =====
const imageSources = [
  "imahe/image2.png", 
  "imahe/image1.png",
  "imahe/image3.png",
  "imahe/image4.png",
  "imahe/image5.png",
  "imahe/image6.png",
  "imahe/image7.png",
  "imahe/image8.png",
  "imahe/image9.png"
];

let playerImg, enemyImgs = [];

function loadImages() {
  // Load player image first
  playerImg = new Image();
  playerImg.src = "imahe/image2.png";
  
  // Load enemy images
  for (let i = 1; i < imageSources.length; i++) {
    const img = new Image();
    img.src = imageSources[i];
    enemyImgs.push(img);
  }
  
  // Start game when player image loads
  playerImg.onload = () => {
    initGame();
    loop();
  };
}

// ===== SIMPLE MESSAGES =====
const simpleMessages = [
  "Miss mo na ba s'ya?",
  "What if mahal ka pa n'ya?",
  "I miss yoy",
  "Okay lang 'yan",
  "Kaya pa 'yan late game",
  "Balik ka na",
  "Don't give up!",
  "Sana ako na lang",
  "Mahal pa kita",
  "Akala mo mahal ka n'ya?",
  "Sana ikaw na lang no?",
  "Masarap ba na parang wala ka lang sa kanya?",
  "Kaya pa yan late game"
];

// ===== CAR DATABASE =====
const carDatabase = [
  {
    name: "Street Racer",
    image: "imahe/image2.png",
    speed: 7,
    handling: 8,
    acceleration: 9,
    description: "Balanced performance",
    unlocked: true,
    unlockRequirement: "Starting Car"
  },
  {
    name: "Speed Demon",
    image: "imahe/image1.png",
    speed: 9,
    handling: 6,
    acceleration: 8,
    description: "Extreme top speed",
    unlocked: false,
    unlockRequirement: "Reach 2000 points"
  },
  {
    name: "Drift King",
    image: "imahe/image3.png",
    speed: 6,
    handling: 10,
    acceleration: 7,
    description: "Perfect control",
    unlocked: false,
    unlockRequirement: "Reach 3000 points"
  },
  {
    name: "Muscle Car",
    image: "imahe/image4.png",
    speed: 8,
    handling: 5,
    acceleration: 10,
    description: "Rapid acceleration",
    unlocked: false,
    unlockRequirement: "Reach 4000 points"
  },
  {
    name: "Sports Classic",
    image: "imahe/image5.png",
    speed: 7,
    handling: 9,
    acceleration: 6,
    description: "Vintage style",
    unlocked: false,
    unlockRequirement: "Reach 5000 points"
  },
  {
    name: "Hyper Car",
    image: "imahe/image6.png",
    speed: 10,
    handling: 7,
    acceleration: 9,
    description: "Ultimate performance",
    unlocked: false,
    unlockRequirement: "Reach 10000 points"
  },
  {
    name: "Cyber Racer",
    image: "imahe/image7.png",
    speed: 8,
    handling: 8,
    acceleration: 8,
    description: "Futuristic tech",
    unlocked: false,
    unlockRequirement: "Beat high score"
  },
  {
    name: "Neon Cruiser",
    image: "imahe/image8.png",
    speed: 6,
    handling: 9,
    acceleration: 7,
    description: "Glow in the dark",
    unlocked: false,
    unlockRequirement: "Play 10 games"
  },
  {
    name: "Monster Truck",
    image: "imahe/image9.png",
    speed: 5,
    handling: 4,
    acceleration: 5,
    description: "Crush everything",
    unlocked: false,
    unlockRequirement: "Unlock all other cars"
  }
];

// ===== INPUT HANDLING =====
window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key === "a") inputDir = -1;
  if (e.key === "ArrowRight" || e.key === "d") inputDir = 1;
  if (e.key === "Escape" || e.key === "p") togglePause();
});

window.addEventListener("keyup", e => {
  if (
    e.key === "ArrowLeft" || e.key === "a" ||
    e.key === "ArrowRight" || e.key === "d"
  ) inputDir = 0;
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const x = e.touches[0].clientX;
  inputDir = x < window.innerWidth / 2 ? -1 : 1;
}, { passive: false });

canvas.addEventListener("touchend", () => inputDir = 0, { passive: false });

canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  inputDir = x < canvas.width / 2 ? -1 : 1;
});

window.addEventListener("mouseup", () => inputDir = 0);

// ===== GAME FUNCTIONS =====
function initGame() {    
  car = { 
    x: 230,
    y: H - 150,
    w: 50,
    h: 90,
    img: playerImg,
    shield: false
  };
  enemies = []; 
  roadLines = []; 
  sideMarkers = [];    
  speed = 4; 
  distance = 0; 
  score = 0; 
  spawnTimer = 0;    
  powerState = null; 
  powerTimer = 0; 
  powerCooldown = 0; 
  nextPowerScore = 500;    
  scoreMultiplier = 1; 
  slowMultiplier = 1; 
  originalSpeed = 4;
  powerMsg = ""; 
  powerMsgTimer = 0; 
  gameOver = false;    
  baseDistance = 0;
  scoreDuring2X = 0;
  gamePaused = false;
  isCountdown = false;
  autoPaused = false;
  messageTimer = 0;
  lastMessageTime = 0;
  
  powerText.textContent = "";
  powerFill.style.width = "0%";
  powerFill.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim();
  
  pauseMenu.style.display = "none";
  countdownOverlay.style.display = "none";
  bgPauseIndicator.style.display = "none";
  pauseBtn.style.display = "none";
  pauseBtn.classList.remove("paused");
  
  topMessage.style.opacity = "0";
  
  for (let i = 0; i < H; i += 80) {    
    roadLines.push({ y: i });    
    sideMarkers.push({ y: i });    
  }    
}

function startGame() {
  startBox.style.display = "none";
  gameOverBox.style.display = "none";
  carSelectBox.style.display = "none";
  initGame();
  gameStarted = true;
  pauseBtn.style.display = "flex";
  pauseBtn.classList.remove("paused");
  
  // Start music
  if (musicEnabled) {
    playRandomMusic();
  }
}

function hit(a, b) {
  return a.x < b.x + b.w && 
         a.x + a.w > b.x && 
         a.y < b.y + b.h && 
         a.y + a.h > b.y;
}

function spawnEnemies() {
  let lanes = [...LANES];
  let count = Math.random() < 0.75 ? 1 : 2;
  
  for (let i = 0; i < count; i++) {
    if (lanes.length === 0) break;
    let idx = Math.floor(Math.random() * lanes.length);
    enemies.push({ 
      x: lanes.splice(idx, 1)[0],
      y: -120,
      w: 50,
      h: 90,
      img: enemyImgs[Math.floor(Math.random() * enemyImgs.length)]
    });
  }
}

function drawPlayer(c) {
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.35)";
  ctx.shadowBlur = 18;
  
  if (c.img.complete) {
    ctx.drawImage(c.img, c.x, c.y, c.w, c.h);
  }
  
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.25)";
  ctx.shadowBlur = 14;
  
  if (e.img.complete) {
    ctx.drawImage(e.img, e.x, e.y, e.w, e.h);
  }
  
  ctx.restore();
}

function drawPowerEffects() {
  if (!powerState) return;
  
  if (powerState === "SHIELD") {
    ctx.save();
    ctx.strokeStyle = car.shield ? "rgba(0, 255, 255, 0.7)" : "rgba(255, 100, 100, 0.5)";
    ctx.lineWidth = 4;
    ctx.shadowColor = car.shield ? "#00ffff" : "#ff6464";
    ctx.shadowBlur = car.shield ? 15 : 8;
    ctx.strokeRect(car.x - 6, car.y - 6, car.w + 12, car.h + 12);
    ctx.restore();
  }
  
  if (powerState === "SLOW") {
    ctx.save();
    ctx.strokeStyle = "rgba(100, 200, 255, 0.6)";
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(
        car.x - 10 - i * 6,
        car.y - 10 - i * 6,
        car.w + 20 + i * 12,
        car.h + 20 + i * 12
      );
    }
    ctx.restore();
  }
  
  if (powerState === "2X") {
    ctx.save();
    ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 20;
    ctx.fillRect(car.x - 8, car.y - 8, car.w + 16, car.h + 16);
    ctx.restore();
  }
}

function activatePower() {
  const powers = ["SHIELD", "SLOW", "2X"];    
  powerState = powers[Math.floor(Math.random() * 3)];    
  powerTimer = 300;
  powerCooldown = 900;
  powerText.textContent = "POWER: " + powerState;    
  powerMsg = powerState + " POWER!"; 
  powerMsgTimer = 60;    
  
  if (powerState === "SHIELD") {
    car.shield = true;
  }
  
  if (powerState === "SLOW") {
    slowMultiplier = 0.6;
    originalSpeed = speed;
  }
  
  if (powerState === "2X") {
    scoreMultiplier = 2;
    baseDistance = distance;
    scoreDuring2X = score;
  }
}

// ===== CAR SELECTION SYSTEM =====
function showCarSelection() {
  startBox.style.display = "none";
  gameOverBox.style.display = "none";
  updateUnlockedCars();
  renderCarSelection();
  carSelectBox.style.display = "flex";
}

function updateUnlockedCars() {
  const savedUnlocked = localStorage.getItem("rr_unlocked_cars");
  if (savedUnlocked) {
    unlockedCars = JSON.parse(savedUnlocked);
  } else {
    unlockedCars = [0];
    localStorage.setItem("rr_unlocked_cars", JSON.stringify(unlockedCars));
  }
  
  const checkpoints = [2000, 3000, 4000, 5000, 10000];
  checkpoints.forEach((checkpoint, index) => {
    if (highScore >= checkpoint && !unlockedCars.includes(index + 1)) {
      unlockedCars.push(index + 1);
    }
  });
  
  localStorage.setItem("rr_unlocked_cars", JSON.stringify(unlockedCars));
  
  carDatabase.forEach((car, index) => {
    car.unlocked = unlockedCars.includes(index);
  });
}

function renderCarSelection() {
  carGrid.innerHTML = '';
  const carsPerPage = 6;
  const startIndex = currentCarPage * carsPerPage;
  const endIndex = Math.min(startIndex + carsPerPage, carDatabase.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    const carData = carDatabase[i];
    const carOption = document.createElement('div');
    carOption.className = `car-option ${carData.unlocked ? '' : 'locked'} ${i === selectedCarIndex ? 'selected' : ''}`;
    carOption.onclick = () => selectCar(i);
    
    carOption.innerHTML = `
      <img src="${carData.image}" class="car-preview" alt="${carData.name}">
      <div class="car-name">${carData.name}</div>
      <div class="car-simple-stats">
        Speed: ${carData.speed}/10<br>
        ${carData.description}
      </div>
      ${!carData.unlocked ? `<div class="car-unlock-req">${carData.unlockRequirement}</div>` : ''}
    `;
    
    carGrid.appendChild(carOption);
  }
  
  const selectedCar = carDatabase[selectedCarIndex];
  selectedCarPreview.src = selectedCar.image;
}

function selectCar(index) {
  const carData = carDatabase[index];
  if (!carData.unlocked) {
    showTopMessage("Locked! " + carData.unlockRequirement);
    return;
  }
  
  selectedCarIndex = index;
  renderCarSelection();
}

function prevCarPage() {
  if (currentCarPage > 0) {
    currentCarPage--;
    renderCarSelection();
  }
}

function nextCarPage() {
  const totalPages = Math.ceil(carDatabase.length / 6);
  if (currentCarPage < totalPages - 1) {
    currentCarPage++;
    renderCarSelection();
  }
}

function confirmCarSelection() {
  const selectedCar = carDatabase[selectedCarIndex];
  if (!selectedCar.unlocked) {
    showTopMessage("This car is locked!");
    return;
  }
  
  const img = new Image();
  img.src = selectedCar.image;
  img.onload = () => {
    playerImg = img;
    startGame();
  };
  img.onerror = () => {
    startGame();
  };
}

function quickStart() {
  selectedCarIndex = 0;
  const img = new Image();
  img.src = carDatabase[0].image;
  img.onload = () => {
    playerImg = img;
    startGame();
  };
  img.onerror = () => {
    startGame();
  };
}

function backToMenu() {
  carSelectBox.style.display = "none";
  startBox.style.display = "flex";
}

function backToMenuFromGameOver() {
  gameOverBox.style.display = "none";
  startBox.style.display = "flex";
}

// ===== SIMPLE MESSAGES SYSTEM =====
function showTopMessage(message) {
  if (!gameStarted || gamePaused || isCountdown || gameOver) return;
  
  if (parseFloat(topMessage.style.opacity) > 0) return;
  
  topMessage.textContent = message;
  topMessage.style.opacity = "1";
  
  messageTimer = 120;
  lastMessageTime = score;
}

function updateTopMessage() {
  if (messageTimer > 0) {
    messageTimer--;
    
    if (messageTimer <= 40) {
      topMessage.style.opacity = (messageTimer / 40).toString();
    }
  }
}

function showRandomMessage() {
  if (!gameStarted || gamePaused || isCountdown || gameOver) return;
  
  if (parseFloat(topMessage.style.opacity) > 0) return;
  
  if (score - lastMessageTime > 500 && Math.random() < 0.002) {
    const randomIndex = Math.floor(Math.random() * simpleMessages.length);
    showTopMessage(simpleMessages[randomIndex]);
  }
  
  if (score > 0 && score % 1000 === 0 && score - lastMessageTime > 300) {
    showTopMessage(`${score} points! Awesome!`);
  }
  
  if (highScore > 0 && score > highScore - 200 && score < highScore) {
    if (score - lastMessageTime > 400) {
      showTopMessage("Almost beat your record!");
    }
  }
  
  if (powerMsgTimer === 59) {
    if (score - lastMessageTime > 300) {
      showTopMessage(" what if mahal ka pa n'ya? Power up boi!");
    }
  }
}

// ===== PAUSE/RESUME FUNCTIONS =====
function togglePause() {
  if (!gameStarted || gameOver || isCountdown) return;
  
  if (!gamePaused) {
    pauseGame(false);
  } else {
    resumeGame();
  }
}

function pauseGame(isAutoPause) {
  if (gamePaused || !gameStarted || gameOver || isCountdown) return;
  
  gamePaused = true;
  autoPaused = isAutoPause;
  
  if (isAutoPause) {
    bgPauseIndicator.style.display = "block";
    pauseBtn.classList.add("paused");
  } else {
    pauseMenu.style.display = "flex";
    pauseBtn.classList.add("paused");
    bgPauseIndicator.style.display = "none";
  }
  
  if (currentMusic) {
    currentMusic.pause();
  }
  
  topMessage.style.opacity = "0";
}

function resumeGame() {
  if (!gamePaused) return;
  
  pauseMenu.style.display = "none";
  bgPauseIndicator.style.display = "none";
  
  startCountdown();
}

function startCountdown() {
  isCountdown = true;
  countdownOverlay.style.display = "flex";
  
  let count = 3;
  countdownNumber.textContent = count;
  
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
    } else {
      countdownNumber.textContent = "GO!";
      
      setTimeout(() => {
        clearInterval(countdownInterval);
        countdownOverlay.style.display = "none";
        gamePaused = false;
        isCountdown = false;
        autoPaused = false;
        pauseBtn.classList.remove("paused");
        
        if (currentMusic && musicEnabled) {
          currentMusic.play().catch(() => {
            console.log("Music resume failed");
          });
        }
      }, 1000);
    }
  }, 1000);
}

function restartGame() {
  pauseMenu.style.display = "none";
  bgPauseIndicator.style.display = "none";
  gamePaused = false;
  autoPaused = false;
  pauseBtn.classList.remove("paused");
  
  const img = new Image();
  img.src = carDatabase[selectedCarIndex].image;
  img.onload = () => {
    playerImg = img;
    startGame();
  };
  img.onerror = () => {
    startGame();
  };
}

function quitToMenu() {
  pauseMenu.style.display = "none";
  bgPauseIndicator.style.display = "none";
  gamePaused = false;
  gameStarted = false;
  autoPaused = false;
  pauseBtn.style.display = "none";
  pauseBtn.classList.remove("paused");
  
  showCarSelection();
  
  stopMusic();
}

// ===== PAGE VISIBILITY HANDLER =====
function handleVisibilityChange() {
  if (document.hidden) {
    if (gameStarted && !gameOver && !gamePaused && !isCountdown) {
      pauseGame(true);
    }
    
    if (currentMusic) {
      currentMusic.pause();
    }
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange);

// ===== GAME LOOP =====
function loop() {    
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#141414";
  ctx.fillRect(50, 0, 400, H);
  
  roadLines.forEach(l => { 
    l.y += speed; 
    if (l.y > H) l.y = -80; 
    ctx.fillStyle = "#bbb"; 
    ctx.fillRect(W/2 - 5, l.y, 10, 40); 
  });    
  
  sideMarkers.forEach(s => { 
    s.y += speed; 
    if (s.y > H) s.y = -80; 
    ctx.fillStyle = "#444"; 
    ctx.fillRect(50, s.y, 2, 40); 
    ctx.fillRect(448, s.y, 2, 40); 
  });    
  
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(50, 0, 400, H);
  
  if (gameStarted && !gameOver && !gamePaused && !isCountdown) {    
    updateTopMessage();
    showRandomMessage();
    
    if (powerTimer > 0) {
      powerTimer--;
      powerFill.style.width = (powerTimer / 300 * 100) + "%";
      powerFill.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim();
      
      if (powerTimer <= 0) {
        if (powerState === "SHIELD") car.shield = false;
        if (powerState === "SLOW") {
          slowMultiplier = 1;
        }
        if (powerState === "2X") {
          scoreMultiplier = 1;
          if (score > distance) {
            distance = score;
          }
        }
        
        powerState = null;
        powerText.textContent = "";
        powerFill.style.width = "0%";
        powerFill.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim();
      }
    }
    
    if (powerState === null && powerCooldown > 0) {
      powerCooldown--;
      let cooldownPercent = Math.max(0, ((900 - powerCooldown) / 900) * 100);
      powerFill.style.width = cooldownPercent + "%";
      powerFill.style.background = "#666";
      
      if (powerCooldown <= 0) {
        powerFill.style.width = "0%";
        powerFill.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim();
      }
    }
    
    let dir = inputDir;    
    car.x += dir * 7;
    car.x = Math.max(60, Math.min(car.x, 440 - car.w));
    
    let distanceGained = speed / 12;
    distance += distanceGained;
    
    if (powerState === "2X") {
      let newDistance = distance - baseDistance;
      score = Math.floor(baseDistance + (newDistance * 2));
    } else {
      score = Math.max(score, Math.floor(distance));
    }
    
    scoreText.textContent = score;    
    
    let level = Math.floor(score / 1000);
    let baseSpeed = 4;
    let levelSpeed = level * 0.6;
    let smoothSpeed = distance / 600;
    let calculatedSpeed = Math.min(10, baseSpeed + levelSpeed + smoothSpeed);
    
    const selectedCar = carDatabase[selectedCarIndex];
    let carSpeedBonus = (selectedCar.speed - 7) * 0.1;
    let carHandlingBonus = (selectedCar.handling - 8) * 0.05;
    
    if (powerState === "SLOW" && powerTimer > 0) {
      speed = calculatedSpeed * slowMultiplier * (1 + carSpeedBonus);
    } else {
      speed = calculatedSpeed * (1 + carSpeedBonus);
    }
    
    car.x += dir * (7 + carHandlingBonus * 2);
    
    if (score >= nextPowerScore && powerState === null && powerCooldown <= 0) { 
      activatePower(); 
      nextPowerScore = score + 400;
    }    
    
    spawnTimer++;
    
    if (spawnTimer > Math.max(80, 140 - distance / 10)) {
      spawnEnemies(); 
      spawnTimer = 0; 
    }
    
    enemies.forEach((e, i) => {  
      e.y += speed;
      drawEnemy(e);  
      
      if (hit(car, e)) {    
        if (powerState === "SHIELD" && car.shield && powerTimer > 0) {
          e.y = H + 200;
          powerTimer = Math.max(0, powerTimer - 50);
          
          car.shield = false;
          powerText.textContent = "POWER: SHIELD (USED)";
        } else {    
          gameOver = true;
          stopMusic();
          
          if (score > highScore) { 
            highScore = score; 
            localStorage.setItem("rr_high_pro", score); 
            bestText.textContent = "Top Record: " + score; 
          }    
          
          updateUnlockedCars();
          
          finalScore.textContent = score; 
          gameOverBox.style.display = "flex";
          pauseBtn.style.display = "none";
          bgPauseIndicator.style.display = "none";
        }    
      }  
    });  
    
    enemies = enemies.filter(e => e.y < H + 120);
    
    drawPlayer(car); 
    drawPowerEffects();  
    
    if (powerMsgTimer > 0) {    
      ctx.save(); 
      ctx.globalAlpha = powerMsgTimer / 60; 
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 28px Courier";
      ctx.textAlign = "center"; 
      ctx.fillText(powerMsg, W / 2, H / 2 - 40); 
      ctx.restore(); 
      powerMsgTimer--;    
    }
    
    if (powerState === "SLOW" && powerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#00aaff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SLOW", W / 2, 40);
      ctx.restore();
    }
    
    if (powerState === "2X" && powerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("2X SCORE MULTIPLIER", W / 2, 40);
      ctx.restore();
    }
    
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Speed: ${speed.toFixed(1)} | Car: ${carDatabase[selectedCarIndex].name}`, 20, H - 20);
    ctx.restore();
  } else if (!gameOver) {
    powerText.textContent = "";
    powerFill.style.width = "0%";
    powerFill.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neon-blue').trim();
  }
  
  requestAnimationFrame(loop);    
}

// ===== PWA INSTALL =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').style.display = 'block';
});

function installGame() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choiceResult => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User installed PWA');
    }
    deferredPrompt = null;
    document.getElementById('installBtn').style.display = 'none';
  });
}

// ===== START GAME =====
loadImages();

// ===== PREVENT TOUCH SCROLLING =====
document.addEventListener("touchmove", e => {
  e.preventDefault();
}, { passive: false });

window.addEventListener("pagehide", stopMusic);
window.addEventListener("beforeunload", stopMusic);
