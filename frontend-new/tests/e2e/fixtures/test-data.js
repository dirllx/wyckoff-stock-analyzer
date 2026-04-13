export const testStocks = {
  valid: [
    { code: '000001', name: '平安银行' },
    { code: '688234', name: '凯盛科技' },
    { code: '600036', name: '招商银行' }
  ],
  invalid: [
    { code: '999999', reason: '不存在的代码' },
    { code: '000000', reason: '无效代码' }
  ]
};

export const testTimeframes = ['30', '60', 'daily', 'weekly', 'monthly'];
