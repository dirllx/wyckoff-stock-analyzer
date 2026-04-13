import { test, expect } from '@playwright/test';
import { StockAnalysisPage } from './pages/StockAnalysisPage';

test.describe('股票日分析', () => {
  let analysisPage: StockAnalysisPage;

  test.beforeEach(async ({ page }) => {
    analysisPage = new StockAnalysisPage(page);
    await analysisPage.goto();
  });

  test('应能成功分析股票', async ({ page }) => {
    await analysisPage.analyzeStock('688234', 'daily');

    await expect(analysisPage.analyzeResult).toBeVisible();
    const hasResults = await analysisPage.hasAnalysisResults();
    expect(hasResults).toBeTruthy();
  });

  test('应能切换表格/图表模式', async ({ page }) => {
    await analysisPage.analyzeStock('688234', 'daily');

    // 默认是表格模式
    await expect(analysisPage.tableMode).toBeVisible();

    // 切换到图表模式
    await analysisPage.switchToChartMode();
    await expect(analysisPage.chartMode).toBeVisible();
    const chartVisible = await analysisPage.isChartVisible();
    expect(chartVisible).toBeTruthy();

    // 切换回表格模式
    await analysisPage.switchToTableMode();
    await expect(analysisPage.tableMode).toBeVisible();
  });

  test('应能切换不同周期', async ({ page }) => {
    const timeframes = ['30', '60', 'daily', 'weekly', 'monthly'];

    for (const tf of timeframes) {
      await analysisPage.analyzeStock('688234', tf);
      await page.waitForTimeout(1000);

      const hasResults = await analysisPage.hasAnalysisResults();
      expect(hasResults).toBeTruthy();
    }
  });

  test('分析结果应包含威科夫阶段', async ({ page }) => {
    await analysisPage.analyzeStock('688234', 'daily');

    const phase = await analysisPage.getWyckoffPhase();
    expect(phase).not.toBe('等待分析...');
    expect(phase).toBeTruthy();
  });

  test('分析结果应包含操作区域', async ({ page }) => {
    await analysisPage.analyzeStock('688234', 'daily');

    const zone = await analysisPage.getOperationZone();
    expect(zone).not.toBe('等待分析...');
    expect(zone).toBeTruthy();
  });

  test('应能清空分析结果', async ({ page }) => {
    await analysisPage.analyzeStock('688234', 'daily');
    expect(await analysisPage.hasAnalysisResults()).toBeTruthy();

    await analysisPage.clearAnalysis();

    const phase = await analysisPage.getWyckoffPhase();
    expect(phase).toBe('等待分析...');
  });

  test('应能处理无效股票代码', async ({ page }) => {
    await analysisPage.analyzeStock('999999', 'daily');

    // 应该显示错误或没有结果
    await page.waitForTimeout(3000);
  });
});
