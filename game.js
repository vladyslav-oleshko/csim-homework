let gameContainer;
let gameContext;
let ball;
let engineConfig;
let userPlatform;
let AIPlatform;
let gameField;
let gameState = 'menu';
let menu;
let menuTitle;
let playButton;
let lastFrameTime = null;
let timeAccumulator = 0;
let currentDifficulty = 'default';
let AITargetY = null;

const difficulties = {
    default: { AISpeed: 3.2, padding: 40, predict: false },
    hard:    { AISpeed: 4.5, padding: 20, predict: true, reactionX: 500, error: 60 },
    madness: { AISpeed: 5,   padding: 10, predict: true, reactionX: 500, error: 30 }
};

class Platform {
    constructor(positionX, positionY, width, height, AISpeed, score) {
        this.posX = positionX;
        this.posY = positionY;
        this.width = width;
        this.height = height;
        this.AISpeed = AISpeed;
        this.score = score;
    }
}

class Ball {
    constructor(positionX, positionY, radius, angle, speedX, speedY) {
        this.posX = positionX;
        this.posY = positionY;
        this.radius = radius;
        this.angle = angle;
        this.speedX = speedX;
        this.speedY = speedY;
    }
}

const initDefaultValues = () => {
    engineConfig = {
        ticksPerSecond: 60,
        delta: 0.175,
        scoreToWin: 10,
        ballSpeedX: 5,
        ballSpeedY: 1.5,
    }

    ball = new Ball(gameContainer.width / 2, gameContainer.height / 2, 8, 0, engineConfig.ballSpeedX, engineConfig.ballSpeedY);
    gameField = new Platform(0, 0, gameContainer.width, gameContainer.height);
    userPlatform = new Platform(0,(gameContainer.height - 100) / 2, 10, 100, 0, 0);
    AIPlatform = new Platform(gameContainer.width - 10, (gameContainer.height - 100) / 2, 10, 100, 3.5, 0);
}

const showMenu = (title, buttonText) => {
    menuTitle.textContent = title;
    playButton.textContent = buttonText;
    menu.classList.remove('hidden');
    gameState = 'menu';
}

const selectDifficulty = (name) => {
    currentDifficulty = name;
    document.querySelectorAll('.difficulty-button').forEach((button) => {
        button.classList.toggle('active', button.dataset.difficulty === name);
    });
}

const startGame = () => {
    AIPlatform.AISpeed = difficulties[currentDifficulty].AISpeed;
    userPlatform.score = 0;
    AIPlatform.score = 0;
    resetBall();
    menu.classList.add('hidden');
    gameState = 'playing';
}

const isGameOver = () => {
    if (userPlatform.score >= engineConfig.scoreToWin || AIPlatform.score >= engineConfig.scoreToWin) {
        const winner = userPlatform.score > AIPlatform.score ? 'You' : 'Computer';
        showMenu(`${winner} won the game!`, 'Play again');
    }
}

const resetBall = () => {
    isGameOver();
    ball.posX = gameContainer.width / 2;
    ball.posY = gameContainer.height / 2;
    ball.speedX = -Math.sign(ball.speedX) * engineConfig.ballSpeedX;
    ball.speedY = engineConfig.ballSpeedY;
}

const predictBallY = (targetX) => {
    let x = ball.posX;
    let y = ball.posY;
    let speedY = ball.speedY;

    while (x < targetX) {
        x += ball.speedX;
        y += speedY;

        if (y + ball.radius > gameContainer.height) {
            y = gameContainer.height - ball.radius;
            speedY = -Math.abs(speedY);
        } else if (y - ball.radius < 0) {
            y = ball.radius;
            speedY = Math.abs(speedY);
        }
    }
    return y;
}

const AIMovement = () => {
    const difficulty = difficulties[currentDifficulty];
    const isBallComing = ball.speedX > 0 && ball.posX >= difficulty.reactionX;

    if (!difficulty.predict || !isBallComing) {
        AITargetY = null;
    } else if (AITargetY === null) {
        const error = (Math.random() * 2 - 1) * difficulty.error;
        AITargetY = predictBallY(AIPlatform.posX - ball.radius) + error;
    }

    const targetY = AITargetY === null ? ball.posY : AITargetY;
    const platformCenter = AIPlatform.posY + (AIPlatform.height / 2);

    if (platformCenter < (targetY - difficulty.padding)) {
        AIPlatform.posY += AIPlatform.AISpeed;
    } else if (platformCenter > (targetY + difficulty.padding)) {
        AIPlatform.posY -= AIPlatform.AISpeed;
    }
}

const isBallHittingPlatform = (platform) => (
  (ball.posX + ball.radius >= platform.posX) &&
  (ball.posX - ball.radius <= platform.posX + platform.width) &&
  (ball.posY + ball.radius >= platform.posY) &&
  (ball.posY - ball.radius <= platform.posY + platform.height)
)

const bounceFromPlatform = (platform) => {
    const delta = ball.posY - (platform.posY + platform.height / 2);
    ball.speedY = delta * engineConfig.delta;
}

const calculateGame = () => {
    AIMovement();

    ball.posX += ball.speedX;
    ball.posY += ball.speedY;

    if (ball.speedX > 0 && isBallHittingPlatform(AIPlatform)) {
        ball.posX = AIPlatform.posX - ball.radius;
        ball.speedX = -ball.speedX;
        bounceFromPlatform(AIPlatform);
    } else if (ball.speedX < 0 && isBallHittingPlatform(userPlatform)) {
        ball.posX = userPlatform.posX + userPlatform.width + ball.radius;
        ball.speedX = -ball.speedX;
        bounceFromPlatform(userPlatform);
    }

    if (ball.posX - ball.radius > gameContainer.width) {
        userPlatform.score += 1;
        resetBall();
    } else if (ball.posX + ball.radius < 0) {
        AIPlatform.score += 1;
        resetBall();
    }

    if (ball.posY + ball.radius > gameContainer.height) {
        ball.posY = gameContainer.height - ball.radius;
        ball.speedY = -Math.abs(ball.speedY);
    } else if (ball.posY - ball.radius < 0) {
        ball.posY = ball.radius;
        ball.speedY = Math.abs(ball.speedY);
    }
}

const drawRect = (color, {posX, posY, width, height}) => {
    gameContext.fillStyle = color;
    gameContext.fillRect(posX, posY, width, height);
}

const drawCircle = (color, {posX, posY, radius, angle}) => {
    gameContext.fillStyle = color;
    gameContext.beginPath();
    gameContext.arc(posX, posY, radius, angle, Math.PI * 2, true);
    gameContext.fill();
}

const drawScore = () => {
    gameContext.fillText(userPlatform.score, 100, 100);
    gameContext.fillText(AIPlatform.score, gameContainer.width - 100, 100);
}

const drawLine = () => {
    for (let i = 0, max = gameContainer.height; i < max; i += 40) {
        drawRect('yellow', {
            posX: gameContainer.width / 2 - 1,
            posY: i,
            width: 2,
            height: 20
        });
    }
}

const drawGame = () => {
    drawRect('black', gameField); // Initial field
    drawRect('yellow', userPlatform); // User platform
    drawRect('yellow', AIPlatform); // AI platform
    drawLine();
    drawCircle('yellow', ball); // Ball
    drawScore(); // Score
}

const gameEngine = (time) => {
    if (lastFrameTime === null) {
        lastFrameTime = time;
    }
    timeAccumulator += Math.min(time - lastFrameTime, 250);
    lastFrameTime = time;

    const tickDuration = 1000 / engineConfig.ticksPerSecond;
    while (timeAccumulator >= tickDuration) {
        if (gameState === 'playing') {
            calculateGame();
        }
        timeAccumulator -= tickDuration;
    }

    drawGame();
    requestAnimationFrame(gameEngine);
}

const calculateMousePosition = (event) => {
    const rect = gameContainer.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (gameContainer.width / rect.width),
        y: (event.clientY - rect.top) * (gameContainer.height / rect.height),
    }
}

window.onload = () => {
    gameContainer = document.getElementById('gameContainer');
    gameContext = gameContainer.getContext('2d');
    menu = document.getElementById('menu');
    menuTitle = document.getElementById('menuTitle');
    playButton = document.getElementById('playButton');

    initDefaultValues();
    requestAnimationFrame(gameEngine);

    gameContainer.addEventListener('mousemove', (event) => {
        userPlatform.posY = calculateMousePosition(event).y - userPlatform.height / 2;
    })
    playButton.addEventListener('click', startGame);
    document.querySelectorAll('.difficulty-button').forEach((button) => {
        button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
    });
}
