import { Page, Locator } from '@playwright/test';

export class StockAnalysisPage {
  readonly page: Page;
  readonly stockCodeInput: Locator;
  readonly timeframeSelect: Locator;
  readonly analyzeBtn: Locator;
  readonly clearBtn: Locator;
  readonly tableMode: Locator;
  readonly chartMode: Locator;
  readonly mainChart: Locator;
  readonly volumeChart: Locator;
  readonly analyzeResult: Locator;
  readonly wyckoffPhaseContent: Locator;
  readonly operationZoneContent: Locator;
  readonly predictionConfidence: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stockCodeInput = page.locator('#stock-code');
    this.timeframeSelect = page.locator('#timeframe');
    this.analyzeBtn = page.locator('#analyze-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.tableMode = page.locator('#tableMode');
    this.chartMode = page.locator('#chartMode');
    this.mainChart = page.locator('#mainChart');
    this.volumeChart = page.locator('#volumeChart');
    this.analyzeResult = page.locator('#analyzeResult');
    this.wyckoffPhaseContent = page.locator('#wyckoff-phase-content');
    this.operationZoneContent = page.locator('#operation-zone-content');
    this.predictionConfidence = page.locator('#prediction-confidence');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async analyzeStock(stockCode: string, timeframe: string = 'daily') {
    await this.stockCodeInput.fill(stockCode);
    await this.timeframeSelect.selectOption(timeframe);
    await this.analyzeBtn.click();

    // Wait for analysis to complete
    await this.page.waitForSelector('#analyzeResult:not(:empty)', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  async clearAnalysis() {
    await this.clearBtn.click();
  }

  async switchToTableMode() {
    await this.page.locator('#btnTable').click();
  }

  async switchToChartMode() {
    await this.page.locator('#btnChart').click();
  }

  async getWyckoffPhase() {
    return await this.wyckoffPhaseContent.textContent();
  }

  async getOperationZone() {
    return await this.operationZoneContent.textContent();
  }

  async getPredictionConfidence() {
    return await this.predictionConfidence.textContent();
  }

  async isChartVisible() {
    return await this.mainChart.isVisible() && await this.volumeChart.isVisible();
  }

  async hasAnalysisResults() {
    const text = await this.analyzeResult.textContent();
    return text && text.trim().length > 0;
  }
}
