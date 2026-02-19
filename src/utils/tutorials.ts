import { TutorialStep } from '../components/TutorialScreen';
import { GameId } from '../types';

export const GAME_TUTORIALS: Record<GameId, TutorialStep[]> = {
  'tic-tac-toe': [
    {
      title: 'Welcome to Tic Tac Toe!',
      description: 'Classic X vs O game. Get three in a row to win!',
      icon: '❌⭕',
      tips: ['You are X, AI is O', 'Think ahead!'],
    },
    {
      title: 'How to Play',
      description: 'Tap any empty square to place your X. The AI will then place an O.',
      tips: ['Try to create two winning opportunities at once', 'Block the AI from getting three in a row'],
    },
    {
      title: 'Winning',
      description: 'Get three of your marks in a row (horizontal, vertical, or diagonal) to win!',
      tips: ['Corner and center positions are strongest', 'Watch for the AI\'s strategy'],
    },
  ],
  
  snake: [
    {
      title: 'Welcome to Snake!',
      description: 'Control the snake, eat apples, and grow longer without hitting walls or yourself!',
      icon: '🐍',
    },
    {
      title: 'Controls',
      description: 'Use arrow keys (web) or swipe (mobile) to change direction. The snake moves automatically.',
      tips: ['You cannot reverse direction', 'Plan your path ahead'],
    },
    {
      title: 'Gameplay',
      description: 'Eat red apples to grow and score points. Avoid hitting the walls or your own tail!',
      tips: ['Create space by spiraling', 'Stay near the edges early game', 'Watch your tail position'],
    },
  ],
  
  '2048': [
    {
      title: 'Welcome to 2048!',
      description: 'Slide tiles to combine matching numbers. Reach 2048 to win!',
      icon: '🔢',
    },
    {
      title: 'Controls',
      description: 'Swipe in any direction (or use arrow keys) to slide all tiles. Tiles with the same number merge.',
      tips: ['A new tile appears after each move', 'Keep your highest tile in a corner'],
    },
    {
      title: 'Strategy',
      description: 'Try to keep tiles organized and avoid filling the board completely.',
      tips: ['Focus on one corner', 'Build in a snake pattern', 'Don\'t swipe randomly!'],
    },
  ],
  
  minesweeper: [
    {
      title: 'Welcome to Minesweeper!',
      description: 'Clear the board without detonating any mines!',
      icon: '💣',
    },
    {
      title: 'How to Play',
      description: 'Tap a cell to reveal it. Numbers show how many mines are adjacent. Flag suspected mines with long press.',
      tips: ['Your first tap is always safe', 'Use numbers to deduce mine locations'],
    },
    {
      title: 'Advanced Tips',
      description: 'Look for patterns like 1-2-1 or corner numbers to deduce mine positions.',
      tips: ['Start with corners and edges', 'Use logic, not guessing', 'Flag all mines to win'],
    },
  ],
  
  'connect-four': [
    {
      title: 'Welcome to 4 in a Row!',
      description: 'Drop pieces to get four in a row before the AI does!',
      icon: '🔴🟡',
    },
    {
      title: 'How to Play',
      description: 'Tap a column to drop your red piece. The AI will place a yellow piece. Pieces stack from bottom up.',
      tips: ['You go first', 'Control the center column'],
    },
    {
      title: 'Strategy',
      description: 'Create multiple threats at once to force a win. Block the AI\'s winning moves!',
      tips: ['Set up forks (two ways to win)', 'Watch for vertical and diagonal lines', 'Control the center'],
    },
  ],
  
  tetris: [
    {
      title: 'Welcome to Tetris!',
      description: 'Rotate and place falling blocks to clear lines!',
      icon: '🧱',
    },
    {
      title: 'Controls',
      description: 'Left/Right arrows to move, Up to rotate, Down for soft drop, Enter/Space for hard drop.',
      tips: ['Pieces fall automatically', 'Cleared lines give points'],
    },
    {
      title: 'Strategy',
      description: 'Keep the board low and save space for the long I-piece to clear four lines at once (Tetris)!',
      tips: ['Leave a column open for I-pieces', 'Don\'t create gaps', 'Speed increases over time'],
    },
  ],
  
  maze: [
    {
      title: 'Welcome to Maze!',
      description: 'Navigate from the green start to the gold exit!',
      icon: '🔀',
    },
    {
      title: 'Controls',
      description: 'Use arrow keys or swipe to move through the maze one step at a time.',
      tips: ['Timer starts on first move', 'Solve it quickly for a better score!'],
    },
    {
      title: 'Strategy',
      description: 'Try the right-hand rule: keep your right hand on the wall and follow it!',
      tips: ['Dead ends are inevitable', 'Remember paths you\'ve tried', 'Smaller mazes are easier'],
    },
  ],
  
  solitaire: [
    {
      title: 'Welcome to Solitaire!',
      description: 'Move all cards to the foundation piles to win!',
      icon: '🃏',
    },
    {
      title: 'How to Play',
      description: 'Tap cards to select, then tap destination. Build foundations (A→K) by suit. Build tableau (K→A) in alternating colors.',
      tips: ['Drag cards for easier movement', 'Reveal face-down cards when possible'],
    },
    {
      title: 'Strategy',
      description: 'Prioritize revealing face-down cards and freeing up aces.',
      tips: ['Move cards to foundations early', 'Create empty columns for kings', 'Don\'t block lower cards'],
    },
  ],
  
  sudoku: [
    {
      title: 'Welcome to Sudoku!',
      description: 'Fill the 9×9 grid so each row, column, and 3×3 box contains 1-9!',
      icon: '🔢',
    },
    {
      title: 'How to Play',
      description: 'Tap a cell, then tap a number (1-9) to fill it. Conflicts are highlighted in red.',
      tips: ['Dark numbers are given', 'Light numbers are your entries'],
    },
    {
      title: 'Strategy',
      description: 'Start with cells that have only one possible number. Use logic, not guessing!',
      tips: ['Look for singles', 'Eliminate candidates', 'Focus on one region at a time'],
    },
  ],
  
  reversi: [
    {
      title: 'Welcome to Reversi!',
      description: 'Flip opponent pieces by trapping them between your pieces!',
      icon: '⚪',
    },
    {
      title: 'How to Play',
      description: 'Tap a valid square to place your black piece. All white pieces in straight lines get flipped to black.',
      tips: ['You play black, AI plays white', 'Valid moves show flip count'],
    },
    {
      title: 'Strategy',
      description: 'Corners are valuable! Avoid giving the AI corner access. Most pieces at the end wins.',
      tips: ['Control corners and edges', 'Avoid squares next to corners early', 'Limit AI\'s moves'],
    },
  ],
  
  checkers: [
    {
      title: 'Welcome to Checkers!',
      description: 'Jump opponent pieces and king your checkers to win!',
      icon: '⚫',
    },
    {
      title: 'How to Play',
      description: 'Tap your black piece, then tap destination. Jump over red pieces to capture them. Reach the opposite end to become a king!',
      tips: ['You play black, AI plays red', 'Captures are mandatory'],
    },
    {
      title: 'Strategy',
      description: 'Multi-jumps capture multiple pieces in one turn. Kings can move backwards!',
      tips: ['Protect your back row early', 'Force the AI into bad trades', 'Kings are powerful!'],
    },
  ],
  
  chess: [
    {
      title: 'Welcome to Chess!',
      description: 'Checkmate the opponent\'s king to win!',
      icon: '♟️',
    },
    {
      title: 'How to Play',
      description: 'Tap your white piece to see valid moves (highlighted), then tap destination. Each piece type moves differently.',
      tips: ['You play white, AI plays black', 'Check means king is threatened'],
    },
    {
      title: 'Piece Movement',
      description: 'Pawns move forward, Knights jump in L-shape, Bishops move diagonally, Rooks move straight, Queens move anywhere, Kings move one square.',
      tips: ['Castling: King moves 2 squares toward rook', 'En passant: Special pawn capture', 'Pawns promote on last rank'],
    },
    {
      title: 'Strategy',
      description: 'Control the center, develop pieces early, castle your king to safety, and look for tactical opportunities!',
      tips: ['Protect your king', 'Don\'t move the same piece twice in opening', 'Think before you move!'],
    },
  ],
  
  blackjack: [
    {
      title: 'Welcome to Blackjack!',
      description: 'Beat the dealer by getting as close to 21 as possible without going over!',
      icon: '🃏',
    },
    {
      title: 'How to Play',
      description: 'Place your bet, receive 2 cards. Hit to take another card, Stand to end your turn. Try to beat the dealer\'s hand!',
      tips: ['Face cards are worth 10', 'Aces can be 1 or 11', 'Dealer must hit on 16 or less'],
    },
    {
      title: 'Special Rules',
      description: 'Blackjack (21 with 2 cards) pays 3:2! Also, if you manage to have 5 cards without busting, you win automatically (5 Card Trick)!',
      tips: ['5 Card Trick pays 2:1', 'Blackjack is the strongest hand'],
    },
    {
      title: 'Actions',
      description: 'Hit: Take another card. Stand: Keep your hand. Double: Double your bet and take exactly one more card.',
      tips: ['Can only double on first 2 cards', 'Think before you double!'],
    },
    {
      title: 'Strategy',
      description: 'Stand on 17+, hit on 11 or less. Watch the dealer\'s face-up card to decide your move.',
      tips: ['Difficulty affects deck count', 'Hard mode: dealer hits soft 17', 'High score is your highest bankroll!'],
    },
  ],

  poker: [
    {
      title: 'Welcome to 5-Card Draw Poker!',
      description: 'Play poker against AI opponents. Best hand wins the pot!',
      icon: '🎰',
      tips: ['Start with 100 chips', 'Blinds: 5/10', 'Difficulty controls number of opponents'],
    },
    {
      title: 'Hand Rankings',
      description: 'From highest to lowest: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Pair, High Card.',
      tips: ['Learn these rankings!', 'Royal Flush is unbeatable', 'High Card is the weakest hand'],
    },
    {
      title: 'Game Flow',
      description: 'Two betting rounds: before and after drawing cards. Between rounds, select cards to discard (tap cards) and draw new ones.',
      tips: ['Fold to quit the hand', 'Call to match the bet', 'Raise to increase the bet'],
    },
    {
      title: 'Strategy',
      description: 'Fold weak hands early. Keep pairs and better. Discard cards that don\'t help your hand.',
      tips: ['Position matters - later position is better', 'AI difficulty affects their strategy', 'Track your opponents\' patterns'],
    },
  ],

  hearts: [
    {
      title: 'Welcome to Hearts!',
      description: 'Avoid taking hearts and the Queen of Spades! Lowest score wins.',
      icon: '♥️',
      tips: ['Play against 3 AI opponents', 'Hearts = 1 point each', 'Queen of Spades = 13 points'],
    },
    {
      title: 'Game Flow',
      description: 'Each round: Pass 3 cards (left/right/across/none rotation), then play 13 tricks. You must follow suit if possible.',
      tips: ['2 of Clubs always leads first trick', 'Can\'t lead hearts until broken', 'Hearts broken when someone plays a heart'],
    },
    {
      title: 'Trick Rules',
      description: 'You must follow the lead suit if you have it. Highest card of lead suit wins the trick. Winner leads next trick.',
      tips: ['Can\'t play hearts or Queen of Spades on first trick', 'Try to avoid winning tricks with points', 'High cards can be dangerous!'],
    },
    {
      title: 'Strategy & Shooting the Moon',
      description: 'Goal: Avoid points! But if you take ALL 26 points (all hearts + Queen), you get 0 and others get 26 each!',
      tips: ['Pass high cards and Queen of Spades', 'Watch what others play', 'Game ends at 100 points - lowest wins!'],
    },
  ],

  'water-sort': [
    {
      title: 'Welcome to Water Sort!',
      description: 'Sort the colored water until each tube contains only one color!',
      icon: '🧪',
    },
    {
      title: 'How to Play',
      description: 'Tap a tube to select it, then tap another tube to pour. You can only pour into an empty tube or onto the same color.',
      tips: ['Tubes have a limit of 4 layers', 'Use empty tubes strategically'],
    },
    {
      title: 'Winning',
      description: 'The game is won when all colors are sorted into their own tubes.',
      tips: ['Plan several moves ahead', 'Don\'t get stuck! Use Undo if needed'],
    },
  ],

  'word-search': [
    {
      title: 'Welcome to Word Search!',
      description: 'Find all the hidden words in the grid of letters!',
      icon: '🔍',
    },
    {
      title: 'Controls',
      description: 'Swipe across letters to select a word. Words can be horizontal, vertical, or diagonal.',
      tips: ['Look for the first letter of a word', 'Check all directions'],
    },
    {
      title: 'Difficulty',
      description: 'Higher difficulties have larger grids, more words, and reversed word directions.',
      tips: ['Focus on one word at a time', 'Found words are crossed off'],
    },
  ],

  'brick-breaker': [
    {
      title: 'Welcome to Brick Breaker!',
      description: 'Destroy all the bricks using the ball and paddle!',
      icon: '🎾',
    },
    {
      title: 'Controls',
      description: 'Drag your finger across the screen to move the paddle. Keep the ball in play!',
      tips: ['The ball bounces faster over time', 'Hit the side of the paddle to change ball angle'],
    },
    {
      title: 'Objective',
      description: 'Break every brick on the screen to win. If the ball falls past your paddle, you lose a life!',
      tips: ['Aim for the corners', 'Clear the top rows first for easier bounces'],
    },
  ],

  'mahjong': [
    {
      title: 'Welcome to Mahjong!',
      description: 'Match pairs of identical tiles to clear the board!',
      icon: '🀄',
    },
    {
      title: 'How to Play',
      description: 'Tap two matching tiles to remove them. You can only pick "free" tiles (those with no tile on top and at least one side open).',
      tips: ['Plan your moves to free up blocked tiles', 'Focus on matching tiles that free up the most other tiles'],
    },
  ],

  'hangman': [
    {
      title: 'Welcome to Hangman!',
      description: 'Guess the hidden word letter by letter!',
      icon: '😵',
    },
    {
      title: 'How to Play',
      description: 'Tap letters on the keyboard. Correct letters fill the blanks. Wrong letters draw parts of the hangman.',
      tips: ['Start with common vowels (A, E, I, O, U)', 'Look for common word patterns'],
    },
  ],

  'simon-says': [
    {
      title: 'Welcome to Simon Says!',
      description: 'Test your memory by repeating the sequence of colors!',
      icon: '🔴',
    },
    {
      title: 'How to Play',
      description: 'Watch the sequence of flashing colors, then tap the pads in the exact same order.',
      tips: ['Say the colors out loud to help remember', 'The sequence grows by one color each turn'],
    },
  ],

  'memory-match': [
    {
      title: 'Welcome to Memory!',
      description: 'Find and match all the pairs of cards!',
      icon: '🧠',
    },
    {
      title: 'How to Play',
      description: 'Tap two cards to flip them over. If they match, they stay up. If not, they flip back.',
      tips: ['Pay close attention to where cards are located', 'Try to clear one section at a time'],
    },
    {
      title: 'Progression',
      description: 'Levels get harder with more cards and faster required matching!',
      tips: ['Move quickly to beat the clock', 'Focus on your best patterns'],
    },
  ],

  'word-guess': [
    {
      title: 'Welcome to Word Guess!',
      description: 'Find the secret 5-letter word in 6 tries!',
      icon: '🅰️',
    },
    {
      title: 'Color Clues',
      description: 'GREEN means the letter is correct and in the right spot. YELLOW means the letter is in the word but in the wrong spot. GREY means it is not in the word.',
      tips: ['Start with words that have many vowels', 'Avoid reusing GREY letters'],
    },
  ],

  'spider-solitaire': [
    {
      title: 'Welcome to Spider!',
      description: 'Clear the board by creating descending runs of cards from King to Ace!',
      icon: '🕷️',
    },
    {
      title: 'How to Play',
      description: 'Move cards into descending order (K, Q, J, 10...). You can move stacks if they are the same suit and in sequence.',
      tips: ['Prioritize uncovering face-down cards', 'Empty columns are very powerful - use them to reorganize stacks'],
    },
    {
      title: 'Winning',
      description: 'Complete a full suit (King to Ace) to remove it from the board. Remove all 8 suits to win!',
      tips: ['Plan several moves ahead', 'Don\'t deal new cards until you have no other moves left'],
    },
  ],

  battleship: [
    {
      title: 'Welcome to Sea Battle!',
      description: 'Sink the enemy fleet before they sink yours! Strategy and deduction are key.',
      icon: '🚢',
    },
    {
      title: 'Placement Phase',
      description: 'Drag and drop your ships onto your grid. You can rotate them to fit your strategy.',
      tips: ['Spread your ships out', 'Avoid predictable patterns', 'Try overlapping or grouping for deception'],
    },
    {
      title: 'Combat Phase',
      description: 'Tap on the enemy grid to fire a strike. HIT will show in red, MISS in white.',
      tips: ['If you hit, target adjacent squares to find the rest of the ship', 'Follow a checkerboard search pattern', 'Keep track of which ships you have sunk'],
    },
  ],

  spades: [
    {
      title: 'Welcome to Spades!',
      description: 'A classic partner-based trick-taking game. Spades are always trump!',
      icon: '♠️',
    },
    {
      title: 'Bidding',
      description: 'At the start of each round, bid the number of tricks you and your partner think you can win.',
      tips: ['A bid of "0" is called Nil and carries a high reward/penalty', 'Be realistic with your bids', 'Total team bid is what matters'],
    },
    {
      title: 'Gameplay',
      description: 'Follow suit if you can. If not, you can play a Spade (trump) or any other card.',
      tips: ['You cannot lead Spades until they have been "broken"', 'High cards win tricks, but Spades trump everything', 'Winning too many extra tricks leads to "bags"'],
    },
  ],

  'code-breaker': [
    {
      title: 'Welcome to Code Breaker!',
      description: 'Deduce the hidden sequence of 4 colors in 10 tries or less.',
      icon: '🕵️',
    },
    {
      title: 'How to Play',
      description: 'Select colors to fill the current row, then tap "CHECK" to get feedback.',
      tips: ['BLACK PEG: Correct color in the correct spot', 'WHITE PEG: Correct color but in the wrong spot', 'Position of feedback pegs does not correspond to code positions'],
    },
    {
      title: 'Strategy',
      description: 'Use the process of elimination to narrow down the possible combinations.',
      tips: ['Start with diverse colors to rule things out', 'Look at your history to spot patterns', 'Think logically about each peg'],
    },
  ],

  freecell: [
    {
      title: 'Welcome to FreeCell!',
      description: 'Unlike other solitaire games, almost every deal is solvable!',
      icon: '🃏',
    },
    {
      title: 'How to Play',
      description: 'Use the 4 "free cells" at the top left as temporary storage. Move all cards to the 4 foundation piles (top right).',
      tips: ['Move Aces to foundations immediately', 'Keep as many free cells empty as possible', 'You can move stacks of cards if you have enough empty cells'],
    },
  ],

  dominoes: [
    {
      title: 'Welcome to Dominoes!',
      description: 'Match the numbers on the ends of the chain to play your tiles.',
      icon: '🂓',
    },
    {
      title: 'How to Play',
      description: 'Drag a tile from your hand to a matching end of the board. If you cannot move, you must draw from the stock.',
      tips: ['Try to play your highest-value tiles first', 'Pay attention to what your opponent is playing', 'Block your opponent by controlling the ends'],
    },
  ],

  backgammon: [
    {
      title: 'Welcome to Backgammon!',
      description: 'A classic race game of strategy and luck.',
      icon: '🎲',
    },
    {
      title: 'Goal',
      description: 'Move all your checkers to your home board and then "bear them off" the board.',
      tips: ['Roll dice to move', 'Hitting an opponent\'s lone checker (blot) sends it to the bar', 'Don\'t leave single checkers exposed'],
    },
  ],
};
