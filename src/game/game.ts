/* eslint-disable class-methods-use-this */
import { KeyInput } from 'puppeteer';
import path from 'path';
import Browser from '../browser/browser';
import Helper from '../helper';

type Feedback = {
  atempt: number;
  letter: string;
  correctLetter: boolean;
  correctPosition: boolean;
  pos: number;
};
export default class Game {
  private browser: Browser;

  private firstWord: string;

  public correctLettersInwrongPosition: string[][] = [
    [''],
    [''],
    [''],
    [''],
    [''],
  ];

  public correctLettersInCorrectPosition: string[] = ['', '', '', '', ''];

  public wrongLetters: string[] = [];

  private guesses: string[] = [];

  private feedback: Feedback[] = [];

  private lang: string;

  constructor(browser: Browser, firstWord: string, lang: string) {
    this.browser = browser;
    this.firstWord = firstWord;
    this.lang = lang;
  }

  public async init() {
    await this.browser.waitForTimeout(2000);
    await this.browser.clickOn('body');
    await this.browser.waitForTimeout(2000);

    const guesses = this.makeGuesses();
    // eslint-disable-next-line no-restricted-syntax
    for await (const guess of guesses) {
      try {
        await guesses.next().value;
      } catch (e) {
        guesses.return();
      }
    }
  }

  *makeGuesses() {
    yield this.firstGuess();
    while (true) {
      yield this.guess();
    }
  }

  private async enterWord(word: string) {
    // eslint-disable-next-line no-restricted-syntax
    for await (const char of word) {
      await this.browser.pressKey(char as KeyInput);
      await this.browser.waitForTimeout(200);
    }
    await this.browser.pressKey('Enter');
    await this.browser.waitForTimeout(2000);
  }

  private async getGuessFeedback(selector: string) {
    const letters = await this.browser.getElement(`${selector}>.letter`);

    const promises = letters.map((letter: any) => {
      return this.browser.evaluate(this.checkStatusLetter, letter);
    });

    return Promise.all(promises);
  }

  private fillMetaFeedback(feedbacks: Feedback[]) {
    feedbacks.forEach((feedback: any) => {
      if (feedback.correctPosition) {
        this.correctLettersInCorrectPosition[feedback.pos] =
          Helper.sanitizeLetter(feedback.letter);
      }
      if (feedback.correctLetter) {
        this.correctLettersInwrongPosition[feedback.pos].push(
          Helper.sanitizeLetter(feedback.letter),
        );
      }
      if (!feedback.correctPosition && !feedback.correctLetter) {
        if (
          ![
            ...this.correctLettersInCorrectPosition,
            ...this.correctLettersInwrongPosition.flat(),
          ].includes(feedback.letter)
        ) {
          this.wrongLetters.push(Helper.sanitizeLetter(feedback.letter));
        }
      }
    });
  }

  public checkStatusLetter(el: any) {
    const correctPosition = el.classList.contains('right');

    const correctLetter = el.classList.contains('place');
    const pos = el.attributes['termo-pos'].value;

    return {
      letter: el.textContent,
      pos,
      correctPosition,
      correctLetter,
    };
  }

  private checkIfGuessIsValid(feedback: Feedback[]) {
    return (
      Object.entries(feedback).filter(
        ([, f]) => f.correctPosition || f.correctLetter,
      ).length > 0
    );
  }

  private async eraseGuess() {
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
  }

  private async firstGuess() {
    await this.enterWord(this.firstWord);
    const feedback = await this.getGuessFeedback(
      `[aria-label="palavra ${this.guesses.length + 1}"]`,
    );

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

  private async guess(chosenWord?: string) {
    let word = chosenWord!;
    if (!chosenWord) {
      const regex = this.generateRegexByLetters();
      word = this.selectWord(regex);
    }

    await this.enterWord(word);
    const feedback = await this.getGuessFeedback(
      `[aria-label="palavra ${this.guesses.length + 1}"]`,
    );

    const isFeedbackValid = this.checkIfGuessIsValid(feedback);
    if (!isFeedbackValid) {
      await this.eraseGuess();
      await this.guess();
    } else {
      this.fillMetaFeedback(feedback);
      this.feedback.push(...feedback);
      this.guesses.push(word);
    }
  }

  private generateRegexByLetters() {
    const lettersList = ['', '', '', '', ''];

    this.correctLettersInCorrectPosition.forEach((letter, index) => {
      if (letter !== '') {
        lettersList[index] = `[${letter}]`;
      }
    });

    this.correctLettersInwrongPosition.forEach((letter, index) => {
      if (letter.length > 0 && lettersList[index] === '') {
        lettersList[index] = `((?![${letter.join('')}${this.wrongLetters.join(
          '',
        )}])[a-z])`;
      }
    });

    const stringRegex = lettersList
      .map((letter) => {
        if (letter === '') {
          return `((?![${this.wrongLetters.join('')}])[a-z])`;
        }
        return letter;
      })
      .join('');

    const regex = new RegExp(stringRegex);

    return regex;
  }

  private selectWord(regex: RegExp) {
    const words = Helper.getWordsFromFile(
      path.join(__dirname, `../../public/word-list.${this.lang}.txt`),
    );
    const wordList = words
      .filter((w) => regex.test(w))
      .filter((w) => !this.guesses.includes(w));

    const word0 = wordList
      .filter((w) => this.testLettersInWrongPosition(w, 0))
      .sort(() => Math.random() - 0.4)
      .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];

    const word1 = wordList
      .filter((w) => this.testLettersInWrongPosition(w, 1))
      .sort(() => Math.random() - 0.4)
      .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];

    const word2 = wordList
      .filter((w) => this.testLettersInWrongPosition(w, 2))
      .sort(() => Math.random() - 0.4)
      .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];

    const word3 = wordList
      .filter((w) => this.testLettersInWrongPosition(w, 3))
      .sort(() => Math.random() - 0.4)
      .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];

    const word4 = wordList
      .filter((w) => this.testLettersInWrongPosition(w, 4))
      .sort(() => Math.random() - 0.4)
      .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];

    const word = wordList.sort(() => Math.random() - 0.5)[0];
    const possibleGuesses = [word0, word1, word2, word3, word4].filter(
      (w) => w !== undefined,
    );
    const randomWord =
      possibleGuesses[Math.floor(Math.random() * possibleGuesses.length)];
    console.log({ word0, word1, word2, word3, word4, word, randomWord });

    return randomWord || word;
  }

  private testLettersInWrongPosition(w: string, pos: number) {
    const correctLetters = this.correctLettersInCorrectPosition;

    const t = correctLetters.map((l, index) => {
      if (l !== '') {
        return `[${l}]`;
      }

      if (pos === index) {
        const wrongPosition = this.correctLettersInwrongPosition[pos];

        const inOtherPositions = this.correctLettersInwrongPosition.filter(
          (w, i) => i !== pos,
        );

        const possible = inOtherPositions.flat().filter((i) => {
          return !wrongPosition.includes(i);
        });
        return `[${possible.join('')}]`;
      }

      return `((?![${this.wrongLetters.join('')}])[a-z])`;
    });

    const regex = new RegExp(t.join(''));

    const test = regex.test(w);

    return test;
  }
}
