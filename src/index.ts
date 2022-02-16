import puppeteer, { KeyInput } from 'puppeteer';
import fs from 'fs';
import path from 'path';

const openBrowser = async (): Promise<puppeteer.Browser> => {
  return puppeteer.launch({ headless: false });
};

// const closeBrowser = async (browser: puppeteer.Browser): Promise<void> => {
//   await browser.close();
// };
const getPage = async (
  browser: puppeteer.Browser,
  url: string,
): Promise<puppeteer.Page> => {
  const page = await browser.newPage();
  await page.goto(url);
  return page;
};

const clickOn = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.click(selector);
};

const pressKey = async (page: puppeteer.Page, key: KeyInput) => {
  await page.keyboard.press(key);
};

const enterWord = async (page: puppeteer.Page, word: string) => {
  //   eslint-disable-next-line no-restricted-syntax
  for await (const char of word) {
    await pressKey(page, char as KeyInput);
    await page.waitForTimeout(100);
  }
  await pressKey(page, 'Enter');
  await page.waitForTimeout(2000);
};

const getGuessFeedback = async (page: puppeteer.Page, selector: string) => {
  const letters = await page.$$(`${selector}.letter`);
  return Promise.all(
    letters.map(async (letter) => {
      return page.evaluate((el) => {
        return {
          letter: el.textContent,
          pos: el.attributes['termo-pos'].value,
          correctPosition: el.classList.contains('right'),
          correctLetter: el.classList.contains('place'),
        };
      }, letter);
    }),
  );
};

const generateRegexByLetters = (letters: string[]) => {
  const regex = letters
    .map((letter) => {
      const correctLetterInWrongPosition = letters.filter((l) => {
        return l !== '' && l === l.toLowerCase();
      });
      if (letter === '') {
        return `(${correctLetterInWrongPosition.join('')})`;
      }
      if (letter === letter.toLowerCase()) {
        return `[a-z&&(^${correctLetterInWrongPosition.join('')})]`;
      }
      return letter.toLowerCase();
    })
    .join('');
  console.log(new RegExp(regex));

  return new RegExp(regex);
};

function readFileSync(file: string) {
  return fs.readFileSync(file, 'utf8');
}

const guessNewWord = async ({
  words,
  regex,
  guesses,
  page,
}: any): Promise<any> => {
  const word = words
    .filter((w: any) => regex.test(w))
    .filter((w: any) => !guesses.includes(w))
    .sort(() => Math.random() - 0.5)[0];

  await enterWord(page, word);
  const feedback = await getGuessFeedback(
    page,
    `[aria-label="palavra ${guesses.length + 1}"]>`,
  );

  const feedbackNotEmpty =
    Object.entries(feedback).filter(
      ([, f]) => f.correctPosition || f.correctLetter,
    ).length > 0;

  if (feedbackNotEmpty) {
    return { guesses: [...guesses, word], feedback };
  }

  await pressKey(page, 'Backspace');
  await pressKey(page, 'Backspace');
  await pressKey(page, 'Backspace');
  await pressKey(page, 'Backspace');
  await pressKey(page, 'Backspace');
  return guessNewWord({ words, regex, guesses, page });
};
const guessWord = async (
  page: puppeteer.Page,
  guesses: string[],
  previousFeedBack?: any,
) => {
  if (!previousFeedBack) {
    const word = 'calor';
    await enterWord(page, 'minar');
    const feedback = await getGuessFeedback(
      page,
      `[aria-label="palavra ${guesses.length + 1}"]>`,
    );
    return { guesses: [word], feedback };
  }
  const lettersInPosition = previousFeedBack
    .sort((a: any, b: any) => {
      if (a.correctPosition === b.correctPosition) {
        if (a.correctLetter === b.correctLetter) {
          return a.pos - b.pos;
        }
        return a.correctLetter ? -1 : 1;
      }
      return a.correctPosition ? -1 : 1;
    })
    .reduce(
      (acc: string[], curr: any) => {
        if (curr.correctPosition) {
          acc[curr.pos] = curr.letter.toUpperCase();
          return acc;
        }
        if (curr.correctLetter) {
          let pos = Math.floor(Math.random() * acc.length);
          while (pos === curr.pos || acc[pos]) {
            pos = Math.floor(Math.random() * acc.length);
          }
          acc[pos] = curr.letter;
          return acc;
        }

        return acc;
      },
      ['', '', '', '', ''],
    );

  const regex = generateRegexByLetters(lettersInPosition);
  const words = readFileSync(
    path.join(__dirname, '..', 'public', 'word-list.pt.txt'),
  ).split('\n');

  return guessNewWord({ words, regex, guesses, page });
};

async function main() {
  const browser = await openBrowser();
  const page = await getPage(browser, 'https://term.ooo/');
  await page.waitForTimeout(500);
  await clickOn(page, 'body');

  const firstGuess = await guessWord(page, []);

  const secondGuess = await guessWord(
    page,
    firstGuess.guesses,
    firstGuess.feedback,
  );

  const thirdGuess = await guessWord(
    page,
    secondGuess.guesses,
    secondGuess.feedback,
  );

  const fourthGuess = await guessWord(
    page,
    thirdGuess.guesses,
    thirdGuess.feedback,
  );

  const fifthGuess = await guessWord(
    page,
    fourthGuess.guesses,
    fourthGuess.feedback,
  );

  await guessWord(page, fifthGuess.guesses, fifthGuess.feedback);
}

main()
  .then(() => console.log())
  .catch(console.error);
