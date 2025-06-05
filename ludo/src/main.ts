import './style.css'
import { Transform } from './transform';
import { Input } from './input';
import { Piece, Player, TurnStage } from './player';
import { Board } from './board';

// Define interfaces for game state
export interface PieceState {
  id: number;
  cellId: number;
  jailed: boolean;
  isHome: boolean;
  pos: number; // position in its path
}

export interface PlayerState {
  color: string;
  playing: boolean;
  pieces: PieceState[];
  diceRolled: boolean;
  diceNumber: number; // The actual face value, 1-6
  turnStage: TurnStage;
  hasWon: boolean;
}

export interface LudoGameState {
  players: { [color: string]: PlayerState }; // Using a map for easy lookup by color
  currentPlayerColor: string;
  gameOver: boolean;
  winnerColor: string | null;
}

class Background{
    ctx: CanvasRenderingContext2D;
    sprite: HTMLImageElement;
    transform: Transform;

    constructor(ctx: CanvasRenderingContext2D, imagePath: string, height: number, width: number){
        this.transform = new Transform(0, 0, 1, height, width);
        this.ctx = ctx;
        this.sprite = document.createElement('img');
        this.sprite.src = imagePath;
    }

    render(){
        this.ctx.drawImage(this.sprite, this.transform.x, this.transform.y, this.transform.w, this.transform.h);
    }
}


class LudoGame{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: Input;
    windowHeight: number;
    windowWidth: number;
    background: Background;
    player1: Player;
    player2: Player;
    player3: Player;
    player4: Player;
    
    currPlayer: Player;
    board: Board;
    gameOver: boolean = false;
    winner: Player | null = null;

    constructor(){
        this.windowWidth = 0.9 * Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        this.windowHeight = 0.9 * Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'main-canvas';
        if(this.windowHeight < this.windowWidth){
            this.canvas.height =  this.windowHeight;
            this.canvas.width = this.windowHeight;
        }else{
            this.canvas.height = this.windowWidth;
            this.canvas.width = this.windowWidth; 
        }

        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d')
        this.background = new Background(this.ctx, 'ludo_bg.png', this.canvas.height, this.canvas.width);

        // Create and append Save Game button
        const saveButton = document.createElement('button');
        saveButton.id = 'saveGameBtn';
        saveButton.textContent = 'Save Game';
        saveButton.style.padding = '10px';
        saveButton.style.margin = '5px';
        document.body.appendChild(saveButton);

        saveButton.addEventListener('click', () => {
            this.saveGameState();
            alert('Game Saved!');
        });

        // Create and append Load Game button
        const loadButton = document.createElement('button');
        loadButton.id = 'loadGameBtn';
        loadButton.textContent = 'Load Game';
        loadButton.style.padding = '10px';
        loadButton.style.margin = '5px';
        document.body.appendChild(loadButton);

        loadButton.addEventListener('click', () => {
            if (this.loadGameState()) {
                alert('Game Loaded!');
                // The game state is now loaded. The existing render loop in startGameLoop
                // will pick up the changes and redraw the board on the next frame.
            } else {
                alert('No saved game found or failed to load.');
            }
        });

        
        this.input = new Input(this.canvas, this.ctx);

        this.board = new Board(this.ctx, this.canvas.height, this.canvas.width);

        this.player1 = new Player(this.ctx, this.canvas.height, this.canvas.width, true, true, this.input, this.board, "red");
        this.player2 = new Player(this.ctx, this.canvas.height, this.canvas.width, true, false, this.input, this.board, "blue");
        this.player3 = new Player(this.ctx, this.canvas.height, this.canvas.width, false, false, this.input, this.board, "yellow");
        this.player4 = new Player(this.ctx, this.canvas.height, this.canvas.width, false, true, this.input, this.board, "green");

        this.player1.nextPlayer = this.player2;
        this.player2.nextPlayer = this.player3;
        this.player3.nextPlayer = this.player4;
        this.player4.nextPlayer = this.player1;

        this.currPlayer = this.player1;
        this.currPlayer.playing = true;

        for(let i=0; i<4; i++){
            this.board.jail(this.player1.pieces[i], this.player1.color);
            this.board.jail(this.player2.pieces[i], this.player2.color);
            this.board.jail(this.player3.pieces[i], this.player3.color);
            this.board.jail(this.player4.pieces[i], this.player4.color);
        }

        // Attempt to load game state. If it fails, the game starts fresh.
        // Initial jailing above ensures pieces are in a known state if no save is loaded.
        if (!this.loadGameState()) {
            console.log("Starting a new game as no saved state was loaded or load failed.");
            // Any additional new game setup that loadGameState might have superseded can go here.
            // For now, the initial jailing is the main setup.
        }

        this.startGameLoop();
    }

    startGameLoop(){
        let prevTime = 0;
        let animate = (timestamp: number) => {
            let dt = timestamp - prevTime; 

            if(dt > 20 || prevTime == 0){
                this.render(dt);
                this.update(20);
                prevTime = timestamp;
            }
            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);

    }

    render(dt: number){
        this.background.render();
        this.player1.render();
        this.player2.render();
        this.player3.render();
        this.player4.render();
        this.input.render();
        this.board.render(dt);

        if (this.gameOver && this.winner) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black overlay
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = "white"; // Text color
            this.ctx.font = "40px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`${this.winner.color} has won!`, this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    update(dt: number){
        if (this.gameOver) {
            return;
        }

        this.player1.update(dt);
        this.player2.update(dt);
        this.player3.update(dt);
        this.player4.update(dt);

        for (const player of [this.player1, this.player2, this.player3, this.player4]) {
            if (player.hasWon) {
                this.gameOver = true;
                this.winner = player;
                this.saveGameState(); // Save game state when a player wins
                break;
            }
        }

        if (!this.gameOver) {
            if(!this.player1.playing && !this.player2.playing && !this.player3.playing && !this.player4.playing){
                this.currPlayer = this.currPlayer.nextPlayer;
                this.currPlayer.playing = true;
                this.saveGameState(); // Save game state when turn changes
            }
        }
    }

    saveGameState(): void {
        const playersState: { [color: string]: PlayerState } = {};
        const playersList = [this.player1, this.player2, this.player3, this.player4];

        for (const player of playersList) {
            const piecesState: PieceState[] = player.pieces.map(piece => ({
                id: piece.id,
                cellId: piece.cellId,
                jailed: piece.jailed,
                isHome: piece.isHome,
                pos: piece.pos,
            }));

            playersState[player.color] = {
                color: player.color,
                playing: player.playing,
                pieces: piecesState,
                diceRolled: player._dice.rolled,
                diceNumber: player._dice.rnumber + 1, // rnumber is 0-indexed
                turnStage: player.stage, // Assuming 'stage' corresponds to TurnStage
                hasWon: player.hasWon,
            };
        }

        const gameState: LudoGameState = {
            players: playersState,
            currentPlayerColor: this.currPlayer.color,
            gameOver: this.gameOver,
            winnerColor: this.winner ? this.winner.color : null,
        };

        try {
            localStorage.setItem('ludoGameState', JSON.stringify(gameState));
            console.log('Game state saved successfully.');
        } catch (error) {
            console.error('Error saving game state to localStorage:', error);
        }
    }

    private getPlayerByColor(color: string): Player | null {
        if (this.player1.color === color) return this.player1;
        if (this.player2.color === color) return this.player2;
        if (this.player3.color === color) return this.player3;
        if (this.player4.color === color) return this.player4;
        return null;
    }

    loadGameState(): boolean {
        const savedStateJSON = localStorage.getItem('ludoGameState');
        if (!savedStateJSON) {
            console.log('No saved game state found.');
            return false;
        }

        let loadedState: LudoGameState;
        try {
            loadedState = JSON.parse(savedStateJSON);
        } catch (error) {
            console.error('Error parsing saved game state:', error);
            return false;
        }

        // 2. Restore Game State
        this.gameOver = loadedState.gameOver;
        this.winner = loadedState.winnerColor ? this.getPlayerByColor(loadedState.winnerColor) : null;

        const playersList = [this.player1, this.player2, this.player3, this.player4];

        // Clear board's logical piece tracking before re-populating
        for (const cell of this.board.path.values()) {
            cell.pieces = [];
        }
        // Also clear jail cells if they directly hold piece objects or IDs not covered by board.path
        // Assuming board.jailCells might need clearing or re-initialization.
        // The current board.jail() method assigns pieces to jail cells.
        // Let's ensure jail cells on the board are also cleared of old piece references.
        // The `Board` class has `jailCells: Map<string, Cell[]>;`
        // Each `Cell` in `jailCells` also has a `pieces` array.
        for (const color of ["red", "green", "yellow", "blue"]) {
            const JCells = this.board.jailCells.get(color);
            if (JCells) {
                for (const cell of JCells) {
                    cell.pieces = [];
                }
            }
        }


        for (const playerState of Object.values(loadedState.players)) {
            const gamePlayer = this.getPlayerByColor(playerState.color);
            if (gamePlayer) {
                gamePlayer.playing = playerState.playing;
                gamePlayer._dice.rolled = playerState.diceRolled;
                gamePlayer._dice.rnumber = playerState.diceNumber - 1; // Adjust back to 0-indexed
                gamePlayer.stage = playerState.turnStage;
                gamePlayer.hasWon = playerState.hasWon;

                for (const pieceState of playerState.pieces) {
                    const gamePiece = gamePlayer.pieces.find(p => p.id === pieceState.id);
                    if (gamePiece) {
                        gamePiece.cellId = pieceState.cellId;
                        gamePiece.jailed = pieceState.jailed;
                        gamePiece.isHome = pieceState.isHome;
                        gamePiece.pos = pieceState.pos;

                        // Visual and board cell updates will be done in a second pass
                    }
                }
            }
        }

        // Second pass for visual updates and board cell population
        for (const player of playersList) {
            for (const piece of player.pieces) {
                if (piece.jailed) {
                    // board.jail moves the piece to a jail cell and updates its transform and cellId
                    this.board.jail(piece, piece.color);
                } else {
                    const cell = this.board.path.get(piece.cellId);
                    if (cell) {
                        piece.transform.x = cell.transform.x;
                        piece.transform.y = cell.transform.y;
                        piece.targetTransform.x = cell.transform.x;
                        piece.targetTransform.y = cell.transform.y;
                        cell.putPiece(piece); // Add piece to cell's logical tracking
                    } else {
                        console.warn(`Cell with id ${piece.cellId} not found for piece ${piece.id}`);
                        // Potentially place it in a default/error location or re-jail it
                        // For now, if cellId is invalid, it might float if not jailed.
                        // If it was supposed to be home, its cellId should be a home cell ID.
                    }
                }
            }
        }

        // 3. Restore Current Player
        const currentLoadedPlayer = this.getPlayerByColor(loadedState.currentPlayerColor);
        if (currentLoadedPlayer) {
            this.currPlayer = currentLoadedPlayer;
            // Ensure `playing` status is correctly set for all players based on current player
            for (const p of playersList) {
                p.playing = (p === this.currPlayer && !this.gameOver);
            }
        } else {
            console.error("Could not find current player from loaded state.");
            // Fallback or error handling: maybe set player1 as current?
            this.currPlayer = this.player1; // Or handle as an error state
            for (const p of playersList) { // ensure others are not playing
                p.playing = (p === this.currPlayer && !this.gameOver);
            }
        }


        console.log('Game state loaded successfully.');
        return true;
    }
}


new LudoGame();
