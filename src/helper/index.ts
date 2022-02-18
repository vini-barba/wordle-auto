import fs from 'fs';

export default class Helper {
  static sanitizeLetter(letter: string) {
    return letter
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  static readFile(file: string) {
    return fs.readFileSync(file, 'utf8');
  }

  static getWordsFromFile(file: string) {
    return Helper.readFile(file).split('\n');
  }

  static sortByIfWordHasRepeatedLetters(firstWord: string, secondWord: string) {
    const aLetters = new Set(firstWord.split(''));
    const bLetters = new Set(secondWord.split(''));
    const aLettersCount = aLetters.size;
    const bLettersCount = bLetters.size;
    if (aLettersCount > bLettersCount) {
      return -1;
    }
    if (aLettersCount < bLettersCount) {
      return 1;
    }
    return 0;
  }
}
