import Browser from '../browser/browser';
import Game from './game';

export default class Termo extends Game {
  constructor({
    browser,
    firstWord,
    secondWord,
  }: {
    browser: Browser;
    firstWord: string;
    secondWord?: string;
  }) {
    super({
      browser,
      firstWord,
      secondWord,
      lang: 'pt',
    });
  }
}
