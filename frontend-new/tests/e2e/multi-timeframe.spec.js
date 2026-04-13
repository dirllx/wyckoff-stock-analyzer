import { test, expect } from '@playwright/test';
import { MultiTimeframePage } from './pages/MultiTimeframePage';

test.describe('多周期分析', () => {
  let mtfPage: MultiTimeframePage;

  test.beforeEach(async ({ page }) => {
    mtfPage = new MultiTimeframePage(page);
    await mtfPage.goto();
  });

  test('应能进行多周期分析', async ({ page }) => {
    await mtfPage.analyzeMultiTimeframe('688234');

    const hasResults = await mtfPage.hasResults();
    expect(hasResults).toBeTruthy();
  });

  test('应能选择历史日期分析', async ({ page }) => {
    // 先分析一次以获取日期列表
    await mtfPage.analyzeMultiTimeframe('688234');

    const dates = await mtfPage.getAvailableDates();

    if (dates.length > 0) {
      await mtfPage.clearAnalysis();
      await mtfPage.analyzeMultiTimeframe('688234', dates[0]);

      const hasResults = await mtfPage.hasResults();
      expect(hasResults).toBeTruthy();
    }
  });

  test('应显示加载进度', async ({ page }) => {
    await mtfPage.stockCodeInput.fill('688234');
    await mtfPage.analyzeBtn.click();

    // 加载元素应该出现
    await expect(mtfPage.loadingElement).toBeVisible();

    // 然后消失
    await mtfPage.loadingElement.waitFor({ state: 'hidden', timeout: 30000 });
  });

  test('应能清空多周期分析', async ({ page }) => {
    await mtfPage.analyzeMultiTimeframe('688234');
    expect(await mtfPage.hasResults()).toBeTruthy();

    await mtfPage.clearAnalysis();

    const content = await mtfPage.multiTimeframeResult.textContent();
    expect(content?.trim()).toBe('');
  });
});
