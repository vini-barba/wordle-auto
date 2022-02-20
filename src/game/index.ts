import Browser from '../browser/browser';
import Letreco from './letreco';
import PalavraDoDia from './palavraDoDia';
import Termo from './termo';

async function termoGame() {
  const termoBrowser = new Browser('https://term.ooo/');
  await termoBrowser.init();

  const termo = new Termo({
    browser: termoBrowser,
    firstWord: 'minar',
    secondWord: 'selou',
  });

  await termo.init();
}
async function palavraDoDiaGame() {
  const palavraDoDiaBrowser = new Browser('https://palavra-do-dia.pt/');
  await palavraDoDiaBrowser.init();

  const palavraDoDia = new PalavraDoDia({
    browser: palavraDoDiaBrowser,
    firstWord: 'minar',
    secondWord: 'selou',
  });

  await palavraDoDia.init();
}
async function letrecoGame() {
  const letrecoBrowser = new Browser('https://www.gabtoschi.com/letreco/');
  await letrecoBrowser.init();

  const letreco = new Letreco({
    browser: letrecoBrowser,
    firstWord: 'minar',
    secondWord: 'selou',
  });

  await letreco.init();
}
async function main() {
  termoGame()
    .finally(() => letrecoGame())
    .finally(() => palavraDoDiaGame());
}

main()
  .then(() => {
    console.log('\nDone');
  })
  .catch(console.error);
