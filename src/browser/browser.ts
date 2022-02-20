/* eslint-disable class-methods-use-this */
import puppeteer, { KeyInput } from 'puppeteer';

export default class Browser {
  private browser!: puppeteer.Browser;

  private page!: puppeteer.Page;

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public async init() {
    this.browser = await this.createBrowser();
    this.page = await this.createPage();
  }

  private async createBrowser() {
    return puppeteer.launch({
      headless: false,
      //   defaultViewport: {
      //     width: 1280,
      //     height: 720,
      //   },
    });
  }

  private async createPage() {
    const page = await this.browser.newPage();

    page.goto(this.url);
    return page;
  }

  public async pressKey(key: KeyInput) {
    await this.page.keyboard.press(key);
  }

  public async clickOn(selector: string) {
    await this.page.waitForSelector(selector);
    await this.page.click(selector);
  }

  public async getElement(selector: string) {
    this.page.waitForSelector(selector);
    return this.page.$$(selector);
  }

  public async getShadowElement(parentSelector: string) {
    return this.page.$(parentSelector);
  }

  public async evaluate(fn: any, ...args: any[]) {
    return this.page.evaluate(fn, ...args);
  }

  public async waitForTimeout(timeout: number) {
    await this.page.waitForTimeout(timeout);
  }

  public async close() {
    await this.browser.close();
  }
}
