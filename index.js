const colors = require('colors');
const log = require('log-update');
const keypress = require('keypress');
const shopItems = require('./shopItems');
const UPDATE_RATE_MS = 10;
const [DEBUG_MODE, WRITE_MODE, BUY_MODE, ABOUT_MODE, MAIN_MODE] = [{}, { charSize: 0.05, text: '' },
 {}, {}, {}];
const rates = { 'bugtick/size': 0.001, 'cash/bug': 2, 'code/monkey': 0.01,
 'debug/intern': 0.01, 'time/tick': 0.006 };
const state = { cash: 0, bugs: 0, size: 1.0, sizeUnit: 'kb',
 mode: MAIN_MODE, shopIndex: 0, commands: '', display: '',
 owned: [], day: 1, dayMax: 30, time: 0, timeMax: 20, bugMax: 500, bugWarning: 400,
 started: false, ended: false, loss: false, currentBug: 1 };

function getItemCost(itemIndex) {
  return shopItems[itemIndex].cost * (1 + state.owned[itemIndex]);
}

function generateBugUI() {
  return '[1] [2] [3] [4] [5] [6] [7] [8] [9] [0]'
    .replace(new RegExp(state.currentBug), `${`${state.currentBug}`.underline.green}`);
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function render() {
  // Reset the console
  console.log('\x1B[2J');

  // Find per second rates for stats
  const cashRate = rates['cash/bug'] * state.owned[0] *
    rates['debug/intern'] * (1000 / UPDATE_RATE_MS);
  const bugRate = rates['bugtick/size'] * state.size * (1000 / UPDATE_RATE_MS);
  const codeRate = rates['code/monkey'] * state.owned[1] * (1000 / UPDATE_RATE_MS);
  const cashStat = `(+${cashRate.toFixed(2)}/s)`.green;
  const bugStat = `(+${bugRate.toFixed(2)}/s)`.green;
  const codeStat = `(+${codeRate.toFixed(2)}/s)`.green;

  // Strings that require some computation
  const timeBar = '▓'.yellow.repeat(Math.floor(state.time)) +
   '-'.gray.repeat(state.timeMax - Math.floor(state.time));
  const bugCount = (state.bugs >= state.bugWarning) ?
    colors.red.bold(`${Math.floor(state.bugs)}`) : Math.floor(state.bugs);

  if (state.ended) {
    if (state.loss) {
      log(`You were fired. A shame. Well, at least you made $${Math.floor(state.cash)}` +
      ' before getting canned. \n\n\n' +
      'Press [ESC] to quit. Thanks for playing!'.underline);
    } else {
      log(`You made it! You left HipsterTech with a grand total of $${Math.floor(state.cash)}! ` +
        `You only needed to hire a total of ${state.owned[1]} monkeys and ${state.owned[0]}` +
        ` interns to boot. Or was it the other way around? Who cares, you're free!\n\n\n` +
        'Press [ESC] to quit. Thanks for playing!'.underline);
    }
  } else if (state.started) {
    log(`DAY ${state.day} of ${state.dayMax} ~ [${timeBar}] \n\n` +
    `=== Cash: ${Math.floor(state.cash)}\$ ${cashStat}   ` +
    `Bugs: ${bugCount} ${bugStat}   ` +
    `Codebase: ${state.size.toFixed(2) + state.sizeUnit} ${codeStat} ===` +
    ` \n\n${state.commands}\n\n${state.display}`);
  } else {
    log('==== Debug-RPG v1.0 ===='.underline + '\n- Created By: NigelMNZ -\n\n'.gray +
      'In this incremental game, you are the lead developer for a tiny and new startup,' +
      ' HipsterTech. You hate it. Officially, while your job is to write code, ' +
      'you only get paid when you debug something. You are paid 2$ per bug solved. ' +
      'Further, the codebase is absolutely terrible. It\'s constantly generating bugs,' +
      ' and the larger it becomes, the more bugs it generates. The CEO is also ' +
      'constantly watching. If you ever have more than 500 unsolved bugs, you will ' +
      'be fired immediately. \n\n' +
      'Eventually, you decide you\'ve had enough, so you tell Carol in HR that you are ' +
      'quitting in 30 days. You want to make as much cash as possible before leaving, ' +
      'but you aren\'t motivated to do much for HipsterTech. Maybe you can outsource?\n\n' +
      'Make money. Don\'t get fired. You have 30 days. Press [ENTER] to start.'.underline);
  }
}

function incrementalTick() {
  // Interns
  if (Math.floor(state.bugs) >= 1) {
    let maxSolved = state.owned[0] * rates['debug/intern'];
    if (maxSolved > state.bugs) maxSolved = state.bugs;
    state.cash += rates['cash/bug'] * maxSolved;
    state.bugs -= maxSolved;
  }

  // Monkeys
  state.size += state.owned[1] * rates['code/monkey'];

  // Bugs
  state.bugs += rates['bugtick/size'] * state.size;
  if (state.bugs > state.bugMax) state.loss = true;

  // Time
  state.time += rates['time/tick'];
  if (state.time > state.timeMax) {
    state.time = 0;
    state.day++;
  }

  if (state.day > state.dayMax || state.loss) state.ended = true;
}

function logic() {
  // Handle increments
  if (state.started && !state.ended) incrementalTick();

  if (state.mode === MAIN_MODE) {
    state.commands = 'Commands: [D]ebug code, [W]rite code, [B]uy stuff, [A]bout, [ESC] to go back';
    state.display = '[AWAITING INPUT...]';
  } else if (state.mode === DEBUG_MODE) {
    state.commands = 'Commands: Type the correct number to debug. [ESC] to go back.';
    if (state.bugs >= 1) {
      state.display = generateBugUI();
    } else {
      state.display = 'All bugs squashed!';
    }
  } else if (state.mode === WRITE_MODE) {
    state.commands = 'Commands: Mash keys write code. [ESC] to go back.';
    state.display = `+${WRITE_MODE.text}`;
  } else if (state.mode === BUY_MODE) {
    const curItem = shopItems[state.shopIndex];
    const cost = getItemCost(state.shopIndex);
    const itemCost = (state.cash >= cost) ? `(${cost}$)`.green
      : `(${cost}$)`.red;
    const leftBorder = (state.shopIndex === 0) ? '---' : '<---';
    const rightBorder = (state.shopIndex === shopItems.length - 1) ? '---' : '--->';

    state.commands = 'Commands: [<-][->] to browse. [ENTER] to purchase. [ESC] to go back.';
    state.display = `${leftBorder} ${curItem.text} Cost: ${itemCost} ${rightBorder}`;
  } else if (state.mode === ABOUT_MODE) {
    state.commands = 'Commands: [ESC] to go back.';
    state.display = 'You are a person. If you hit 500 bugs, you lose. \n' +
    'Game ends after 30 days. Get as much money as you can.';
  }
}

function purchase(itemIndex) {
  const cost = getItemCost(itemIndex);
  if (state.cash >= cost) state.cash -= cost;
  state.owned[itemIndex]++;

  if (itemIndex === 2) {
    // Bananas
    rates['code/monkey'] /= 2;
  } else if (itemIndex === 3) {
    // Lunches
    rates['debug/intern'] *= 2;
  } else if (itemIndex === 4) {
    // Linter
    rates['bugtick/size'] /= 2;
  }
}

function handleInput(key) {
  if (!state.started && key === 'return') {
    state.started = true;
    state.mode = MAIN_MODE;
  } else if (state.ended && key === 'escape') {
    process.exit();
  } else if (state.mode === MAIN_MODE) {
    // Reset the console
    console.log('\x1B[2J');

    switch (key) {
      case 'd':
        state.currentBug = getRandomInt(0, 10);
        state.mode = DEBUG_MODE;
        break;
      case 'w':
        state.mode = WRITE_MODE;
        break;
      case 'b':
        state.mode = BUY_MODE;
        state.shopIndex = 0;
        break;
      case 'a':
        state.mode = ABOUT_MODE;
        break;
      case 'escape':
        process.exit();
        break;
      default:
        break;
    }
  } else if (key === 'escape') {
    state.mode = MAIN_MODE;
  } else if (state.mode === DEBUG_MODE) {
    if (key === String(state.currentBug) && state.bugs >= 1) {
      state.bugs--;
      state.cash += rates['cash/bug'];
      state.currentBug = getRandomInt(0, 10);
    }
  } else if (state.mode === WRITE_MODE) {
    // Get the last 50 chars of text
    WRITE_MODE.text = (WRITE_MODE.text + key).slice(-50);

    state.size += WRITE_MODE.charSize;
  } else if (state.mode === BUY_MODE) {
    switch (key) {
      case 'left':
        state.shopIndex = (shopItems.length + state.shopIndex - 1) % shopItems.length;
        break;
      case 'right':
        state.shopIndex = (state.shopIndex + 1) % shopItems.length;
        break;
      case 'return':
        purchase(state.shopIndex);
        break;
      default:
        break;
    }
  }
}

function init() {
  // Fill the 'owned' array with zeroes
  state.owned = shopItems.map(() => 0);

  // Make `process.stdin` begin emitting "keypress" events
  keypress(process.stdin);

  // Listen for "keypress" events
  process.stdin.on('keypress', (ch, key) => {
    if (key && key.ctrl && key.name === 'c') {
      process.exit();
    } else if (key) {
      handleInput(key.name);
    } else if (ch) {
      handleInput(ch);
    }
  });
  process.stdin.setRawMode(true);
}

function gameLoop() {
  logic();
  render();
  setTimeout(gameLoop, UPDATE_RATE_MS);
}

// Start Game
init();
gameLoop();
