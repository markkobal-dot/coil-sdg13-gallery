(() => {
  const canvas = document.getElementById('climate-game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const tile = 80;
  const stations = [ {
    x: 1,
    y: 1,
    place: 'HOME',
    questions: [ {
      prompt: 'At home, what is a good way to save electricity?',
      options: [ {
        label: 'Switch off lights in empty rooms',
        correct: true,
        feedback: 'Correct. Turning off unused lights avoids unnecessary electricity use.'
      },
      {
        label: 'Leave every light on all day',
        correct: false,
        feedback: 'That uses electricity when nobody needs the light. Try another choice.'
      },
      {
        label: 'Unplug the refrigerator every night',
        correct: false,
        feedback: 'A refrigerator needs to stay on to keep food safe. Try a different way to save energy.'
      }]
    },
    {
      prompt: 'You are leaving a room for the day. What is a sensible energy-saving step?',
      options: [ {
        label: 'Turn off lights and devices that are not needed',
        correct: true,
        feedback: 'Correct. Switching off unused lights and devices can avoid wasted electricity.'
      },
      {
        label: 'Leave all the lights on just in case',
        correct: false,
        feedback: 'Unused lights still use electricity. Try another choice.'
      },
      {
        label: 'Open the fridge to cool the room',
        correct: false,
        feedback: 'A fridge is not an air conditioner and this wastes energy. Try another choice.'
      }]
    },
    {
      prompt: 'Your family needs a new light bulb. Which option uses less electricity for a similar amount of light?',
      options: [ {
        label: 'An efficient LED bulb',
        correct: true,
        feedback: 'Correct. LEDs use less electricity than older incandescent bulbs for a similar amount of light.'
      },
      {
        label: 'An old incandescent bulb',
        correct: false,
        feedback: 'Older incandescent bulbs use more electricity for a similar amount of light. Try another choice.'
      },
      {
        label: 'Several bulbs where one is enough',
        correct: false,
        feedback: 'Extra lighting can use more electricity than needed. Try another choice.'
      }]
    }]
  },
  {
    x: 8,
    y: 3,
    place: 'BIKE STOP',
    questions: [ {
      prompt: 'The school is nearby. Which option creates the fewest direct emissions?',
      options: [ {
        label: 'Walk or cycle',
        correct: true,
        feedback: 'Correct. Walking and cycling create no tailpipe emissions.'
      },
      {
        label: 'Take a solo car ride',
        correct: false,
        feedback: 'A short solo car trip burns fuel. Try another option.'
      },
      {
        label: 'Ask someone to drive around twice',
        correct: false,
        feedback: 'A longer car trip uses more fuel. Try another option.'
      }]
    },
    {
      prompt: 'The journey is too far to walk. Which option can reduce emissions per passenger?',
      options: [ {
        label: 'Take a bus or train',
        correct: true,
        feedback: 'Correct. Public transport can carry many passengers in one trip.'
      },
      {
        label: 'Drive alone in a large car',
        correct: false,
        feedback: 'A solo car journey often creates more emissions per passenger. Try another option.'
      },
      {
        label: 'Take a taxi for each person',
        correct: false,
        feedback: 'Several separate car trips use more fuel. Try another option.'
      }]
    },
    {
      prompt: 'You have a short trip to make. Which is a lower-emission choice?',
      options: [ {
        label: 'Cycle if the route is safe',
        correct: true,
        feedback: 'Correct. Cycling on a safe route avoids tailpipe emissions.'
      },
      {
        label: 'Drive even though the destination is nearby',
        correct: false,
        feedback: 'For a suitable short trip, driving is often unnecessary. Try another option.'
      },
      {
        label: 'Make several separate car trips',
        correct: false,
        feedback: 'Making several separate car trips can mean extra journeys. Try another option.'
      }]
    }]
  },
  {
    x: 9,
    y: 4,
    place: 'HOT SQUARE',
    questions: [ {
      prompt: 'This square gets very hot in summer. What would help people cope?',
      options: [ {
        label: 'Plant trees for shade',
        correct: true,
        feedback: 'Correct. Trees create shade and can cool nearby streets.'
      },
      {
        label: 'Remove the trees',
        correct: false,
        feedback: 'Removing shade can make the square hotter. Try another option.'
      },
      {
        label: 'Cover it with dark asphalt',
        correct: false,
        feedback: 'Dark surfaces absorb heat and can make the square hotter. Try another option.'
      }]
    },
    {
      prompt: 'People need a cooler place to rest during a heatwave. What could the square offer?',
      options: [ {
        label: 'Shaded seating near trees',
        correct: true,
        feedback: 'Correct. Shade can make public spaces more comfortable during hot weather.'
      },
      {
        label: 'A bare area with no shade',
        correct: false,
        feedback: 'An exposed area offers little protection from the sun. Try another choice.'
      },
      {
        label: 'More dark paving and fewer plants',
        correct: false,
        feedback: 'Dark paving can absorb heat, while removing plants reduces shade. Try another choice.'
      }]
    },
    {
      prompt: 'Which change can help reduce heat in a built-up square?',
      options: [ {
        label: 'Add trees and shaded green space',
        correct: true,
        feedback: 'Correct. Trees and green spaces can provide shade and help cool urban areas.'
      },
      {
        label: 'Replace every tree with concrete',
        correct: false,
        feedback: 'Removing trees also removes valuable shade. Try another option.'
      },
      {
        label: 'Use only dark, unshaded surfaces',
        correct: false,
        feedback: 'Dark surfaces can absorb heat and make the area less comfortable. Try another option.'
      }]
    }]
  },
  {
    x: 3,
    y: 4,
    place: 'COMMUNITY HALL',
    questions: [ {
      prompt: 'The community hall is being upgraded. Which choice uses less electricity?',
      options: [ {
        label: 'Install efficient LED lights',
        correct: true,
        feedback: 'Correct. Efficient lighting can provide the same light with less electricity.'
      },
      {
        label: 'Keep every light on after closing',
        correct: false,
        feedback: 'That wastes electricity when the hall is empty. Try another option.'
      },
      {
        label: 'Use older, less efficient bulbs',
        correct: false,
        feedback: 'Less efficient bulbs use more electricity for a similar amount of light. Try another option.'
      }]
    },
    {
      prompt: 'The last event has finished. What should the organisers do?',
      options: [ {
        label: 'Switch off unused lights and equipment',
        correct: true,
        feedback: 'Correct. Turning off equipment that is no longer needed saves energy.'
      },
      {
        label: 'Leave all the lights on overnight',
        correct: false,
        feedback: 'The empty hall does not need all its lights. Try another choice.'
      },
      {
        label: 'Leave doors open while the heating runs',
        correct: false,
        feedback: 'That lets heated air escape and wastes energy. Try another choice.'
      }]
    },
    {
      prompt: 'How could the hall reduce the energy needed for heating?',
      options: [ {
        label: 'Improve insulation and seal draughts',
        correct: true,
        feedback: 'Correct. Good insulation helps keep heat inside during cold weather.'
      },
      {
        label: 'Heat the hall with its windows open',
        correct: false,
        feedback: 'Open windows let heat escape. Try another choice.'
      },
      {
        label: 'Use heating in empty rooms all day',
        correct: false,
        feedback: 'Heating empty rooms wastes energy. Try another choice.'
      }]
    }]
  }];
  const player = {
    x: 0,
    y: 2
  };
  const completed = new Set();
  const correctStations = new Set();
  const answerHistory = [];
  let activeQuestion = null;
  let moving = null;
  let activeStation = null;
  let correctAnswerChosen = false;
  let started = false;
  let missionNumber = 0;
  const lastQuestionByStation = new Map();
  const lastCorrectSlotByStation = new Map();
  const score = document.getElementById('game-score');
  const message = document.getElementById('game-message');
  const choiceBox = document.getElementById('game-choice');
  const prompt = document.getElementById('game-prompt');
  const optionsBox = document.getElementById('game-options');
  const feedback = document.getElementById('game-feedback');
  const startButton = document.getElementById('game-start');
  const continueButton = document.getElementById('game-continue');
  const soundButton = document.getElementById('game-sound');
  const summaryBox = document.getElementById('game-summary');
  const summaryScore = document.getElementById('game-summary-score');
  const summaryList = document.getElementById('game-summary-list');
  const summaryRestart = document.getElementById('game-summary-restart');
  let soundEnabled = false;
  let audioContext = null;
  let musicTimer = null;
  let musicIndex = 0;
  let gameVisible = true;
  const melody = [392,
  440,
  523.25,
  440,
  349.23,
  392,
  440,
  392];
  function scheduleTone(frequency, duration, volume) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.025);
  }
  function tone(frequency, duration = 0.11, volume = 0.045) {
    if (!soundEnabled || !audioContext) return;
    if (audioContext.state !== 'running') {
      audioContext.resume().then(() => {
        if (soundEnabled) scheduleTone(frequency, duration, volume);
      }).catch (() => {
      });
      return;
    }
    scheduleTone(frequency, duration, volume);
  }
  function startMusic() {
    if (musicTimer || !gameVisible || document.hidden) return;
    musicIndex = 0;
    const playNote = () => {
      if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
      scheduleTone(melody[musicIndex], 0.38, 0.085);
      scheduleTone(melody[musicIndex] / 2, 0.38, 0.028);
      musicIndex = (musicIndex + 1) % melody.length;
    };
    playNote();
    musicTimer = window.setInterval(playNote, 420);
  }
  function stopMusic() {
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = null;
  }
  function playCue(kind) {
    if (kind === 'move') tone(260, 0.045, 0.018);
    if (kind === 'wrong') tone(185, 0.17, 0.05);
    if (kind === 'success') {
      tone(540, 0.13, 0.05);
      window.setTimeout(() => tone(700, 0.15, 0.05), 125);
    }
    if (kind === 'finish') {
      tone(520, 0.14, 0.055);
      window.setTimeout(() => tone(660, 0.14, 0.055), 140);
      window.setTimeout(() => tone(820, 0.23, 0.055), 285);
    }
  }
  function updateFallbackVisibility() {
    const bounds = canvas.getBoundingClientRect();
    gameVisible = document.body.dataset.view === 'game' &&
      bounds.width > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
    if (gameVisible && soundEnabled && !document.hidden) startMusic();
    else stopMusic();
  }
  const gameVisibility = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      gameVisible = entries[0].isIntersecting;
      if (gameVisible && soundEnabled && !document.hidden) startMusic();
      else stopMusic();
    }, { threshold: 0.12 })
    : null;
  if (gameVisibility) {
    gameVisibility.observe(canvas);
  } else {
    window.addEventListener('scroll', updateFallbackVisibility, { passive: true });
    window.addEventListener('resize', updateFallbackVisibility);
    updateFallbackVisibility();
  }
  window.addEventListener('app:view', (event) => {
    if (event.detail.id !== 'game') {
      gameVisible = false;
      stopMusic();
    } else if (!gameVisibility) {
      updateFallbackVisibility();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (gameVisible && soundEnabled) startMusic();
  });
  soundButton.addEventListener('click', () => {
    if (soundEnabled) {
      soundEnabled = false;
      stopMusic();
      soundButton.textContent = 'Turn game sound on';
      soundButton.setAttribute('aria-pressed', 'false');
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      soundButton.textContent = 'Game audio unavailable';
      message.textContent = 'This browser does not support game audio.';
      return;
    }
    audioContext = audioContext || new AudioContextClass();
    audioContext.resume().then(() => {
      soundEnabled = true;
      soundButton.textContent = 'Game sound: on (turn off)';
      soundButton.setAttribute('aria-pressed', 'true');
      startMusic();
      playCue('success');
    }).catch (() => {
      soundEnabled = false;
      message.textContent = 'Audio did not start. Check whether this browser tab is muted, then try again.';
    });
  });
  function roundedRect(x, y, w, h, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }
  function drawHouse(x, y, roofColor) {
    const px = x * tile + 12,
    py = y * tile + 18;
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(px, py + 24);
    ctx.lineTo(px + 28, py);
    ctx.lineTo(px + 56, py + 24);
    ctx.closePath();
    ctx.fill();
    roundedRect(px + 5, py + 23, 46, 34, 5, '#fffaf0');
    roundedRect(px + 12, py + 32, 11, 12, 2, '#a6d4c4');
    roundedRect(px + 34, py + 32, 11, 25, 2, '#c58f68');
  }
  function drawTree(cx, cy, scale = 1) {
    ctx.fillStyle = '#805d42';
    ctx.fillRect(cx - 4 * scale, cy + 7 * scale, 8 * scale, 22 * scale);
    ctx.fillStyle = '#4e9565';
    ctx.beginPath();
    ctx.arc(cx, cy, 19 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#79b978';
    ctx.beginPath();
    ctx.arc(cx - 8 * scale, cy - 7 * scale, 9 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawBikeRack() {
    ctx.strokeStyle = '#3f6e58';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(660, 268, 13, 0, Math.PI * 2);
    ctx.arc(694, 268, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(660, 268);
    ctx.lineTo(674, 247);
    ctx.lineTo(684, 268);
    ctx.lineTo(660, 268);
    ctx.lineTo(678, 268);
    ctx.lineTo(694, 268);
    ctx.lineTo(674, 247);
    ctx.stroke();
  }
  function drawSolarPanel(x, y) {
    roundedRect(x, y, 42, 16, 3, '#335a68');
    ctx.strokeStyle = '#9dc9c8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 1);
    ctx.lineTo(x + 14, y + 15);
    ctx.moveTo(x + 28, y + 1);
    ctx.lineTo(x + 28, y + 15);
    ctx.moveTo(x + 1, y + 8);
    ctx.lineTo(x + 41, y + 8);
    ctx.stroke();
  }
  function drawCommunityGarden() {
    roundedRect(238, 404, 132, 72, 12, '#b6d19c');
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const x = 250 + col * 37,
      y = 410 + row * 28;
      roundedRect(x, y, 29, 20, 5, '#9a704f');
      for (let leaf = 0; leaf < 3; leaf++) {
        ctx.fillStyle = ['#4e9565',
        '#76ad58',
        '#3d8052'][leaf];
        ctx.beginPath();
        ctx.arc(x + 8 + leaf * 7, y + 10 + (leaf % 2) * 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function drawCommunityHall() {
    ctx.fillStyle = '#9da98d';
    ctx.beginPath();
    ctx.ellipse(280, 402, 58, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e786d';
    ctx.beginPath();
    ctx.moveTo(224, 351);
    ctx.lineTo(280, 327);
    ctx.lineTo(336, 351);
    ctx.closePath();
    ctx.fill();
    roundedRect(237, 348, 86, 54, 4, '#f5efdf');
    ctx.fillStyle = '#d6a76f';
    ctx.fillRect(233, 346, 94, 7);
    roundedRect(248, 361, 16, 17, 2, '#a4c9c4');
    roundedRect(296, 361, 16, 17, 2, '#a4c9c4');
    roundedRect(273, 364, 14, 38, 3, '#b27c55');
    ctx.fillStyle = '#f6df9b';
    ctx.beginPath();
    ctx.arc(283, 384, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#315943';
    ctx.fillRect(259, 357, 42, 3);
  }
  function drawBench(x, y) {
    ctx.fillStyle = '#a97149';
    ctx.fillRect(x, y, 38, 6);
    ctx.fillRect(x, y + 9, 38, 5);
    ctx.fillStyle = '#596b57';
    ctx.fillRect(x + 4, y + 14, 4, 9);
    ctx.fillRect(x + 30, y + 14, 4, 9);
  }
  function drawFlowerPatch(x, y) {
    for (let i = 0; i < 5; i++) {
      const px = x + i * 13,
      py = y + (i % 2) * 8;
      ctx.strokeStyle = '#4e9565';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py + 3);
      ctx.lineTo(px, py + 12);
      ctx.stroke();
      ctx.fillStyle = ['#e8a56d',
      '#f3d36b',
      '#d98bb0'][i % 3];
      ctx.beginPath();
      ctx.arc(px, py + 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dcebd8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = '#d5e5d1';
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    ctx.fillStyle = '#c8beab';
    ctx.fillRect(0, 176, 960, 128);
    ctx.fillRect(416, 0, 128, 480);
    ctx.fillStyle = '#eee8d9';
    ctx.fillRect(0, 176, 960, 10);
    ctx.fillRect(0, 294, 960, 10);
    ctx.fillRect(416, 0, 10, 480);
    ctx.fillRect(534, 0, 10, 480);
    ctx.strokeStyle = '#f8f4e9';
    ctx.lineWidth = 3;
    ctx.setLineDash([18,
    15]);
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(960, 240);
    ctx.moveTo(480, 0);
    ctx.lineTo(480, 480);
    ctx.stroke();
    ctx.setLineDash([]);
    drawHouse(0, 0, '#d97d65');
    drawHouse(3, 0, '#8fa9c8');
    drawHouse(7, 0, '#d5a85f');
    drawHouse(10, 0, '#bd8bb3');
    drawHouse(0, 4, '#d9a25d');
    drawHouse(2, 4, '#83a982');
    drawSolarPanel(18, 20);
    drawSolarPanel(258, 20);
    drawSolarPanel(578, 20);
    drawSolarPanel(818, 20);
    drawSolarPanel(18, 340);
    drawSolarPanel(178, 340);
    drawTree(664, 370, .9);
    drawTree(130, 370, .8);
    drawTree(825, 110, .75);
    drawTree(745, 110, .7);
    drawTree(345, 110, .7);
    drawBikeRack();
    drawCommunityHall();
    drawCommunityGarden();
    drawBench(620, 384);
    drawFlowerPatch(60, 380);
    drawFlowerPatch(880, 110);
    roundedRect(420, 188, 120, 104, 12, '#f1dfb5');
    ctx.fillStyle = '#436f5a';
    ctx.font = '700 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('COMMUNITY', 480, 230);
    ctx.font = '11px Arial';
    ctx.fillText('CLIMATE HUB', 480, 250);
    ctx.fillStyle = '#71886c';
    ctx.font = '700 10px Arial';
    ctx.fillText('ROOFTOP SOLAR', 72, 71);
    ctx.fillText('COMMUNITY GARDEN', 304, 471);
  }
  function drawStation(station, index) {
    const cx = station.x * tile + 40,
    cy = station.y * tile + 40;
    const labelWidth = Math.max(58, station.place.length * 7 + 16);
    const isCorrect = correctStations.has(index);
    const isComplete = completed.has(index);
    const markerColor = isCorrect ? '#4e9565' : isComplete ? '#c76f62' : '#f0bf54';
    roundedRect(cx - labelWidth / 2, cy - 54, labelWidth, 19, 8, isCorrect ? '#4e9565' : isComplete ? '#fae8e4' : '#fffaf0');
    ctx.fillStyle = isCorrect ? '#fff' : isComplete ? '#733b32' : '#315943';
    ctx.textAlign = 'center';
    ctx.font = '800 10px Arial';
    ctx.fillText(station.place, cx, cy - 41);
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.fill();
    ctx.strokeStyle = '#fffaf0';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = isComplete ? '#fff' : '#173a30';
    ctx.font = '800 22px Arial';
    ctx.fillText(isCorrect ? '+' : isComplete ? '×' : String(index + 1), cx, cy + 8);
  }
  function nearestStation() {
    return stations.map((station, index) => ( {
      station,
      index,
      distance: Math.abs(station.x - player.x) + Math.abs(station.y - player.y)
    })) .filter(( {
      index
    }) => !completed.has(index)).sort((a, b) => a.distance - b.distance)[0];
  }
  function render() {
    drawMap();
    stations.forEach(drawStation);
    const now = performance.now();
    let px = player.x * tile + 40,
    py = player.y * tile + 40;
    if (moving) {
      const t = Math.min(1, (now - moving.start) / 145);
      const eased = 1 - Math.pow(1 - t, 3);
      px = (moving.fromX + (moving.toX - moving.fromX) * eased) * tile + 40;
      py = (moving.fromY + (moving.toY - moving.fromY) * eased) * tile + 40;
      if (t < 1) requestAnimationFrame(render);
      else {
        player.x = moving.toX;
        player.y = moving.toY;
        moving = null;
        if (started) {
          const near = stations.findIndex((station, index) => !completed.has(index) && Math.abs(station.x - player.x) + Math.abs(station.y - player.y) <= 1);
          if (near >= 0) message.textContent = `You are near ${stations[near].place}. Press Interact to answer.`;
          else {
            const next = nearestStation();
            if (next) message.textContent = `Next station: ${next.station.place}, ${next.distance} ${next.distance === 1 ? 'step' : 'steps'} away.`;
          }
        }
      }
    }
    ctx.fillStyle = '#234c3a';
    ctx.beginPath();
    ctx.ellipse(px, py + 17, 19, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9a35b';
    ctx.beginPath();
    ctx.arc(px, py - 7, 13, 0, Math.PI * 2);
    ctx.fill();
    roundedRect(px - 15, py + 3, 30, 22, 9, '#356c55');
    ctx.fillStyle = '#173a30';
    ctx.beginPath();
    ctx.arc(px - 4, py - 8, 1.5, 0, Math.PI * 2);
    ctx.arc(px + 4, py - 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Reuse the actual map instead of a separate illustration. No idle animation loop.
    const preview = document.getElementById('mission-preview');
    const previewContext = preview && preview.getContext('2d');
    if (previewContext) {
      previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
    }
    if (!started) {
      roundedRect(190, 428, 580, 36, 10, '#fffaf0');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#19362d';
      ctx.font = '700 15px Arial';
      ctx.fillText('Select START MISSION below to explore this neighbourhood', 480, 451);
    }
  }

  function updateScore() {
    score.textContent = `${correctStations.size} / ${stations.length} correct`;
  }
  function renderSummary() {
    summaryScore.textContent = `You got ${correctStations.size} out of ${stations.length} correct. Review each choice and its climate impact below.`;
    summaryList.replaceChildren();
    answerHistory.forEach((result) => {
      const item = document.createElement('li');
      item.className = `game-result ${result.isCorrect ? 'is-correct' : 'is-wrong'}`;
      const heading = document.createElement('h4');
      heading.textContent = `${result.place} · ${result.isCorrect ? 'Correct' : 'Not quite'}`;
      const question = document.createElement('p');
      question.className = 'game-result-question';
      question.textContent = result.question;
      const chosen = document.createElement('p');
      chosen.textContent = `Your answer: ${result.selectedLabel}`;
      const impact = document.createElement('p');
      impact.className = 'game-result-impact';
      impact.textContent = `Why it matters: ${result.correctExplanation}`;
      item.append(heading, question, chosen);
      if (!result.isCorrect) {
        const better = document.createElement('p');
        better.textContent = `More climate-friendly choice: ${result.correctLabel}`;
        const choiceImpact = document.createElement('p');
        choiceImpact.textContent = `Effect of your choice: ${result.selectedExplanation}`;
        item.append(better, choiceImpact);
      }
      item.append(impact);
      summaryList.append(item);
    });
    summaryBox.hidden = false;
  }
  function move(dx, dy) {
    if (!started || moving || activeStation !== null) return;
    const nx = Math.max(0, Math.min(11, player.x + dx));
    const ny = Math.max(0, Math.min(5, player.y + dy));
    if (nx === player.x && ny === player.y) return;
    moving = {
      fromX: player.x,
      fromY: player.y,
      toX: nx,
      toY: ny,
      start: performance.now()
    };
    message.textContent = 'Explore the neighbourhood and visit the marked locations.';
    playCue('move');
    requestAnimationFrame(render);
  }
  function showStationQuestion(index) {
    activeStation = index;
    correctAnswerChosen = false;
    const station = stations[index];
    const lastQuestionIndex = lastQuestionByStation.get(index);
    const availableQuestions = station.questions.filter((_, questionIndex) => questionIndex !== lastQuestionIndex);
    const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    activeQuestion = question;
    lastQuestionByStation.set(index, station.questions.indexOf(question));
    prompt.textContent = `${station.place}: ${question.prompt}`;
    feedback.textContent = '';
    feedback.className = 'game-feedback';
    continueButton.hidden = true;
    optionsBox.replaceChildren();
    const answerChoices = [...question.options];
    for (let i = answerChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answerChoices[i],
      answerChoices[j]] = [answerChoices[j],
      answerChoices[i]];
    }
    let correctSlot = answerChoices.findIndex((option) => option.correct);
    if (answerChoices.length > 1 && correctSlot === lastCorrectSlotByStation.get(index)) {
      const nextSlot = (correctSlot + 1 + Math.floor(Math.random() * (answerChoices.length - 1))) % answerChoices.length;
      [answerChoices[correctSlot],
      answerChoices[nextSlot]] = [answerChoices[nextSlot],
      answerChoices[correctSlot]];
      correctSlot = nextSlot;
    }
    lastCorrectSlotByStation.set(index, correctSlot);
    answerChoices.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-option';
      button.textContent = option.label;
      button.dataset.correct = String(option.correct);
      button.addEventListener('click', () => answer(option, button));
      optionsBox.append(button);
    });
    choiceBox.hidden = false;
    optionsBox.querySelector('button').focus();
  }
  function interact() {
    if (!started || activeStation !== null) return;
    const index = stations.findIndex((station, i) => !completed.has(i) && Math.abs(station.x - player.x) + Math.abs(station.y - player.y) <= 1);
    if (index < 0) {
      const next = nearestStation();
      message.textContent = next ? `Find the ${next.station.place} marker, ${next.distance} ${next.distance === 1 ? 'step' : 'steps'} away.` : 'All stations are complete. Play again to repeat the mission.';
      return;
    }
    showStationQuestion(index);
  }
  function answer(selected, selectedButton) {
    if (activeStation === null || correctAnswerChosen) return;
    const station = stations[activeStation];
    const correctOption = activeQuestion.options.find((option) => option.correct);
    const wasCorrect = Boolean(selected.correct);
    const selectedImpact = selected.feedback.replace(/^Correct\.\s*/i, '').replace(/\s*Try (?:another|a different)[^.]*\.?/i, '').trim();
    completed.add(activeStation);
    if (wasCorrect) correctStations.add(activeStation);
    correctAnswerChosen = true;
    answerHistory.push( {
      place: station.place,
      question: activeQuestion.prompt,
      selectedLabel: selected.label,
      selectedExplanation: selectedImpact,
      correctLabel: correctOption.label,
      correctExplanation: correctOption.feedback.replace(/^Correct\.\s*/i, ''),
      isCorrect: wasCorrect
    });
    [...optionsBox.children].forEach((button) => {
      button.disabled = true;
      if (button.dataset.correct === 'true') button.classList.add('is-correct');
    });
    selectedButton.classList.add(wasCorrect ? 'is-correct' : 'is-wrong');
    updateScore();
    if (wasCorrect) {
      feedback.textContent = `Correct! ${correctOption.feedback.replace(/^Correct\.\s*/i, '')}`;
      feedback.className = 'game-feedback is-correct';
      message.textContent = `Correct at ${station.place}. Read the climate impact, then continue.`;
    } else {
      feedback.textContent = `That answer is locked. ${selectedImpact} A more climate-friendly choice is “${correctOption.label}”. ${correctOption.feedback.replace(/^Correct\.\s*/i, '')}`;
      feedback.className = 'game-feedback is-wrong';
      message.textContent = `Answer locked at ${station.place}. Read the explanation, then continue to the next stop.`;
    }
    continueButton.hidden = false;
    playCue(correctStations.size === stations.length ? 'finish' : wasCorrect ? 'success' : 'wrong');
    continueButton.focus();
  }
  function continueMission() {
    if (!correctAnswerChosen) return;
    const finished = completed.size === stations.length;
    choiceBox.hidden = true;
    optionsBox.replaceChildren();
    continueButton.hidden = true;
    activeStation = null;
    correctAnswerChosen = false;
    if (finished) {
      message.textContent = 'Mission complete! Review your answers and their climate impacts below.';
      startButton.textContent = 'Play again';
      renderSummary();
    } else {
      const next = nearestStation();
      message.textContent = `Next up: ${next.station.place}, ${next.distance} ${next.distance === 1 ? 'step' : 'steps'} away. Explore the map.`;
      startButton.textContent = 'Restart mission';
    }
    render();
    canvas.focus();
  }
  function start() {
    missionNumber += 1;
    completed.clear();
    correctStations.clear();
    answerHistory.length = 0;
    activeQuestion = null;
    player.x = 0;
    player.y = 2;
    moving = null;
    activeStation = null;
    correctAnswerChosen = false;
    summaryBox.hidden = true;
    summaryList.replaceChildren();
    updateScore();
    started = true;
    choiceBox.hidden = true;
    continueButton.hidden = true;
    startButton.textContent = 'Restart mission';
    message.textContent = 'Mission started. Go to the HOME marker and press Interact.';
    render();
    canvas.focus();
  }
  canvas.addEventListener('keydown', (event) => {
    const moves = {
      ArrowUp: [0,
      - 1],
      w: [0,
      - 1],
      W: [0,
      - 1],
      ArrowDown: [0,
      1],
      s: [0,
      1],
      S: [0,
      1],
      ArrowLeft: [ - 1,
      0],
      a: [ - 1,
      0],
      A: [ - 1,
      0],
      ArrowRight: [1,
      0],
      d: [1,
      0],
      D: [1,
      0]
    };
    if (moves[event.key]) {
      event.preventDefault();
      move(...moves[event.key]);
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      interact();
    }
  });
  document.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', () => {
    const vectors = {
      up: [0,
      - 1],
      down: [0,
      1],
      left: [ - 1,
      0],
      right: [1,
      0]
    };
    move(...vectors[button.dataset.move]);
    canvas.focus();
  }));
  document.getElementById('game-interact').addEventListener('click', interact);
  continueButton.addEventListener('click', continueMission);
  startButton.addEventListener('click', start);
  summaryRestart.addEventListener('click', start);
  updateScore();
  render();
})();
