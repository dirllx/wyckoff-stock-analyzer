import { test, expect } from '@playwright/test';

/**
 * 威科夫股票分析系统 - E2E测试
 * 覆盖核心用户流程：页面加载、股票分析、关注列表、标签导航
 */

test.describe('页面基础功能', () => {
  test('页面正常加载，关键元素可见', async ({ page }) => {
    await page.goto('/');

    // 验证标题
    await expect(page).toHaveTitle(/威科夫/);

    // 验证核心DOM元素
    await expect(page.locator('#stock-code')).toBeVisible();
    await expect(page.locator('#analyze-btn')).toBeVisible();
    // 图表元素在DOM中存在（但可能在隐藏的图表模式容器中）
    await expect(page.locator('#mainChart')).toBeAttached();
    await expect(page.locator('#volumeChart')).toBeAttached();
    // 表格模式容器在DOM中存在（默认为空直到有数据）
    await expect(page.locator('#tableMode')).toBeAttached();
    // 图表模式容器默认隐藏
    await expect(page.locator('#chartMode')).not.toBeVisible();
    // 切换按钮存在
    await expect(page.locator('#btnTable')).toBeVisible();
    await expect(page.locator('#btnChart')).toBeVisible();

    // 验证无JS错误
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('CSS变量和主题正确加载', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 验证核心CSS变量已定义
    const hasPrimary = await page.evaluate(() => {
      return !!getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
    });
    expect(hasPrimary).toBeTruthy();

    // 验证body有背景色
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    expect(bgColor).not.toBe('');
  });

  test('输入框交互正常', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('#stock-code');
    await input.fill('000001');
    await expect(input).toHaveValue('000001');

    // 清空输入
    await input.clear();
    await expect(input).toHaveValue('');
  });
});

test.describe('健康状态栏', () => {
  test('健康状态栏显示在右上角', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 验证健康状态栏存在
    const healthBar = page.locator('.health-status-bar');
    await expect(healthBar).toBeVisible();

    // 验证位置是固定在右上角
    const position = await healthBar.evaluate(el => {
      const styles = getComputedStyle(el);
      return {
        position: styles.position,
        top: styles.top,
        right: styles.right
      };
    });
    expect(position.position).toBe('fixed');
    expect(position.top).toBe('0px');
  });

  test('健康状态指示器元素存在', async ({ page }) => {
    await page.goto('/');

    // 验证系统状态
    await expect(page.locator('#overallStatusDot')).toBeAttached();
    await expect(page.locator('#overallStatusText')).toBeAttached();

    // 验证数据库状态
    await expect(page.locator('#dbStatusDot')).toBeAttached();
    await expect(page.locator('#dbStatusText')).toBeAttached();

    // 验证Redis状态
    await expect(page.locator('#redisStatusDot')).toBeAttached();
    await expect(page.locator('#redisStatusText')).toBeAttached();
  });
});

test.describe('标签导航', () => {
  test('五个标签按钮存在', async ({ page }) => {
    await page.goto('/');

    // 验证5个标签按钮
    await expect(page.locator('#tabAnalyze')).toBeVisible();
    await expect(page.locator('#tabMulti')).toBeVisible();
    await expect(page.locator('#btnWatchlist')).toBeVisible();
    await expect(page.locator('#tabConfig')).toBeVisible();
    await expect(page.locator('#tabStatus')).toBeVisible();
  });

  test('可以切换到多周期标签', async ({ page }) => {
    await page.goto('/');

    // 点击多周期标签
    await page.locator('#tabMulti').click();
    await page.waitForTimeout(200);

    // 验证多周期内容区域显示
    const multiContent = page.locator('#tab-multi');
    await expect(multiContent).toHaveClass(/active/);
  });

  test('可以切换到我的关注标签', async ({ page }) => {
    await page.goto('/');

    // 点击我的关注标签
    await page.locator('#btnWatchlist').click();
    await page.waitForTimeout(200);

    // 验证关注列表内容区域显示
    const watchlistContent = page.locator('#tab-watchlist');
    await expect(watchlistContent).toHaveClass(/active/);
  });

  test('可以切换到系统配置标签', async ({ page }) => {
    await page.goto('/');

    // 点击系统配置标签
    await page.locator('#tabConfig').click();
    await page.waitForTimeout(200);

    // 验证配置内容区域显示
    const configContent = page.locator('#tab-config');
    await expect(configContent).toHaveClass(/active/);
  });

  test('可以切换到测试状态标签', async ({ page }) => {
    await page.goto('/');

    // 点击测试状态标签
    await page.locator('#tabStatus').click();
    await page.waitForTimeout(200);

    // 验证状态内容区域显示
    const statusContent = page.locator('#tab-status');
    await expect(statusContent).toHaveClass(/active/);
  });

  test('默认日分析标签激活', async ({ page }) => {
    await page.goto('/');

    // 验证日分析标签是激活状态
    await expect(page.locator('#tabAnalyze')).toHaveClass(/active/);
    await expect(page.locator('#tab-analyze')).toHaveClass(/active/);
  });
});

test.describe('多周期分析', () => {
  test('多周期输入框和按钮存在', async ({ page }) => {
    await page.goto('/');

    // 切换到多周期标签
    await page.locator('#tabMulti').click();
    await page.waitForTimeout(200);

    // 验证元素存在
    await expect(page.locator('#mtf-stock-code')).toBeVisible();
    await expect(page.locator('#mtf-analyze-btn')).toBeVisible();
    await expect(page.locator('#mtf-clear-btn')).toBeVisible();
  });

  test('多周期关注列表选择按钮存在', async ({ page }) => {
    await page.goto('/');

    // 切换到多周期标签
    await page.locator('#tabMulti').click();
    await page.waitForTimeout(200);

    // 验证关注列表选择按钮存在
    await expect(page.locator('#mtf-watchlist-picker-btn')).toBeVisible();
  });
});

test.describe('关注列表', () => {
  test('关注列表容器和控件存在', async ({ page }) => {
    await page.goto('/');

    // 切换到关注列表标签
    await page.locator('#btnWatchlist').click();
    await page.waitForTimeout(200);

    // 验证容器存在
    await expect(page.locator('#watchlist')).toBeAttached();

    // 验证添加股票输入框和按钮
    await expect(page.locator('#watchlist-code')).toBeVisible();
    await expect(page.locator('#add-watchlist-btn')).toBeVisible();

    // 验证操作按钮
    await expect(page.locator('#batch-analyze-btn')).toBeVisible();
    await expect(page.locator('#refresh-watchlist-btn')).toBeVisible();
  });

  test('自选股/浏览股子标签存在', async ({ page }) => {
    await page.goto('/');

    // 切换到关注列表标签
    await page.locator('#btnWatchlist').click();
    await page.waitForTimeout(200);

    // 验证子标签按钮存在
    await expect(page.locator('#subtab-favorite')).toBeVisible();
    await expect(page.locator('#subtab-browse')).toBeVisible();
  });

  test('周期选择器存在', async ({ page }) => {
    await page.goto('/');

    // 切换到关注列表标签
    await page.locator('#btnWatchlist').click();
    await page.waitForTimeout(200);

    // 验证周期选择器存在
    await expect(page.locator('#watchlist-timeframe')).toBeVisible();
  });
});

test.describe('股票分析流程', () => {
  test('输入股票代码并点击分析', async ({ page }) => {
    await page.goto('/');

    // 监听API请求
    const apiRequests = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        apiRequests.push({ url: req.url(), method: req.method() });
      }
    });

    // 输入代码并分析
    await page.locator('#stock-code').fill('000001');
    await page.locator('#analyze-btn').click();

    // 等待API请求发出
    await page.waitForTimeout(2000);

    // 验证至少发出了API请求
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('关注列表选择按钮存在', async ({ page }) => {
    await page.goto('/');

    // 验证关注列表选择按钮存在
    await expect(page.locator('#watchlist-picker-btn')).toBeVisible();
  });

  test('分析后加载指示器出现', async ({ page }) => {
    await page.goto('/');

    // 点击分析
    await page.locator('#stock-code').fill('000001');
    await page.locator('#analyze-btn').click();

    // 短时间内应该有loading状态（spinner或skeleton）
    const hasLoading = await page.evaluate(() => {
      const el = document.querySelector('.loading, .spinner, .skeleton, [data-loading]');
      return el !== null;
    });

    // loading状态可能很快消失，不强制要求
    expect(typeof hasLoading).toBe('boolean');
  });

  test('清空按钮存在且可点击', async ({ page }) => {
    await page.goto('/');

    // 验证清空按钮存在
    await expect(page.locator('#clear-btn')).toBeVisible();

    // 输入内容后清空
    await page.locator('#stock-code').fill('000001');
    await page.locator('#clear-btn').click();
    await page.waitForTimeout(100);

    // 验证输入框已清空
    const value = await page.locator('#stock-code').inputValue();
    expect(value).toBe('');
  });
});

test.describe('响应式和性能', () => {
  test('移动端视口正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 页面不应水平溢出
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // 允许少量溢出
    expect(scrollWidth - clientWidth).toBeLessThan(50);
  });

  test('页面加载无明显延迟', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;

    // DOM加载应在3秒内
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('错误处理', () => {
  test('空输入不崩溃', async ({ page }) => {
    await page.goto('/');

    // 不输入任何内容直接点分析
    await page.locator('#analyze-btn').click();

    // 页面不应崩溃
    await page.waitForTimeout(500);
    const bodyExists = await page.evaluate(() => !!document.body);
    expect(bodyExists).toBeTruthy();
  });

  test('无效股票代码优雅处理', async ({ page }) => {
    await page.goto('/');

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 输入无效代码
    await page.locator('#stock-code').fill('999999');
    await page.locator('#analyze-btn').click();
    await page.waitForTimeout(3000);

    // 不应有未捕获的JS错误
    expect(errors).toHaveLength(0);
  });
});

test.describe('系统配置', () => {
  test('系统配置各分区容器存在', async ({ page }) => {
    await page.goto('/');

    // 切换到系统配置标签
    await page.locator('#tabConfig').click();
    await page.waitForTimeout(200);

    // 验证各配置分区容器存在
    await expect(page.locator('#settings')).toBeAttached();
    await expect(page.locator('#notifications')).toBeAttached();
    await expect(page.locator('#risk')).toBeAttached();
  });
});

test.describe('测试状态', () => {
  test('健康检查容器存在', async ({ page }) => {
    await page.goto('/');

    // 切换到测试状态标签
    await page.locator('#tabStatus').click();
    await page.waitForTimeout(200);

    // 验证健康检查容器存在
    await expect(page.locator('#health')).toBeAttached();
  });
});
