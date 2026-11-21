// Brain Trainer Game Logic - Version 1.0
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const welcomeScreen = document.getElementById("welcome-screen");
  const gameScreen = document.getElementById("game-screen");
  const resultsScreen = document.getElementById("results-screen");

  const startBtn = document.getElementById("start-btn");
  const submitBtn = document.getElementById("submit-btn");
  const playAgainBtn = document.getElementById("play-again-btn");
  const homeBtn = document.getElementById("home-btn");
  const difficultyBtns = document.querySelectorAll(".difficulty-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const resumeBtn = document.getElementById("resume-btn");

  const scoreDisplay = document.getElementById("score");
  const timerDisplay = document.getElementById("timer");
  const problemDisplay = document.getElementById("problem");
  const answerInput = document.getElementById("answer-input");
  const feedbackDisplay = document.getElementById("feedback");
  const progressFill = document.getElementById("progress-fill");
  const pauseOverlay = document.getElementById("pause-overlay");

  const finalScoreDisplay = document.getElementById("final-score");
  const correctAnswersDisplay = document.getElementById("correct-answers");
  const highScoreDisplay = document.getElementById("high-score");
  const performanceMessage = document.getElementById("performance-message");

  // Game State
  let gameState = {
    score: 0,
    timeLeft: 60,
    correctAnswers: 0,
    totalQuestions: 0,
    currentAnswer: null,
    difficulty: "easy",
    timer: null,
    level: 1,
    questionsToNextLevel: 5,
    questionsSinceLastLevel: 0,
    soundEnabled: true,
    isPaused: false,
    isAnswerReady: false,
    keyboardInput: false,
  };

  // Guard delayed actions from earlier rounds.
  let gameSession = 0;
  let challengeSession = 0;
  let countdownTimer = null;

  // Initialize optional audio only following a user gesture.
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  document.addEventListener("click", () => {
    if (!AudioContextConstructor) return;
    try {
      if (!audioContext) audioContext = new AudioContextConstructor();
      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => {});
      }
    } catch (error) {
      console.warn("Audio is unavailable:", error);
    }
  });

  // Difficulty Settings
  const difficultySettings = {
    easy: {
      operations: ["+", "-"],
      maxNum1: 10,
      maxNum2: 10,
      timeLimit: 60,
      pointsPerQuestion: 10,
    },
    medium: {
      operations: ["+", "-", "*"],
      maxNum1: 20,
      maxNum2: 15,
      timeLimit: 60,
      pointsPerQuestion: 15,
    },
    hard: {
      operations: ["+", "-", "*", "/"],
      maxNum1: 50,
      maxNum2: 25,
      timeLimit: 60,
      pointsPerQuestion: 20,
    },
  };

  // Event Listeners
  startBtn.addEventListener("click", startGame);
  submitBtn.addEventListener("click", checkAnswer);
  playAgainBtn.addEventListener("click", startGame);
  homeBtn.addEventListener("click", goToHome);
  pauseBtn.addEventListener("click", pauseGame);
  resumeBtn.addEventListener("click", resumeGame);

  // Set up difficulty buttons
  difficultyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      difficultyBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      gameState.difficulty = btn.dataset.difficulty;
    });
  });

  // Handle Enter key for submitting answers
  answerInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      checkAnswer();
    }
  });

  // Add keyboard shortcuts for easier gameplay
  document.addEventListener("keydown", function (event) {
    // If game is not active or is paused, ignore keyboard shortcuts
    if (!gameScreen.classList.contains("active") || gameState.isPaused) {
      return;
    }

    // Number keys 0-9 for quick input (both regular and numpad)
    const keyCode = event.keyCode;
    const isNumberKey =
      (keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105);

    if (isNumberKey && document.activeElement !== answerInput) {
      // If user presses a number key and input is not focused, focus it and set value
      answerInput.focus();
      // Clear any existing value first if this is a new keystroke
      if (!gameState.keyboardInput) {
        answerInput.value = "";
        gameState.keyboardInput = true;
      }
    }

    // Enter key to submit answer if not already focused on input
    if (event.key === "Enter" && document.activeElement !== answerInput) {
      checkAnswer();
    }

    // Space key to pause/resume
    if (
      event.code === "Space" &&
      document.activeElement !== answerInput &&
      document.activeElement !== submitBtn &&
      document.activeElement !== resumeBtn
    ) {
      event.preventDefault(); // Prevent page scroll on space
      if (gameState.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }

    // Escape key to pause/resume
    if (event.key === "Escape") {
      if (gameState.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });

  // Reset keyboard input flag when clicking on document
  document.addEventListener("click", function () {
    gameState.keyboardInput = false;
  });

  // Initialize game
  function initGame() {
    try {
      // Load high score from localStorage
      const highScore = localStorage.getItem("brainTrainerHighScore") || 0;
      if (highScoreDisplay) {
        highScoreDisplay.textContent = highScore;
      }

      // Load sound preference from localStorage
      if (localStorage.getItem("brainTrainerSound") === "off") {
        gameState.soundEnabled = false;
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      // Continue with default values if localStorage fails
    }

    // Set initial screen
    showScreen(welcomeScreen);

    // Add sound toggle button to welcome screen
    createSoundToggleButton();

    // Load and display user statistics
    loadUserStats();
  }

  // Start the game
  function startGame() {
    gameSession++;
    const session = gameSession;
    clearInterval(countdownTimer);
    clearInterval(gameState.timer);
    // Reset game state
    gameState = {
      score: 0,
      timeLeft: difficultySettings[gameState.difficulty].timeLimit,
      correctAnswers: 0,
      totalQuestions: 0,
      currentAnswer: null,
      difficulty: gameState.difficulty,
      timer: null,
      level: 1,
      questionsToNextLevel: 5,
      questionsSinceLastLevel: 0,
      soundEnabled: gameState.soundEnabled,
      isPaused: false,
      isAnswerReady: false,
      keyboardInput: false,
    };

    // Restore controls in case the previous round was paused.
    pauseOverlay.classList.remove("active");
    answerInput.disabled = false;
    submitBtn.disabled = false;
    pauseBtn.classList.remove("active");
    pauseBtn.textContent = "⏸️ Pause";

    // Update UI
    scoreDisplay.textContent = gameState.score;
    timerDisplay.textContent = gameState.timeLeft;
    progressFill.style.width = "0%";
    feedbackDisplay.className = "feedback";
    feedbackDisplay.textContent = "";

    // Display difficulty level message
    feedbackDisplay.className = "feedback";
    feedbackDisplay.textContent = `Starting ${gameState.difficulty} mode! Get ready...`;
    feedbackDisplay.style.opacity = "1";

    // Countdown before starting
    let countdown = 3;
    problemDisplay.textContent = countdown;

    countdownTimer = setInterval(() => {
      if (session !== gameSession || !gameScreen.classList.contains("active")) {
        clearInterval(countdownTimer);
        return;
      }
      if (gameState.isPaused) return;
      countdown--;

      if (countdown > 0) {
        problemDisplay.textContent = countdown;
      } else {
        clearInterval(countdownTimer);
        countdownTimer = null;

        // Generate first question
        generateQuestion();

        // Start timer
        startTimer();

        // Clear feedback after short delay
        setTimeout(() => {
          feedbackDisplay.style.opacity = "0";
        }, 1500);
      }
    }, 1000);

    // Show game screen
    showScreen(gameScreen);

    // Focus on input
    answerInput.value = "";
    setTimeout(() => {
      answerInput.focus();
    }, 3100); // Focus after countdown completes
  }

  // Generate a new math question based on difficulty
  function generateQuestion() {
    const settings = difficultySettings[gameState.difficulty];

    // Adjust difficulty based on level
    const levelMultiplier = Math.min(3, 1 + (gameState.level - 1) * 0.2);
    const adjustedMaxNum1 = Math.floor(settings.maxNum1 * levelMultiplier);
    const adjustedMaxNum2 = Math.floor(settings.maxNum2 * levelMultiplier);

    // Generate random numbers
    let num1 = Math.floor(Math.random() * adjustedMaxNum1) + 1;
    let num2 = Math.floor(Math.random() * adjustedMaxNum2) + 1;

    // Choose random operation based on difficulty
    const operation =
      settings.operations[
        Math.floor(Math.random() * settings.operations.length)
      ];

    // Special handling for division to ensure clean division
    if (operation === "/") {
      // Make sure division results in an integer for easier gameplay
      if (gameState.level <= 2) {
        num2 = Math.max(1, Math.floor(Math.random() * 10) + 1);
        num1 = num2 * (Math.floor(Math.random() * 10) + 1);
      } else {
        // For higher levels, allow simple non-integer results
        num2 = Math.max(2, Math.floor(Math.random() * 10) + 1);
        // Generate a multiple or half-multiple of num2
        const multiplier = Math.floor(Math.random() * 10) + 1;
        num1 =
          Math.random() > 0.7
            ? num2 * multiplier + num2 / 2
            : num2 * multiplier;
      }
    }

    // For subtraction, ensure the result is positive
    if (operation === "-" && num1 < num2) {
      [num1, num2] = [num2, num1];
    }

    // For multiplication at higher levels, make one number smaller
    if (operation === "*" && gameState.level >= 3) {
      if (Math.random() > 0.5) {
        num1 = Math.min(12, num1); // Keep one number manageable
      } else {
        num2 = Math.min(12, num2);
      }
    }

    // Calculate the correct answer
    let answer;
    let questionText;

    switch (operation) {
      case "+":
        answer = num1 + num2;
        questionText = `${num1} + ${num2} = ?`;
        break;
      case "-":
        answer = num1 - num2;
        questionText = `${num1} - ${num2} = ?`;
        break;
      case "*":
        answer = num1 * num2;
        questionText = `${num1} × ${num2} = ?`;
        break;
      case "/":
        answer = num1 / num2;
        // Round to 1 decimal place for division to avoid long decimals
        answer = Math.round(answer * 10) / 10;
        questionText = `${num1} ÷ ${num2} = ?`;
        // Add a hint for decimal answers
        if (answer % 1 !== 0 && gameState.totalQuestions <= 5) {
          questionText += " (round to 1 decimal if needed)";
        }
        break;
    }

    // Update game state and UI
    gameState.currentAnswer = answer;
    problemDisplay.textContent = questionText;
    gameState.totalQuestions++;
    gameState.isAnswerReady = true;
  }

  // Check the player's answer
  function checkAnswer() {
    if (!gameScreen.classList.contains("active") ||
        gameState.isPaused || !gameState.isAnswerReady ||
        answerInput.value.trim() === "") return;
    gameState.isAnswerReady = false;
    const playerAnswer = parseFloat(answerInput.value);

    // Special handling for division to account for floating point precision
    let isCorrect = false;
    if (String(gameState.currentAnswer).includes(".")) {
      // For division questions, allow small margin of error
      isCorrect = Math.abs(playerAnswer - gameState.currentAnswer) < 0.01;
    } else {
      // For integer answers, exact match is required
      isCorrect = playerAnswer === gameState.currentAnswer;
    }

    // Update game state
    if (isCorrect) {
      // Play correct sound
      playSound("correct");

      // Add points based on difficulty and remaining time (faster = more points)
      const basePoints =
        difficultySettings[gameState.difficulty].pointsPerQuestion;
      const timeBonus = Math.floor(
        basePoints *
          0.5 *
          (gameState.timeLeft /
            difficultySettings[gameState.difficulty].timeLimit)
      );
      const totalPoints = basePoints + timeBonus;

      gameState.score += totalPoints;
      gameState.correctAnswers++;

      // Show feedback with time bonus
      feedbackDisplay.className = "feedback correct";
      feedbackDisplay.textContent = `Correct! +${basePoints} ${
        timeBonus > 0 ? "(+" + timeBonus + " time bonus)" : ""
      }`;

      // Update level progress
      gameState.questionsSinceLastLevel++;
      updateLevelProgress();

      // Apply visual feedback for correct answer
      problemDisplay.classList.add("pulse");
      setTimeout(() => {
        problemDisplay.classList.remove("pulse");
      }, 500);

      // Check if the player should level up
      if (gameState.questionsSinceLastLevel >= gameState.questionsToNextLevel) {
        levelUp();
      }
    } else {
      // Play wrong sound
      playSound("wrong");

      // Show feedback
      feedbackDisplay.className = "feedback incorrect";
      feedbackDisplay.textContent = `Incorrect! The answer was ${gameState.currentAnswer}`;
    }

    // Update score display
    scoreDisplay.textContent = gameState.score;

    // Clear input and focus
    answerInput.value = "";
    answerInput.focus();

    // Ignore delayed callbacks belonging to a previous game session.
    const session = gameSession;
    setTimeout(() => {
      if (session !== gameSession || !gameScreen.classList.contains("active")) return;
      generateQuestion();
      feedbackDisplay.className = "feedback";
    }, 1000);
  }

  // Update the level progress bar
  function updateLevelProgress() {
    const progress =
      (gameState.questionsSinceLastLevel / gameState.questionsToNextLevel) *
      100;
    progressFill.style.width = `${progress}%`;
  }

  // Level up the player
  function levelUp() {
    gameState.level++;
    gameState.questionsSinceLastLevel = 0;
    gameState.questionsToNextLevel += 2; // Increase questions needed for next level

    // Play level up sound
    playSound("levelUp");

    // Update progress bar
    updateLevelProgress();

    // Add time bonus based on difficulty
    const timeBonus = 5 + gameState.level * 2;
    gameState.timeLeft += timeBonus;
    timerDisplay.textContent = gameState.timeLeft;

    // Visual feedback for level up
    gameScreen.classList.add("pulse");
    setTimeout(() => {
      gameScreen.classList.remove("pulse");
    }, 500);

    // Display level up message
    feedbackDisplay.className = "feedback correct";
    feedbackDisplay.style.opacity = "1";
    feedbackDisplay.textContent = `🌟 LEVEL UP! 🌟 Now Level ${gameState.level} (+${timeBonus}s bonus)`;

    // Flash the screen or add some level-up animation
    document.body.style.backgroundColor = "rgba(108, 92, 231, 0.7)";
    setTimeout(() => {
      document.body.style.backgroundColor = "";

      // Hide the level up message after a delay
      setTimeout(() => {
        feedbackDisplay.style.opacity = "0";
      }, 1500);
    }, 300);
  }

  // Start the countdown timer
  function startTimer() {
    // Clear any existing timer
    if (gameState.timer) {
      clearInterval(gameState.timer);
    }

    // Start a new timer
    gameState.timer = setInterval(() => {
      // Only count down if the game is not paused
      if (!gameState.isPaused) {
        gameState.timeLeft--;
        timerDisplay.textContent = gameState.timeLeft;

        // Check if time is running out
        if (gameState.timeLeft <= 10) {
          timerDisplay.style.color = "red";
        } else {
          timerDisplay.style.color = "";
        }

        // Check if time is up
        if (gameState.timeLeft <= 0) {
          endGame();
        }
      }
    }, 1000);
  }

  // End the game
  function endGame() {
    gameSession++;
    gameState.isAnswerReady = false;
    clearInterval(gameState.timer);
    clearInterval(countdownTimer);
    countdownTimer = null;

    // Play game over sound
    playSound("gameOver");

    // Update results screen
    finalScoreDisplay.textContent = gameState.score;
    correctAnswersDisplay.textContent = `${gameState.correctAnswers} / ${gameState.totalQuestions}`;

    // Calculate accuracy percentage
    const accuracy =
      gameState.totalQuestions > 0
        ? Math.round(
            (gameState.correctAnswers / gameState.totalQuestions) * 100
          )
        : 0;

    try {
      // Store additional stats by difficulty
      const difficultyKey = `brainTrainer_${gameState.difficulty}`;
      let difficultyStats;

      try {
        const storedStats = localStorage.getItem(difficultyKey);
        difficultyStats = storedStats
          ? JSON.parse(storedStats)
          : { gamesPlayed: 0, bestScore: 0, bestLevel: 0 };
      } catch (e) {
        console.error("Error parsing difficulty stats:", e);
        difficultyStats = { gamesPlayed: 0, bestScore: 0, bestLevel: 0 };
      }

      // Update stats
      difficultyStats.gamesPlayed += 1;
      difficultyStats.bestScore = Math.max(
        difficultyStats.bestScore,
        gameState.score
      );
      difficultyStats.bestLevel = Math.max(
        difficultyStats.bestLevel,
        gameState.level
      );

      // Save updated stats
      localStorage.setItem(difficultyKey, JSON.stringify(difficultyStats));

      // Check for high score (overall)
      const currentHighScore = parseInt(highScoreDisplay.textContent) || 0;
      if (gameState.score > currentHighScore) {
        highScoreDisplay.textContent = gameState.score;
        localStorage.setItem("brainTrainerHighScore", gameState.score);

        // Special high score animation
        performanceMessage.innerHTML = "🎉 NEW HIGH SCORE! 🎉<br>Amazing job!";
        performanceMessage.classList.add("celebrate");

        // Confetti effect (simple CSS animation)
        const confettiContainer = document.createElement("div");
        confettiContainer.className = "confetti-container";
        for (let i = 0; i < 50; i++) {
          const confetti = document.createElement("div");
          confetti.className = "confetti";
          confetti.style.left = `${Math.random() * 100}%`;
          confetti.style.animationDelay = `${Math.random() * 3}s`;
          confetti.style.backgroundColor = `hsl(${
            Math.random() * 360
          }, 80%, 60%)`;
          confettiContainer.appendChild(confetti);
        }
        resultsScreen.appendChild(confettiContainer);

        // Remove confetti after animation completes
        setTimeout(() => {
          if (confettiContainer && confettiContainer.parentNode) {
            confettiContainer.parentNode.removeChild(confettiContainer);
          }
        }, 8000);
      } else {
        // Set performance message based on score and accuracy
        if (gameState.score > currentHighScore * 0.8) {
          performanceMessage.innerHTML = `Great job! Almost beat your record!<br>Accuracy: ${accuracy}%`;
        } else if (gameState.correctAnswers > gameState.totalQuestions * 0.7) {
          performanceMessage.innerHTML = `Well done! Keep practicing!<br>Accuracy: ${accuracy}%`;
        } else {
          performanceMessage.innerHTML = `Good effort! Try again to improve!<br>Accuracy: ${accuracy}%`;
        }
      }

      // Add a little extra message about the level achieved
      const levelMessage = document.createElement("div");
      levelMessage.className = "level-message";
      levelMessage.textContent = `You reached Level ${gameState.level}`;
      performanceMessage.appendChild(levelMessage);
    } catch (error) {
      console.error("Error saving game stats:", error);
    }

    // Show results screen
    showScreen(resultsScreen);
  }

  // Pause the game
  function pauseGame() {
    if (!gameState.isPaused) {
      gameState.isPaused = true;
      pauseBtn.textContent = "⏸️ Paused";
      pauseBtn.classList.add("active");

      // Show the pause overlay
      pauseOverlay.classList.add("active");

      // Disable the answer input during pause
      answerInput.disabled = true;
      submitBtn.disabled = true;
    }
  }

  // Resume the game
  function resumeGame() {
    if (gameState.isPaused) {
      gameState.isPaused = false;
      pauseBtn.textContent = "⏸️ Pause";
      pauseBtn.classList.remove("active");

      // Hide the pause overlay
      pauseOverlay.classList.remove("active");

      // Re-enable the answer input
      answerInput.disabled = false;
      submitBtn.disabled = false;
      answerInput.focus();
    }
  }

  // Go back to home/welcome screen
  function goToHome() {
    gameSession++;
    challengeSession++;
    clearInterval(countdownTimer);
    countdownTimer = null;
    gameState.isAnswerReady = false;
    if (challengeState?.timer) clearInterval(challengeState.timer);
    answerInput.disabled = false;
    submitBtn.disabled = false;
    // Clear any existing game state
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }

    // Reset pause state if it was active
    gameState.isPaused = false;
    pauseOverlay.classList.remove("active");

    // Reload user stats to show any updates
    loadUserStats();

    // Show welcome screen
    showScreen(welcomeScreen);
  }

  // Create a sound toggle button
  function createSoundToggleButton() {
    // Check if button already exists
    if (document.getElementById("sound-toggle")) {
      return;
    }

    const soundToggle = document.createElement("button");
    soundToggle.id = "sound-toggle";
    soundToggle.className = "btn sound-btn";
    updateSoundButtonText(soundToggle);

    soundToggle.addEventListener("click", () => {
      gameState.soundEnabled = !gameState.soundEnabled;
      try {
        localStorage.setItem(
          "brainTrainerSound",
          gameState.soundEnabled ? "on" : "off"
        );
      } catch (error) {
        console.error("Error saving sound preference:", error);
      }
      updateSoundButtonText(soundToggle);

      // Play a sound to demonstrate the setting
      if (gameState.soundEnabled) {
        playSound("correct");
      }
    });

    // Add to welcome screen
    const difficultySelector = document.querySelector(".difficulty-selector");
    if (difficultySelector) {
      difficultySelector.after(soundToggle);
    }
  }

  // Update sound button text based on current state
  function updateSoundButtonText(button) {
    if (button) {
      button.innerHTML = gameState.soundEnabled
        ? "🔊 Sound On"
        : "🔇 Sound Off";
    }
  }

  // Load and display user statistics
  function loadUserStats() {
    const statsGrid = document.querySelector(".stats-grid");
    if (!statsGrid) return;

    // Clear existing stats
    statsGrid.innerHTML = "";

    try {
      // Get overall high score
      const highScore = localStorage.getItem("brainTrainerHighScore") || 0;

      // Create high score stat card
      createStatCard(statsGrid, "Overall High Score", highScore);

      // Get difficulty-specific stats
      const difficulties = ["easy", "medium", "hard"];
      difficulties.forEach((diff) => {
        const diffKey = `brainTrainer_${diff}`;
        try {
          const storedStats = localStorage.getItem(diffKey);
          if (storedStats) {
            const diffStats = JSON.parse(storedStats);

            if (diffStats.gamesPlayed > 0) {
              const diffName = diff.charAt(0).toUpperCase() + diff.slice(1);
              createStatCard(
                statsGrid,
                `${diffName} Best Score`,
                diffStats.bestScore
              );
              createStatCard(
                statsGrid,
                `${diffName} Best Level`,
                diffStats.bestLevel
              );
              createStatCard(
                statsGrid,
                `${diffName} Games Played`,
                diffStats.gamesPlayed
              );
            }
          }
        } catch (e) {
          console.error(`Error parsing stats for ${diff}:`, e);
        }
      });

      // If no stats found, show message
      if (statsGrid.children.length === 0) {
        const noStats = document.createElement("div");
        noStats.className = "no-stats";
        noStats.textContent = "Play your first game to see stats!";
        statsGrid.appendChild(noStats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      const errorMsg = document.createElement("div");
      errorMsg.className = "no-stats";
      errorMsg.textContent = "Could not load statistics.";
      statsGrid.appendChild(errorMsg);
    }
  }

  // Create stat card helper function
  function createStatCard(container, label, value) {
    if (!container) return;

    const card = document.createElement("div");
    card.className = "stat-card";

    const statLabel = document.createElement("div");
    statLabel.className = "stat-label";
    statLabel.textContent = label;

    const statValue = document.createElement("div");
    statValue.className = "stat-value";
    statValue.textContent = value;

    card.appendChild(statLabel);
    card.appendChild(statValue);
    container.appendChild(card);
  }

  // Play sound based on type using Web Audio API
  function playSound(type) {
    if (!gameState.soundEnabled) return;

    try {
      switch (type) {
        case "correct":
          playTone(440, 0.1, "sine"); // A4 note, short duration
          break;
        case "wrong":
          playTone(220, 0.2, "sawtooth"); // A3 note, longer duration
          break;
        case "levelUp":
          // Play ascending tones for level up
          playTone(440, 0.1, "sine");
          setTimeout(() => playTone(554.37, 0.1, "sine"), 100); // C#5
          setTimeout(() => playTone(659.25, 0.2, "sine"), 200); // E5
          break;
        case "gameOver":
          // Play descending tones for game over
          playTone(440, 0.1, "sine");
          setTimeout(() => playTone(349.23, 0.1, "sine"), 150); // F4
          setTimeout(() => playTone(293.66, 0.3, "sine"), 300); // D4
          break;
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  // Helper function to play a tone
  function playTone(frequency, duration, type = "sine") {
    if (!audioContext) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Add a slight fade out
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.error("Error generating tone:", error);
    }
  }

  // Helper function to switch screens
  function showScreen(screen) {
    // Keep exactly one game screen active; show challenge guidance only in menu.
    document.querySelectorAll(".screen.active").forEach((element) => {
      element.classList.remove("active");
    });
    screen.classList.add("active");
    if (screen.id === "challenge-screen") {
      document.getElementById("challenge-explanation").classList.add("active");
    }
  }

  // Initialize the game when page loads
  initGame();
  // Add these functions and event listeners to your script.js file

  // New DOM elements for Challenge Mode
  const challengeScreen = document.getElementById("challenge-screen");
  const challengeGameScreen = document.getElementById("challenge-game-screen");
  const challengeResultsScreen = document.getElementById(
    "challenge-results-screen"
  );

  const challengeBtn = document.getElementById("challenge-btn");
  const startChallengeBtns = document.querySelectorAll(".start-challenge-btn");
  const challengeBackBtn = document.getElementById("challenge-back-btn");
  const challengePauseBtn = document.getElementById("challenge-pause-btn");
  const challengeResumeBtn = document.getElementById("challenge-resume-btn");
  const retryBtn = document.getElementById("retry-challenge-btn");
  const challengeHomeBtn = document.getElementById("challenge-home-btn");

  const challengeType = document.getElementById("challenge-type");
  const challengeTimer = document.getElementById("challenge-timer");
  const questionCounter = document.getElementById("question-counter");
  const challengeProblem = document.getElementById("challenge-problem");
  const challengeAnswerInput = document.getElementById(
    "challenge-answer-input"
  );
  const challengeSubmitBtn = document.getElementById("challenge-submit-btn");
  const challengeFeedback = document.getElementById("challenge-feedback");
  const challengeProgressFill = document.getElementById(
    "challenge-progress-fill"
  );
  const challengePauseOverlay = document.getElementById(
    "challenge-pause-overlay"
  );

  const challengeFinalTime = document.getElementById("challenge-final-time");
  const challengeCorrectAnswers = document.getElementById(
    "challenge-correct-answers"
  );
  const challengeBestTime = document.getElementById("challenge-best-time");
  const challengePerformanceMessage = document.getElementById(
    "challenge-performance-message"
  );

  const timeAttackBest = document.getElementById("time-attack-best");
  const timeAttackLast = document.getElementById("time-attack-last");

  // Challenge state
  let challengeState = {
    type: "timeAttack", // The type of challenge
    totalQuestions: 20, // Number of questions for time attack
    currentQuestion: 0, // Current question number
    correctAnswers: 0, // Number of correct answers
    startTime: 0, // When the challenge started
    endTime: 0, // When the challenge ended
    elapsedTime: 0, // Total time taken
    timer: null, // Timer interval
    currentAnswer: null, // Current correct answer
    isAnswerReady: false, // Guard duplicate submits
    isPaused: false, // Is the challenge paused
    operations: ["+", "-", "*"], // Default operations for challenges
  };

  // Add event listeners for Challenge Mode
  if (challengeBtn) {
    challengeBtn.addEventListener("click", showChallengeScreen);
  }

  if (startChallengeBtns) {
    startChallengeBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const challengeType = this.dataset.challenge;
        startChallenge(challengeType);
      });
    });
  }

  if (challengeBackBtn) {
    challengeBackBtn.addEventListener("click", goToHome);
  }

  if (challengeSubmitBtn) {
    challengeSubmitBtn.addEventListener("click", checkChallengeAnswer);
  }

  if (challengeAnswerInput) {
    challengeAnswerInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        checkChallengeAnswer();
      }
    });
  }

  if (challengePauseBtn) {
    challengePauseBtn.addEventListener("click", pauseChallenge);
  }

  if (challengeResumeBtn) {
    challengeResumeBtn.addEventListener("click", resumeChallenge);
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      startChallenge(challengeState.type);
    });
  }

  if (challengeHomeBtn) {
    challengeHomeBtn.addEventListener("click", showChallengeScreen);
  }

  // Escape / Space pause and resume Time Attack too.
  document.addEventListener("keydown", (event) => {
    if (!challengeGameScreen.classList.contains("active")) return;
    if (event.key !== "Escape" && event.code !== "Space") return;
    if (event.code === "Space" &&
        [challengeAnswerInput, challengeSubmitBtn, challengeResumeBtn].includes(document.activeElement)) return;
    event.preventDefault();
    if (challengeState.isPaused) resumeChallenge();
    else pauseChallenge();
  });

  // Show the challenge selection screen
  function showChallengeScreen() {
    loadChallengeStats();
    showScreen(challengeScreen);
  }

  // Start a challenge
  function startChallenge(type) {
    challengeSession++;
    clearInterval(challengeState.timer);
    challengePauseOverlay.classList.remove("active");
    challengeAnswerInput.disabled = false;
    challengeSubmitBtn.disabled = false;
    challengePauseBtn.classList.remove("active");
    challengePauseBtn.textContent = "⏸️ Pause";
    // Reset challenge state
    challengeState = {
      type: type,
      totalQuestions: 20, // Fixed for Time Attack mode
      currentQuestion: 0,
      correctAnswers: 0,
      startTime: Date.now(),
      elapsedTime: 0,
      timer: null,
      currentAnswer: null,
      isAnswerReady: false,
      isPaused: false,
      operations: ["+", "-", "*"], // Default operations for challenges
    };

    // Update the UI
    challengeType.textContent = formatChallengeTypeName(type);
    updateQuestionCounter();
    challengeProgressFill.style.width = "0%";
    challengeFeedback.className = "feedback";
    challengeFeedback.textContent = "";

    // Reset timer display
    updateTimerDisplay();

    // Start the timer
    startChallengeTimer();

    // Generate first question
    generateChallengeQuestion();

    // Show the challenge game screen
    showScreen(challengeGameScreen);

    // Focus on input
    challengeAnswerInput.value = "";
    challengeAnswerInput.focus();
  }

  // Generate a question for the challenge
  function generateChallengeQuestion() {
    // Generate more challenging questions than the regular game
    const maxNum1 = 20;
    const maxNum2 = 20;

    // Generate random numbers
    let num1 = Math.floor(Math.random() * maxNum1) + 1;
    let num2 = Math.floor(Math.random() * maxNum2) + 1;

    // Choose random operation
    const operation =
      challengeState.operations[
        Math.floor(Math.random() * challengeState.operations.length)
      ];

    // Special handling for subtraction to ensure positive result
    if (operation === "-" && num1 < num2) {
      [num1, num2] = [num2, num1];
    }

    // Calculate the correct answer
    let answer;
    let questionText;

    switch (operation) {
      case "+":
        answer = num1 + num2;
        questionText = `${num1} + ${num2} = ?`;
        break;
      case "-":
        answer = num1 - num2;
        questionText = `${num1} - ${num2} = ?`;
        break;
      case "*":
        answer = num1 * num2;
        questionText = `${num1} × ${num2} = ?`;
        break;
    }

    // Update challenge state and UI
    challengeState.currentAnswer = answer;
    challengeProblem.textContent = questionText;
    challengeState.currentQuestion++;
    challengeState.isAnswerReady = true;
    updateQuestionCounter();
  }

  // Check the player's answer in challenge mode
  function checkChallengeAnswer() {
    if (!challengeGameScreen.classList.contains("active") ||
        challengeState.isPaused || !challengeState.isAnswerReady ||
        challengeAnswerInput.value.trim() === "") return;
    challengeState.isAnswerReady = false;
    const playerAnswer = Number(challengeAnswerInput.value);

    // Check if the answer is correct
    const isCorrect = playerAnswer === challengeState.currentAnswer;

    if (isCorrect) {
      // Play correct sound
      playSound("correct");

      // Increment correct answers
      challengeState.correctAnswers++;

      // Show feedback
      challengeFeedback.className = "feedback correct";
      challengeFeedback.textContent = "Correct!";

      // Apply visual feedback
      challengeProblem.classList.add("pulse");
      setTimeout(() => {
        challengeProblem.classList.remove("pulse");
      }, 500);
    } else {
      // Play wrong sound
      playSound("wrong");

      // Show feedback
      challengeFeedback.className = "feedback incorrect";
      challengeFeedback.textContent = `Incorrect! The answer was ${challengeState.currentAnswer}`;
    }

    // Clear input and focus
    challengeAnswerInput.value = "";
    challengeAnswerInput.focus();

    // Update progress bar
    updateChallengeProgress();

    // Check if challenge is complete
    if (challengeState.currentQuestion >= challengeState.totalQuestions) {
      endChallenge();
    } else {
      // A callback from an earlier Time Attack must not modify this round.
      const session = challengeSession;
      setTimeout(() => {
        if (session !== challengeSession ||
            !challengeGameScreen.classList.contains("active")) return;
        generateChallengeQuestion();
        challengeFeedback.className = "feedback";
      }, 1000);
    }
  }

  // Update the question counter
  function updateQuestionCounter() {
    questionCounter.textContent = `${challengeState.currentQuestion}/${challengeState.totalQuestions}`;
  }

  // Update challenge progress bar
  function updateChallengeProgress() {
    const progress =
      (challengeState.currentQuestion / challengeState.totalQuestions) * 100;
    if (challengeProgressFill) {
      challengeProgressFill.style.width = `${progress}%`;
    }
  }

  // Start the challenge timer
  function startChallengeTimer() {
    // Clear any existing timer
    if (challengeState.timer) {
      clearInterval(challengeState.timer);
    }

    // Start a new timer
    challengeState.timer = setInterval(() => {
      // Only update if the challenge is not paused
      if (!challengeState.isPaused) {
        challengeState.elapsedTime = Date.now() - challengeState.startTime;
        updateTimerDisplay();
      }
    }, 100); // Update more frequently for smoother display
  }

  // Update the timer display
  function updateTimerDisplay() {
    // Convert elapsed time from milliseconds to minutes and seconds
    const totalSeconds = Math.floor(challengeState.elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Format as mm:ss
    challengeTimer.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    // Change color as time increases (optional visual cue)
    if (minutes >= 2) {
      challengeTimer.style.color = "red";
    } else if (minutes >= 1) {
      challengeTimer.style.color = "orange";
    } else {
      challengeTimer.style.color = "";
    }
  }

  // Pause the challenge
  function pauseChallenge() {
    if (!challengeState.isPaused) {
      challengeState.isPaused = true;
      challengePauseBtn.textContent = "⏸️ Paused";
      challengePauseBtn.classList.add("active");

      // Show the pause overlay
      challengePauseOverlay.classList.add("active");

      // Disable the answer input during pause
      challengeAnswerInput.disabled = true;
      challengeSubmitBtn.disabled = true;
    }
  }

  // Resume the challenge
  function resumeChallenge() {
    if (challengeState.isPaused) {
      // Adjust the start time to account for the pause duration
      const pauseDuration =
        Date.now() - (challengeState.startTime + challengeState.elapsedTime);
      challengeState.startTime += pauseDuration;

      challengeState.isPaused = false;
      challengePauseBtn.textContent = "⏸️ Pause";
      challengePauseBtn.classList.remove("active");

      // Hide the pause overlay
      challengePauseOverlay.classList.remove("active");

      // Re-enable the answer input
      challengeAnswerInput.disabled = false;
      challengeSubmitBtn.disabled = false;
      challengeAnswerInput.focus();
    }
  }

  // End the challenge
  function endChallenge() {
    challengeSession++;
    challengeState.isAnswerReady = false;
    // Stop the timer
    clearInterval(challengeState.timer);

    // Record end time
    challengeState.endTime = Date.now();
    challengeState.elapsedTime =
      challengeState.endTime - challengeState.startTime;

    // Format time for display
    const minutes = Math.floor(challengeState.elapsedTime / 60000);
    const seconds = Math.floor((challengeState.elapsedTime % 60000) / 1000);
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Play game over sound
    playSound("gameOver");

    // Update results screen
    challengeFinalTime.textContent = formattedTime;
    challengeCorrectAnswers.textContent = `${challengeState.correctAnswers}/${challengeState.totalQuestions}`;

    // Calculate accuracy
    const accuracy = Math.round(
      (challengeState.correctAnswers / challengeState.totalQuestions) * 100
    );

    // Check if this is a new best time
    let isBestTime = false;

    try {
      const challengeKey = `brainTrainer_challenge_${challengeState.type}`;
      let challengeStats = JSON.parse(
        localStorage.getItem(challengeKey) ||
          '{"bestTime": null, "lastTime": null}'
      );

      // Update last time
      challengeStats.lastTime = challengeState.elapsedTime;

      // Check if this is a new best time (only if all questions were answered correctly)
      if (challengeState.correctAnswers === challengeState.totalQuestions) {
        if (
          challengeStats.bestTime === null ||
          challengeState.elapsedTime < challengeStats.bestTime
        ) {
          challengeStats.bestTime = challengeState.elapsedTime;
          isBestTime = true;
        }
      }

      // Save updated stats
      localStorage.setItem(challengeKey, JSON.stringify(challengeStats));

      // Display best time
      if (challengeStats.bestTime !== null) {
        const bestMinutes = Math.floor(challengeStats.bestTime / 60000);
        const bestSeconds = Math.floor(
          (challengeStats.bestTime % 60000) / 1000
        );
        challengeBestTime.textContent = `${bestMinutes
          .toString()
          .padStart(2, "0")}:${bestSeconds.toString().padStart(2, "0")}`;
      } else {
        challengeBestTime.textContent = "--:--";
      }
    } catch (error) {
      console.error("Error saving challenge stats:", error);
      challengeBestTime.textContent = "--:--";
    }

    // Set performance message
    if (isBestTime) {
      challengePerformanceMessage.innerHTML =
        "🎉 NEW BEST TIME! 🎉<br>Amazing job!";
      challengePerformanceMessage.classList.add("celebrate");
    } else if (
      challengeState.correctAnswers === challengeState.totalQuestions
    ) {
      challengePerformanceMessage.innerHTML = `Great job! Perfect accuracy!<br>Keep practicing to improve your time.`;
    } else {
      challengePerformanceMessage.innerHTML = `Good effort! You got ${accuracy}% correct.<br>Try again for a better score.`;
    }

    // Show results screen
    showScreen(challengeResultsScreen);

    // Update challenge stats for display
    loadChallengeStats();
  }

  // Load and display challenge statistics
  function loadChallengeStats() {
    try {
      // Time Attack stats
      const timeAttackKey = "brainTrainer_challenge_timeAttack";
      const timeAttackStats = JSON.parse(
        localStorage.getItem(timeAttackKey) ||
          '{"bestTime": null, "lastTime": null}'
      );

      if (timeAttackStats.bestTime !== null) {
        const bestMinutes = Math.floor(timeAttackStats.bestTime / 60000);
        const bestSeconds = Math.floor(
          (timeAttackStats.bestTime % 60000) / 1000
        );
        timeAttackBest.textContent = `${bestMinutes
          .toString()
          .padStart(2, "0")}:${bestSeconds.toString().padStart(2, "0")}`;
      } else {
        timeAttackBest.textContent = "--:--";
      }

      if (timeAttackStats.lastTime !== null) {
        const lastMinutes = Math.floor(timeAttackStats.lastTime / 60000);
        const lastSeconds = Math.floor(
          (timeAttackStats.lastTime % 60000) / 1000
        );
        timeAttackLast.textContent = `${lastMinutes
          .toString()
          .padStart(2, "0")}:${lastSeconds.toString().padStart(2, "0")}`;
      } else {
        timeAttackLast.textContent = "--:--";
      }
    } catch (error) {
      console.error("Error loading challenge stats:", error);
    }
  }

  // Helper function to format challenge type name for display
  function formatChallengeTypeName(type) {
    switch (type) {
      case "timeAttack":
        return "Time Attack";
      case "precision":
        return "Precision Challenge";
      case "endurance":
        return "Endurance Test";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
});
