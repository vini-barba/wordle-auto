/* eslint-disable dot-notation */
import fs from 'fs';
import path from 'path';

import Spellchecker from 'rt-spellcheck';

const spellchecker = new Spellchecker('pt');

function readFileSync(file: string) {
  return fs.readFileSync(file, 'utf8');
}

function appendFileSync(file: string, data: string) {
  fs.appendFileSync(file, data, 'utf8');
}

function writeWordInFile(word: string) {
  const regex = /^([a-zàèìòùÀÈÌÒÙáéíóúâêîôûãñõäëïöüç]{5})$/gim;
  if (regex.test(word.toLowerCase())) {
    appendFileSync(
      path.join(__dirname, '..', 'public', 'pt-words.txt'),
      `${word.toLowerCase()}\n`,
    );
  }
}
function main() {
  const wordSet = new Set<string>();
  const check = spellchecker.check('dado');
  const word = spellchecker.dict.words.dado;
  console.log({ check, word });

  // Object.entries(spellchecker.dict.words).forEach(
  // ([word, suggestions], index) => {
  //   // console.log({ word, index });
  //   wordSet.add(word);
  //   if (/dado/.test(word)) {
  //     console.log({ word, suggestions });
  //   }
  //   suggestions.forEach((suggestion) => {
  //   const prefixes = spellchecker.dict.prefixes.filter((prefix) =>
  //     suggestion.split('').includes(prefix.code),
  //   );
  //   const suffixes = spellchecker.dict.suffixes.filter((suffix) =>
  //     suggestion.split('').includes(suffix.code),
  //   );
  //   // console.log({ word, suggestion, suffixes, prefixes });
  //   if (prefixes.length > 0) {
  //     // do something
  //   }
  //   if (suffixes.length > 0) {
  //     suffixes.forEach((suffix) => {
  //       const afxWord = word.replace(
  //         new RegExp(`${suffix['add']}$`),
  //         suffix['remove'].toString().replace(/\//g, '').replace(/\$/, ''),
  //       );
  //       wordSet.add(afxWord);
  //       console.log({ word, suggestion, suffix, afxWord });
  //       // spellchecker['wordCheck'].check(`${word}${suffix.code}`);
  //       // const wordWithSuffix = suffix.applyToWord(word);
  //       // console.log({ wordWithSuffix });
  //       // const suggestionsWithSuffix = spellchecker.check(wordWithSuffix);
  //       // if (suggestionsWithSuffix) {
  //       //   // writeWordInFile(wordWithSuffix);
  //       // }
  //     });
  //   }
  //     });
  //   },
  // );
  // console.log({ wordSet });
  [...wordSet].forEach((w) => {
    writeWordInFile(w);
  });
}

main();
