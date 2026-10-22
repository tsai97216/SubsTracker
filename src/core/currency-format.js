// @ts-check
/**
 * 貨幣格式化共用工具
 *
 * 早期版本曾在不同程式路徑（新增表單／清單／通知內容／歷史紀錄／第三方觸發）
 * 重複定義 currencySymbols，偶爾預設回退至 ¥（CNY 符號），造成幣別與顯示不一致。
 *
 * 統一使用本模組：
 *   formatAmount(123.45, 'USD')   → '$123.45'
 *   formatAmount(123.45, 'JPY')   → 'JP¥123.45'   （JPY 与 CNY 同符号但加前缀以避免歧义）
 *   formatAmount(null, 'USD')     → ''
 *
 */

/**
 * 幣別 → 符號（前綴）對照表。
 * JPY 刻意使用 'JP¥' 前缀避免與 CNY 的 ¥ 混淆。
 */
export const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  HKD: 'HK$',
  TWD: 'NT$',
  JPY: 'JP¥',
  EUR: '€',
  GBP: '£',
  KRW: '₩',
  TRY: '₺'
};

/**
 * 取得幣別符號；若幣別未知，則回退為幣別代碼。
 *
 * @param {string} [currency='TWD']
 * @returns {string}
 */
export function getCurrencySymbol(currency = 'TWD') {
  const code = String(currency || 'TWD').toUpperCase();
  return CURRENCY_SYMBOLS[code] || code + ' ';
}

/**
 * 格式化金額字串；amount 為空時回傳空字串。
 *
 * @param {number|string|null|undefined} amount
 * @param {string} [currency='CNY']
 * @param {{ withDecimal?: boolean }} [opts]
 * @returns {string}
 */
export function formatAmount(amount, currency = 'CNY', opts = {}) {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  if (Number.isNaN(n)) return '';
  const sym = getCurrencySymbol(currency);
  const fixed = opts.withDecimal === false ? String(Math.round(n)) : n.toFixed(2);
  return sym + fixed;
}
