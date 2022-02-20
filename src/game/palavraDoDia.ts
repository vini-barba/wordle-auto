/* eslint-disable dot-notation */
/* eslint-disable class-methods-use-this */
import { ElementHandle } from 'puppeteer';
import Game from './game';
import Browser from '../browser/browser';

export default class PalavraDoDia extends Game {
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

  protected async getGuessFeedback(selector: string | ElementHandle<Element>) {
    const index = this.guesses.length;
    const gameData = (await (selector as ElementHandle)?.jsonValue()) as any;

    const word = gameData?.boardState[index];
    const wordData: string = gameData?.evaluations[index]!;
    return word
      .split('')
      .map((char: string, i: number) =>
        this.checkStatusLetter({ char, charData: wordData[i], index: i }),
      );
  }

  protected async guess(chosenWord?: string) {
    let word = chosenWord!;
    if (!chosenWord || this.guesses.includes(word)) {
      const regex = this.generateRegexByLetters();
      word = this.selectWord(regex);
    }

    await this.enterWord(word);
    const element = await this.browser.getShadowElement('game-app');
    if (!element) return;

    const feedback = await this.getGuessFeedback(element);

    const isFeedbackValid = this.checkIfGuessIsValid(feedback);
    if (!isFeedbackValid) {
      this.invalidWords.push(word);
      await this.eraseGuess();
      await this.guess();
    } else {
      this.fillMetaFeedback(feedback);
      this.feedback.push(...feedback);
      this.guesses.push(word);
    }
  }

  protected async firstGuess() {
    await this.enterWord(this.firstWord);

    const element = await this.browser.getShadowElement('game-app');

    if (!element) return;
    const feedback = await this.getGuessFeedback(element);
    const isFeedbackValid = this.checkIfGuessIsValid(feedback);

    if (!isFeedbackValid) {
      await this.eraseGuess();
      const regex = this.generateRegexByLetters();
      const word = this.selectWord(regex);
      this.firstWord = word;
      await this.firstGuess();
    } else {
      this.fillMetaFeedback(feedback);
      this.feedback.push(...feedback);
      this.guesses.push(this.firstWord);
    }
  }

  public checkStatusLetter(el: any) {
    const { char, charData, index } = el;
    const correctPosition = charData === 'correct';
    const correctLetter = charData === 'present';

    const pos = index;

    return {
      letter: char,
      pos,
      correctPosition,
      correctLetter,
    };
  }
}
