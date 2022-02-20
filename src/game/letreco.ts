/* eslint-disable class-methods-use-this */
import { ElementHandle } from 'puppeteer';
import Game from './game';
import Browser from '../browser/browser';

export default class Letreco extends Game {
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

  protected async getGuessFeedback(
    selector: string | ElementHandle<Element> | Element,
  ) {
    let letters;
    if (typeof selector === 'string') {
      letters = await this.browser.getElement(`${selector}>.letter-wrapper`);
    } else {
      letters = await (selector as ElementHandle).$$('.letter-wrapper');
    }

    const promises = letters.map((letter: any) => {
      return this.browser.evaluate(this.checkStatusLetter, letter);
    });

    return Promise.all(promises);
  }

  protected async guess(chosenWord?: string) {
    let word = chosenWord!;
    if (!chosenWord || this.guesses.includes(word)) {
      const regex = this.generateRegexByLetters();
      word = this.selectWord(regex);
    }

    await this.enterWord(word);
    const element = await this.browser.getElement(
      '.d-flex.justify-content-center.mb-3',
    );
    const feedback = await this.getGuessFeedback(element[this.guesses.length]);

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
    const element = await this.browser.getElement(
      '.d-flex.justify-content-center.mb-3',
    );
    const feedback = await this.getGuessFeedback(element[this.guesses.length]);

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
    const correctPosition = el.classList.contains('right');
    const correctLetter = el.classList.contains('displaced');
    const parent = el.parentElement;
    const pos = Array.from(parent.children).indexOf(el);

    return {
      letter: el.textContent,
      pos,
      correctPosition,
      correctLetter,
    };
  }
}
