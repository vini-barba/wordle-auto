import Game from './game';
import Browser from '../browser/browser';

async function main() {
  const browser = new Browser('https://term.ooo/');
  await browser.init();

  const game = new Game(browser, 'raiou', 'pt');

  await game.init();
}

main()
  .then(() => {
    console.log('done');
  })
  .catch(console.error);
