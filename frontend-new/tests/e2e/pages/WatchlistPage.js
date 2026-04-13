import { Page, Locator } from '@playwright/test';

export class WatchlistPage {
  readonly page: Page;
  readonly watchlistTab: Locator;
  readonly stockCodeInput: Locator;
  readonly addBtn: Locator;
  readonly batchAnalyzeBtn: Locator;
  readonly refreshBtn: Locator;
  readonly watchlistContent: Locator;
  readonly favoriteTab: Locator;
  readonly browseTab: Locator;
  readonly timeframeSelect: Locator;
  readonly viewCardBtn: Locator;
  readonly viewTableBtn: Locator;
  readonly filterBullish: Locator;
  readonly filterBearish: Locator;
  readonly filterHighScore: Locator;

  constructor(page: Page) {
    this.page = page;
    this.watchlistTab = page.locator('#btnWatchlist');
    this.stockCodeInput = page.locator('#watchlist-code');
    this.addBtn = page.locator('#add-watchlist-btn');
    this.batchAnalyzeBtn = page.locator('#batch-analyze-btn');
    this.refreshBtn = page.locator('#refresh-watchlist-btn');
    this.watchlistContent = page.locator('#watchlist');
    this.favoriteTab = page.locator('#subtab-favorite');
    this.browseTab = page.locator('#subtab-browse');
    this.timeframeSelect = page.locator('#watchlist-timeframe');
    this.viewCardBtn = page.locator('#viewMode-card');
    this.viewTableBtn = page.locator('#viewMode-table');
    this.filterBullish = page.locator('#filter-bullish');
    this.filterBearish = page.locator('#filter-bearish');
    this.filterHighScore = page.locator('#filter-high-score');
  }

  async goto() {
    await this.page.goto('/');
    await this.watchlistTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addStock(stockCode: string) {
    await this.stockCodeInput.fill(stockCode);
    await this.addBtn.click();

    // Wait for add operation
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async switchToFavorite() {
    await this.favoriteTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async switchToBrowse() {
    await this.browseTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async setTimeframe(timeframe: string) {
    await this.timeframeSelect.selectOption(timeframe);
    await this.page.waitForLoadState('networkidle');
  }

  async switchToCardView() {
    await this.viewCardBtn.click();
  }

  async switchToTableView() {
    await this.viewTableBtn.click();
  }

  async filterByBullish(enabled: boolean = true) {
    if (await this.filterBullish.isChecked() !== enabled) {
      await this.filterBullish.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  async filterByBearish(enabled: boolean = true) {
    if (await this.filterBearish.isChecked() !== enabled) {
      await this.filterBearish.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  async filterByHighScore(enabled: boolean = true) {
    if (await this.filterHighScore.isChecked() !== enabled) {
      await this.filterHighScore.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  async getStockCount() {
    const cards = await this.watchlistContent.locator('[data-testid="stock-card"]').count();
    const rows = await this.watchlistContent.locator('tbody tr').count();
    return Math.max(cards, rows);
  }

  async refresh() {
    await this.refreshBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async batchAnalyze() {
    await this.batchAnalyzeBtn.click();

    // Wait for batch analysis to complete
    await this.page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async hasStock(stockCode: string) {
    const content = await this.watchlistContent.textContent();
    return content?.includes(stockCode) ?? false;
  }
}
