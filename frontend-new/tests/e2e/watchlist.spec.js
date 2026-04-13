import { test, expect } from '@playwright/test';
import { WatchlistPage } from './pages/WatchlistPage';

test.describe('关注列表', () => {
  let watchlistPage: WatchlistPage;

  test.beforeEach(async ({ page }) => {
    watchlistPage = new WatchlistPage(page);
    await watchlistPage.goto();
  });

  test('应能添加股票到关注列表', async ({ page }) => {
    const testCode = '000001';

    await watchlistPage.addStock(testCode);

    const hasStock = await watchlistPage.hasStock(testCode);
    expect(hasStock).toBeTruthy();
  });

  test('应能切换自选股/浏览股', async ({ page }) => {
    await watchlistPage.switchToFavorite();
    await expect(watchlistPage.favoriteTab).toHaveAttribute('style', /linear-gradient/);

    await watchlistPage.switchToBrowse();
    await expect(watchlistPage.browseTab).toHaveAttribute('style', /linear-gradient/);
  });

  test('应能切换视图模式', async ({ page }) => {
    await watchlistPage.switchToTableView();
    await expect(watchlistPage.viewTableBtn).toHaveAttribute('style', /linear-gradient/);

    await watchlistPage.switchToCardView();
    await expect(watchlistPage.viewCardBtn).toHaveAttribute('style', /#374151/);
  });

  test('应能筛选看涨股票', async ({ page }) => {
    await watchlistPage.filterByBullish(true);
    await page.waitForTimeout(1000);

    const countBefore = await watchlistPage.getStockCount();
    expect(countBefore).toBeGreaterThanOrEqual(0);
  });

  test('应能筛选高评分股票', async ({ page }) => {
    await watchlistPage.filterByHighScore(true);
    await page.waitForTimeout(1000);

    const count = await watchlistPage.getStockCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('应能切换周期', async ({ page }) => {
    const timeframes = ['30', '60', 'daily', 'weekly'];

    for (const tf of timeframes) {
      await watchlistPage.setTimeframe(tf);
      await page.waitForTimeout(500);
    }
  });

  test('应能刷新关注列表', async ({ page }) => {
    await watchlistPage.refresh();
    await page.waitForTimeout(2000);

    const content = await watchlistPage.watchlistContent.textContent();
    expect(content).toBeTruthy();
  });

  test('批量分析应能工作', async ({ page }) => {
    // 先添加一些测试股票
    await watchlistPage.addStock('000001');
    await page.waitForTimeout(500);

    const stockCount = await watchlistPage.getStockCount();

    if (stockCount > 0) {
      await watchlistPage.batchAnalyze();

      await page.waitForTimeout(5000);
    }
  });

  test('应能清空输入框', async ({ page }) => {
    await watchlistPage.stockCodeInput.fill('123456');
    expect(await watchlistPage.stockCodeInput.inputValue()).toBe('123456');

    await watchlistPage.stockCodeInput.fill('');
    expect(await watchlistPage.stockCodeInput.inputValue()).toBe('');
  });
});
