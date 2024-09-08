window.onload = function() {
    // Firebase-related variables
    let playerId;
    let playerRef;
    let playerElements = {};
    let players = {}

    const playerColors = ["black", "blue", "brown", "cyan", "gray", "green", "peach", "pink", "purple", "red", "white", "yellow"];
    const reversedPlayerColors = ["black", "blue", "brown", "cyan", "gray", "green"];
    const birdImages = {
        "black": "assets/flappy-bird-black.png",
        "blue": "assets/flappy-bird-blue.png",
        "brown": "assets/flappy-bird-brown.png",
        "cyan": "assets/flappy-bird-cyan.png",
        "gray": "assets/flappy-bird-gray.png",
        "green": "assets/flappy-bird-green.png",
        "peach": "assets/flappy-bird-peach.png",
        "pink": "assets/flappy-bird-pink.png",
        "purple": "assets/flappy-bird-purple.png",
        "red": "assets/flappy-bird-red.png",
        "white": "assets/flappy-bird-white.png",
        "yellow": "assets/flappy-bird-yellow.png",
    };
    // Flappy Bird-related variables
    let board;
    let boardHeight = 640;
    let boardWidth = 360;
    let context;

    let birdWidth = 34; 
    let birdHeight = 24;
    let birdX = boardWidth / 8;
    let birdY = boardHeight / 2;
    let birdImg;
    let bird = {
        x: birdX,
        y: birdY,
        width: birdWidth,
        height: birdHeight
    };

    let pipeArray = [];
    let pipeWidth = 64; 
    let pipeHeight = 512;
    let pipeX = boardWidth;
    let pipeY = 0;
    //const predefinedPipeYValues = [-128, -256, -384, -385, -640];
    // -450 e najgorno, najdolno e
    
    
    const predefinedPipeYValues = [
        -390, -150, -330, -240, -270, 
        -120, -420, -360, -180, -300, 
        -450, -150, -330, -270, -420, 
        -360, -120, -390, -240, -120
    ];

    const reversedPipeYValues = [
        -120, -240, -390, -120, -360, 
        -420, -270, -330, -150, -450, 
        -300, -180, -360, -420, -120, 
        -270, -240, -330, -150, -390
    ];
    
    
    let useReversed = false;
    let currentPipeIndex = 0; 
    
    let topPipeImg;
    let bottomPipeImg;

    let velocityX = -2; 
    let velocityY = 0; 
    let gravity = 0.4;
    let jumped = false; 

    let gameOver = false;
    let gameStarted = false;
    let waitingForPlayers=false;

    const gameContainer = document.querySelector(".game-container");
    const playerYpositions = [(boardHeight / 1.5),(boardHeight / 2),(boardHeight / 2.5),(boardHeight / 3)]

    // Utility functions
    function randomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function getName() {
        const adjective = randomFromArray([
            "Knowledgeable", "Coordinated", "Defective", "Ready", "Grumpy",
            "hysterical", "Bored", "Hateful", "Longing", "Laughable",
            "Grotesque", "Jumpy", "Noxious", "Abashed", "Whimsical",
            "Lavish", "Zesty", "Quiet", "Obscene", "Unkempt"
        ]);
        const birdName = randomFromArray([
            "Sparrow", "Eagle", "Parrot", "Penguin", "Hummingbird",
            "Flamingo", "Owl", "Peacock", "Falcon", "Robin", "Swan",
            "Pelican", "Woodpecker", "Kingfisher", "Canary", "Crow",
            "Dove", "Heron", "Toucan", "Seagull"
        ]);
        return `${adjective} ${birdName}`;
    }

    function drawAllBirds() {
        if (!context) return;
        
        Object.keys(players).forEach(id => {
            const player = players[id];
            const img = new Image();
            img.src = birdImages[player.color];
            context.drawImage(img, player.x, player.y, birdWidth, birdHeight);
        });
    }

    function initGame() {
        const allPlayersRef = firebase.database().ref(`players`);
       
        allPlayersRef.on("value", (snapshot) => {
            players = snapshot.val() || {};
            drawAllBirds();

            checkIfAllPlayersReady();
            
            if (players[playerId]) {
                birdImg.src = birdImages[players[playerId].color];
            }
            
        });

        // Handle new players joining
        allPlayersRef.on("child_added", (snapshot) => {
            const addedPlayer = snapshot.val();
            addPlayerElement(addedPlayer);
        });

        // Handle players leaving
        allPlayersRef.on("child_removed", (snapshot) => {
            const removedPlayer = snapshot.val();
            removePlayerElement(removedPlayer.id);
        });

        // Handle player updates
        allPlayersRef.on("child_changed", (snapshot) => {
            const changedPlayer = snapshot.val();
            updatePlayerElement(changedPlayer.id, changedPlayer);
        });
    }

    function checkForColorAndSetReversed(colorsToCheck) {
        const hasColor = Object.values(players).some(player => colorsToCheck.includes(player.color));
    
        if (hasColor) {
            useReversed = true; // Set the flag to use the reversed array
        } else {
            useReversed = false; // Otherwise, use the normal array
        }
    }

    function addPlayerElement(player) {
        const characterElement = document.createElement("div");
        characterElement.classList.add("Character");

        characterElement.innerHTML = `
        <div class="Character_name-container">
            <img src="" class="Character_img"/>
            <span class="Character_name"></span>
        </div>
    `;

    playerElements[player.id] = characterElement;
    characterElement.querySelector(".Character_name").innerText = player.name;
    const imgElement = characterElement.querySelector(".Character_img");
    imgElement.src = "assets/flappy-bird-" + `${player.color}` + ".png";
    gameContainer.appendChild(characterElement);
    }

    function updatePlayerElement(playerId, playerData) {
        const characterElement = playerElements[playerId];
        if (characterElement) {
            characterElement.querySelector(".Character_name").innerText = playerData.name;
        }
    }

    function removePlayerElement(playerId) {
        const characterElement = playerElements[playerId];
        if (characterElement) {
            gameContainer.removeChild(characterElement);
            delete playerElements[playerId];
        }
    }

    // Flappy Bird game setup
    function setupFlappyBirdGame(color) {
        board = document.getElementById("board");
        board.height = boardHeight;
        board.width = boardWidth;
        context = board.getContext("2d");

        birdImg = new Image();
        birdImg.src = birdImages[color] || "assets/flappy-bird-yellow.png"; // Default to yellow if color not found
        birdImg.onload = function() {
            context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
        };
         // Wait until background and bird images are loaded
        document.addEventListener("keydown", startGame);
        document.addEventListener("keydown", moveBird);
        document.addEventListener("keyup", function(e) {
            if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {
                jumped = false; // Reset the flag when the key is released
            }
        });
    }

    function checkIfAllPlayersReady() {
        const allPlayersReady = Object.values(players).every(player => player.ready);
        checkForColorAndSetReversed(reversedPlayerColors);
        if (allPlayersReady && !gameStarted) {
            startGameForAllPlayers();
        }
    }
     function startGame(e){
        if (e.code === "ArrowUp" && !gameStarted) {
            playerRef.update({ready : true});
            checkIfAllPlayersReady();
        }      
    }
     function startGameForAllPlayers() {
       
            gameStarted = true;
            topPipeImg = new Image();
            topPipeImg.src = "assets/pipe1.png";

            bottomPipeImg = new Image();
            bottomPipeImg.src = "assets/pipe2.png";

            
            setInterval(placePipes, 1500); // every 1.5 seconds
            requestAnimationFrame(update);
        }

    function update() {
        if (!context) return;
        
        context.clearRect(0, 0, board.width, board.height);
    
        // Draw pipes first
        for (let i = 0; i < pipeArray.length; i++) {
            let pipe = pipeArray[i];
            pipe.x += velocityX;
            context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);   
        }

        drawAllBirds();
        // Bird physics for the current player
        if(!players[playerId].gameOver){
            velocityY += gravity;
            bird.y = Math.max(bird.y + velocityY, 0); // Limit the bird.y to the top of the canvas
            context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

            // Check for collisions
            for (let i = 0; i < pipeArray.length; i++) {
                let pipe = pipeArray[i];
                if (detectCollision(bird, pipe)) {
                    playerRef.update({ gameOver: true });
                    break;
                }
            }
            // If the bird falls
            if (bird.y > board.height) {
                playerRef.update({ gameOver: true });
            }
        }
         //clear pipes that have moved out of view
        while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
            pipeArray.shift(); //removes first element from the array
        }

          // Check how many players are still alive
        let alivePlayers = Object.values(players).filter(player => !player.gameOver);

        if (players[playerId].gameOver) {
            if (alivePlayers.length === 1) {
                // If only one player is alive, show the game over message on this player's screen
                const winnerName = alivePlayers[0].name;
                context.fillStyle = "white";
                context.font = "12px 'Press Start 2P', sans-serif";
                context.fillText(`GAME OVER,`, 5, 90);
                context.fillText(`${winnerName} WINS`, 5, 120);
                context.fillText("RESTART THE GAME", 5, 150);
            context.fillText("TO PLAY AGAIN", 5, 180);
            }
        } else if (alivePlayers.length === 1 && alivePlayers[0].id === playerId) {
            // If this is the last player alive, show "YOU WON" when they die
            context.fillStyle = "white";
            context.font = "12px 'Press Start 2P', sans-serif";
            context.fillText("YOU WON", 5, 90);
            context.fillText("RESTART THE GAME", 5, 120);
            context.fillText("TO PLAY AGAIN", 5, 150);
            
        }
        // Update the player's position in Firebase
        playerRef.update({
            x: bird.x,
            y: bird.y,
        });
        
        requestAnimationFrame(update);
        
    }
    
    
    function placePipes() {
        if (gameOver || !gameStarted) {
            return;
        }
        let pipeY = predefinedPipeYValues[currentPipeIndex];
        let reversedPipeY = reversedPipeYValues[currentPipeIndex]
        let openingSpace = board.height / 4;
        const allPlayersReversed = Object.values(players).every(player => player.reversed);
        

        if(useReversed){
            let topPipe = {
                img: topPipeImg,
                x: pipeX,
                y: reversedPipeY,
                width: pipeWidth,
                height: pipeHeight,
                passed: false
            };
        
            pipeArray.push(topPipe);
        
            let bottomPipe = {
                img: bottomPipeImg,
                x: pipeX,
                y: reversedPipeY + pipeHeight + openingSpace,
                width: pipeWidth,
                height: pipeHeight,
                passed: false
            };
            pipeArray.push(bottomPipe);
            currentPipeIndex = (currentPipeIndex + 1) % predefinedPipeYValues.length;
        }
        else{
            let topPipe = {
                img: topPipeImg,
                x: pipeX,
                y: pipeY,
                width: pipeWidth,
                height: pipeHeight,
                passed: false
            };
        
            pipeArray.push(topPipe);
        
            let bottomPipe = {
                img: bottomPipeImg,
                x: pipeX,
                y: pipeY + pipeHeight + openingSpace,
                width: pipeWidth,
                height: pipeHeight,
                passed: false
            };
            pipeArray.push(bottomPipe);
            currentPipeIndex = (currentPipeIndex + 1) % predefinedPipeYValues.length;
    }
}

function resetGameState() {
    bird.y = birdY;
    velocityY = 0; // Reset velocity
    gameOver = false;
    pipeArray = [];
    useReversed = !useReversed;

    // Clear and reinitialize the canvas
    context.clearRect(0, 0, board.width, board.height);

    // Reinitialize game elements
    setupFlappyBirdGame(players[playerId].color);
    setInterval(placePipes, 1500);
    requestAnimationFrame(update);

    playerRef.update({
        x: birdX,
        y: birdY,
        gameOver: false
    });
}
    
    function moveBird(e) {
        if (players[playerId].gameOver) return;

        if (e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {
            
            velocityY = -6;
            jumped = true;   
            if (gameOver && gameStarted) {
                resetGameState();
            }
        }
    }

    function detectCollision(a, b) {
        return a.x < b.x + b.width && 
               a.x + a.width > b.x && 
               a.y < b.y + b.height && 
               a.y + a.height > b.y;
    }

    // Initialize Firebase and start the game
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            playerId = user.uid;
            playerRef = firebase.database().ref(`players/${playerId}`);

            const name = getName();
            const color = randomFromArray(playerColors)

            // Determine the number of existing players
            const existingPlayers = Object.keys(players).length;

                // Assign a y position from the array based on the player's index
            const assignedY = playerYpositions[existingPlayers % playerYpositions.length];

            playerRef.set({
                id: playerId,
                name,
                color,
                x: 3,  // Fixed x position for all players
                y: assignedY, // Assign the calculated y position
                gameOver: false,
                ready: false,
                reversed: false
            });

            playerRef.onDisconnect().remove();

            //setupFlappyBirdGame(playerColor);

            // Initialize Firebase listeners
            initGame();

            // Set up the Flappy Bird game once Firebase data is loaded
            firebase.database().ref(`players`).once('value').then(snapshot => {
                players = snapshot.val() || {};
                if (players[playerId]) {
                    setupFlappyBirdGame(players[playerId].color);
                }
            });
        } else {
            // Handle user not signed in
            console.error("User not signed in");
        }
    });

    firebase.auth().signInAnonymously().catch((error) => {
        console.error("Authentication failed:", error.code, error.message);
    });
};