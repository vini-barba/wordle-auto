/* eslint-disable class-methods-use-this */
import { ElementHandle, KeyInput } from 'puppeteer';
import path from 'path';
import Browser from '../browser/browser';
import Helper from '../helper';

type Feedback = {
  letter: string;
  correctLetter: boolean;
  correctPosition: boolean;
  pos: number;
};
export default class Game {
  protected browser: Browser;

  protected firstWord: string;

  protected secondWord?: string;

  private correctLettersInwrongPosition: string[][] = [
    [''],
    [''],
    [''],
    [''],
    [''],
  ];

  private correctLettersInCorrectPosition: string[] = ['', '', '', '', ''];

  private wrongLetters: string[] = [];

  protected invalidWords: string[] = [];

  protected guesses: string[] = [];

  protected feedback: Feedback[] = [];

  private lang: string;

  constructor({
    browser,
    firstWord,
    secondWord,
    lang,
  }: {
    browser: Browser;
    firstWord: string;
    secondWord?: string;
    lang: string;
  }) {
    this.browser = browser;
    this.firstWord = firstWord;
    this.secondWord = secondWord;
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
        await guesses.next(this.secondWord).value;
      } catch (e) {
        guesses.return();
      }
    }
  }

  *makeGuesses() {
    yield this.firstGuess();
    while (true) {
      yield this.guess(this.secondWord);
    }
  }

  protected async enterWord(word: string) {
    if (!word) {
      await this.browser.close();
    } else {
      // eslint-disable-next-line no-restricted-syntax
      for await (const char of word) {
        await this.browser.pressKey(char as KeyInput);
        await this.browser.waitForTimeout(200);
      }
      await this.browser.pressKey('Enter');
      await this.browser.waitForTimeout(2000);
    }
  }

  protected async getGuessFeedback(selector: string | ElementHandle<Element>) {
    const letters = await this.browser.getElement(`${selector}>.letter`);

    const promises = letters.map((letter: any) => {
      return this.browser.evaluate(this.checkStatusLetter, letter);
    });

    return Promise.all(promises);
  }

  protected fillMetaFeedback(feedbacks: Feedback[]) {
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

  protected checkIfGuessIsValid(feedback: Feedback[]) {
    return (
      Object.entries(feedback).filter(
        ([, f]) => f.correctPosition || f.correctLetter,
      ).length > 0
    );
  }

  protected async eraseGuess() {
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
    await this.browser.pressKey('Backspace');
  }

  protected async firstGuess() {
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

  protected async guess(chosenWord?: string) {
    let word = chosenWord!;
    if (!chosenWord || this.guesses.includes(word)) {
      const regex = this.generateRegexByLetters();
      word = this.selectWord(regex);
    }

    await this.enterWord(word);
    const feedback = await this.getGuessFeedback(
      `[aria-label="palavra ${this.guesses.length + 1}"]`,
    );

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

  protected generateRegexByLetters() {
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

  protected selectWord(regex: RegExp) {
    const words = Helper.getWordsFromFile(
      path.join(__dirname, `../../public/word-list.${this.lang}.txt`),
    ).filter((word) => {
      return !this.invalidWords.includes(word);
    });
    const wordList = words
      .filter((w) => regex.test(w))
      .filter((w) => !this.guesses.includes(w));

    const possible = this.testRegexCombination(wordList);

    const word = wordList.sort(() => Math.random() - 0.5)[0];
    const possibleGuesses = possible.filter((w) => w !== undefined);
    const randomWord =
      possibleGuesses[Math.floor(Math.random() * possibleGuesses.length)];

    console.log({ possibleGuesses, randomWord, word });

    return randomWord || word;
  }

  private generateRegexWithLettersInWrongPosition(pos: number) {
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
    return regex;
  }

  private testRegexCombination(wordList: string[]) {
    const regexPos0 = this.generateRegexWithLettersInWrongPosition(0);
    const regexPos1 = this.generateRegexWithLettersInWrongPosition(1);
    const regexPos2 = this.generateRegexWithLettersInWrongPosition(2);
    const regexPos3 = this.generateRegexWithLettersInWrongPosition(3);
    const regexPos4 = this.generateRegexWithLettersInWrongPosition(4);

    const regexMap: { [k: number]: RegExp } = {
      0: regexPos0,
      1: regexPos1,
      2: regexPos2,
      3: regexPos3,
      4: regexPos4,
    };
    const possibleCombinations = 31;

    const words = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i <= possibleCombinations; i++) {
      const combination = i.toString(2).padStart(5, '0').split('');

      const t = combination.reduce((acc, curr, index) => {
        if (curr === '1') {
          const newWordList = acc.filter((w) => regexMap[index].test(w));
          // eslint-disable-next-line no-param-reassign
          acc = newWordList;
        }

        return acc;
      }, wordList);
      const chosenWord = t
        .sort(() => Math.random() - 0.5)
        .sort((a, b) => Helper.sortByIfWordHasRepeatedLetters(a, b))[0];
      words.push(chosenWord);
    }

    return words;
  }
}
