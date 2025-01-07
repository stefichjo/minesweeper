import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  Button,
  ButtonGroup,
  Paper,
  Grid,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Flag as FlagIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const GAME_SIZES = {
  mini: { size: 6, mines: 6, time: 60 },
  small: { size: 8, mines: 10, time: 120 },
  medium: { size: 12, mines: 20, time: 240 },
  large: { size: 16, mines: 40, time: 480 }
};

function App() {
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [mineCount, setMineCount] = useState(GAME_SIZES.small.mines);
  const [flagCount, setFlagCount] = useState(0);
  const [boardSize, setBoardSize] = useState(GAME_SIZES.small.size);
  const [currentSize, setCurrentSize] = useState('small');
  const [timeLeft, setTimeLeft] = useState(GAME_SIZES.small.time);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    initializeBoard();
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSizeChange = (size) => {
    setCurrentSize(size);
    setBoardSize(GAME_SIZES[size].size);
    setMineCount(GAME_SIZES[size].mines);
    setTimeLeft(GAME_SIZES[size].time);
    setGameOver(false);
    setGameWon(false);
    setFlagCount(0);
    setTimerActive(false);
    
    // We need to wait for the state updates before initializing the board
    setTimeout(() => {
      initializeBoard(GAME_SIZES[size].size, GAME_SIZES[size].mines);
    }, 0);
  };

  const initializeBoard = (size = boardSize, mines = mineCount) => {
    const newBoard = Array(size).fill().map(() =>
      Array(size).fill().map(() => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborCount: 0
      }))
    );

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);
      if (!newBoard[x][y].isMine) {
        newBoard[x][y].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor counts
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (!newBoard[i][j].isMine) {
          let count = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < size && nj >= 0 && nj < size && newBoard[ni][nj].isMine) {
                count++;
              }
            }
          }
          newBoard[i][j].neighborCount = count;
        }
      }
    }

    setBoard(newBoard);
  };

  const handleCellClick = (row, col) => {
    if (gameOver || gameWon || board[row][col].isFlagged) return;

    // Start timer on first click
    if (!timerActive) {
      setTimerActive(true);
    }

    const newBoard = [...board];
    if (newBoard[row][col].isMine) {
      revealAllMines();
      setGameOver(true);
      setTimerActive(false);
      return;
    }

    revealCell(newBoard, row, col);
    checkWinCondition(newBoard);
    setBoard(newBoard);
  };

  const handleRightClick = (e, row, col) => {
    e.preventDefault();
    if (gameOver || gameWon || board[row][col].isRevealed) return;

    const newBoard = [...board];
    const newFlagState = !newBoard[row][col].isFlagged;
    newBoard[row][col].isFlagged = newFlagState;
    setBoard(newBoard);
    setFlagCount(prevCount => newFlagState ? prevCount + 1 : prevCount - 1);
  };

  const revealCell = (board, row, col) => {
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize || 
        board[row][col].isRevealed || board[row][col].isFlagged) {
      return;
    }

    board[row][col].isRevealed = true;

    if (board[row][col].neighborCount === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          revealCell(board, row + i, col + j);
        }
      }
    }
  };

  const revealAllMines = () => {
    const newBoard = board.map(row =>
      row.map(cell => ({
        ...cell,
        isRevealed: cell.isMine ? true : cell.isRevealed
      }))
    );
    setBoard(newBoard);
  };

  const checkWinCondition = (board) => {
    // Count unrevealed cells and unflagged mines
    let unrevealedCount = 0;
    let unrevealedNonMines = 0;
    let lastUnrevealedPosition = null;

    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        if (!board[i][j].isRevealed) {
          unrevealedCount++;
          lastUnrevealedPosition = { i, j };
          if (!board[i][j].isMine) {
            unrevealedNonMines++;
          }
        }
      }
    }

    // If only mines are left unrevealed, auto-flag them
    if (unrevealedCount > 0 && unrevealedNonMines === 0) {
      const newBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          isFlagged: !cell.isRevealed && cell.isMine ? true : cell.isFlagged
        }))
      );
      setBoard(newBoard);
      setFlagCount(mineCount);
      setGameWon(true);
      return;
    }

    // If only one unrevealed cell remains and it's a mine, flag it
    if (unrevealedCount === 1 && lastUnrevealedPosition && board[lastUnrevealedPosition.i][lastUnrevealedPosition.j].isMine) {
      const newBoard = [...board];
      const cell = newBoard[lastUnrevealedPosition.i][lastUnrevealedPosition.j];
      if (!cell.isFlagged) {
        cell.isFlagged = true;
        setBoard(newBoard);
        setFlagCount(prevCount => prevCount + 1);
        setGameWon(true);
      }
      return;
    }

    // Check win condition
    const won = board.every(row =>
      row.every(cell =>
        (cell.isMine && !cell.isRevealed) || (!cell.isMine && cell.isRevealed)
      )
    );
    
    if (won) {
      // Flag all remaining mines when won
      const newBoard = board.map(row =>
        row.map(cell => ({
          ...cell,
          isFlagged: cell.isMine ? true : cell.isFlagged
        }))
      );
      setBoard(newBoard);
      setGameWon(true);
      setFlagCount(mineCount);
    }
  };

  const resetGame = () => {
    setGameOver(false);
    setGameWon(false);
    setFlagCount(0);
    setTimeLeft(GAME_SIZES[currentSize].time);
    setTimerActive(false);
    initializeBoard();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4
      }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              align="center"
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold',
                mb: 4
              }}
            >
              Minesweeper
            </Typography>

            <Box sx={{ mb: 4 }}>
              <ButtonGroup 
                variant="contained" 
                color="primary" 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  '& .MuiButton-root': {
                    px: 3,
                    py: 1.5
                  }
                }}
              >
                <Button 
                  variant={currentSize === 'mini' ? 'contained' : 'outlined'}
                  onClick={() => handleSizeChange('mini')}
                >
                  Mini
                </Button>
                <Button 
                  variant={currentSize === 'small' ? 'contained' : 'outlined'}
                  onClick={() => handleSizeChange('small')}
                >
                  Small
                </Button>
                <Button 
                  variant={currentSize === 'medium' ? 'contained' : 'outlined'}
                  onClick={() => handleSizeChange('medium')}
                >
                  Medium
                </Button>
                <Button 
                  variant={currentSize === 'large' ? 'contained' : 'outlined'}
                  onClick={() => handleSizeChange('large')}
                >
                  Large
                </Button>
              </ButtonGroup>
            </Box>

            <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              <Grid item>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <FlagIcon color="error" />
                  <Typography variant="h6">
                    {mineCount - flagCount}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    bgcolor: 'background.default'
                  }}
                >
                  <TimerIcon color="primary" />
                  <Typography variant="h6">
                    {formatTime(timeLeft)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item>
                <IconButton 
                  onClick={resetGame}
                  sx={{ 
                    p: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Grid>
            </Grid>

            {(gameOver || gameWon || timeLeft === 0) && (
              <Alert 
                severity={gameWon ? "success" : "error"} 
                variant="filled"
                sx={{ 
                  mb: 3,
                  '& .MuiAlert-message': {
                    fontSize: '1.1rem'
                  }
                }}
              >
                {gameWon ? "You Won!" : timeLeft === 0 ? "Time's Up!" : "Game Over!"}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3,
                  bgcolor: 'background.default'
                }}
              >
                <div className="board">
                  {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="row">
                      {row.map((cell, colIndex) => (
                        <Button
                          key={`${rowIndex}-${colIndex}`}
                          variant="contained"
                          className={`cell ${cell.isRevealed ? 'revealed' : ''} ${cell.isFlagged ? 'flagged' : ''}`}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onContextMenu={(e) => handleRightClick(e, rowIndex, colIndex)}
                          sx={{
                            minWidth: 'unset',
                            width: 40,
                            height: 40,
                            p: 0,
                            m: 0.25,
                            bgcolor: cell.isRevealed ? 'background.paper' : 'grey.300',
                            color: 'text.primary',
                            '&:hover': {
                              bgcolor: cell.isRevealed ? 'background.paper' : 'grey.400',
                            },
                            '&.revealed': {
                              boxShadow: 'none',
                              cursor: 'default',
                            }
                          }}
                        >
                          {cell.isRevealed && !cell.isMine && cell.neighborCount > 0 && (
                            <Typography 
                              className={`number-${cell.neighborCount}`}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {cell.neighborCount}
                            </Typography>
                          )}
                          {cell.isRevealed && cell.isMine && '💣'}
                          {cell.isFlagged && !cell.isRevealed && <FlagIcon fontSize="small" color="error" />}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </Paper>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
