import { Page, Locator } from '@playwright/test';

export class MultiTimeframePage {
  readonly page: Page;
  readonly stockCodeInput: Locator;
  readonly analyzeBtn: Locator;
  readonly clearBtn: Locator;
  readonly analysisDateSelect: Locator;
  readonly multiTab: Locator;
  readonly loadingElement: Locator;
  readonly progressFill: Locator;
  readonly multiTimeframeResult: Locator;

  constructor(page: Page) {
    this.page = page;
    this.multiTab = page.locator('#tabMulti');
    this.stockCodeInput = page.locator('#mtf-stock-code');
    this.analyzeBtn = page.locator('#mtf-analyze-btn');
    this.clearBtn = page.locator('#mtf-clear-btn');
    this.analysisDateSelect = page.locator('#mtf-analysis-date');
    this.loadingElement = page.locator('#mtf-loading');
    this.progressFill = page.locator('#mtf-progress-fill');
    this.multiTimeframeResult = page.locator('#multiTimeframe');
  }

  async goto() {
    await this.page.goto('/');
    await this.multiTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async analyzeMultiTimeframe(stockCode: string, date?: string) {
    await this.stockCodeInput.fill(stockCode);

    if (date) {
      await this.analysisDateSelect.selectOption(date);
    }

    await this.analyzeBtn.click();

    // Wait for loading to complete
    await this.loadingElement.waitFor({ state: 'hidden', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }

  async clearAnalysis() {
    await this.clearBtn.click();
  }

  async getAvailableDates() {
    const options = await this.analysisDateSelect.locator('option').allTextContents();
    return options.filter(opt => opt !== '加载中...' && opt !== '最新数据');
  }

  async hasResults() {
    const text = await this.multiTimeframeResult.textContent();
    return text && text.trim().length > 0;
  }
}
