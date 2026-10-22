// 注：dashboard 業務邏輯较多，此处不启用 // @ts-check（依赖外部 currency 模块的复杂返回类型）
/**
 * 儀表板统计 handler
 *
 * 改动：
 * - 使用者時區从 config.TIMEZONE 讀取（不再硬式寫死 'UTC'）
 * - schedulerStatus / schedulerStatusHistory 從新的 scheduler-logs.repo 取
 *   舊 'scheduler_status' / 'scheduler_status_history' 已淘汰（遷移時會清除）
 *
 */
import { getAllSubscriptions } from '../../data/subscriptions.js';
import {
  getDynamicRates,
  calculateMonthlyExpense,
  calculateYearlyExpense,
  getRecentPayments,
  getUpcomingRenewals,
  getExpenseByType,
  getExpenseByCategory
} from '../../core/currency.js';
import { getCurrentTimeInTimezone, MS_PER_DAY } from '../../core/time.js';
import * as schedulerLogsRepo from '../../data/scheduler-logs.repo.js';

async function handleDashboardStats(env, config) {
  try {
    const subscriptions = await getAllSubscriptions(env);
    const timezone = (config && config.TIMEZONE) || 'UTC';

    /** 本次：从结构化日志库读最新调度状态 */
    let schedulerStatus = null;
    let schedulerStatusHistory = [];
    try {
      const recent = await schedulerLogsRepo.getRecent(env, 10);
      schedulerStatusHistory = recent;
      // 相容舊版前端欄位：轉成扁平結構
      if (recent.length > 0) {
        const head = recent[0];
        schedulerStatus = {
          lastRunAt: head.startedAt,
          timezone: head.timezone,
          currentHour: head.currentHour,
          configuredHours: head.configuredHours,
          shouldNotifyThisHour: head.inWindow,
          checkedSubscriptions: head.checkedCount,
          activeSubscriptions: head.checkedCount,
          expiringMatched: head.matchedCount,
          dedupeSkipped: head.dedupedCount,
          updatedSubscriptions: head.autoRenewedCount,
          sent: head.sentCount > 0,
          reason: head.reason,
          status: head.status,
          extra: head.extra
        };
      }
    } catch (error) {
      console.error('讀取排程紀錄失敗:', error);
    }

    const rates = await getDynamicRates(env);
    const monthlyExpense = calculateMonthlyExpense(subscriptions, timezone, rates);
    const yearlyExpense = calculateYearlyExpense(subscriptions, timezone, rates);
    const recentPayments = getRecentPayments(subscriptions, timezone);
    const upcomingRenewals = getUpcomingRenewals(subscriptions, timezone);
    const expenseByType = getExpenseByType(subscriptions, timezone, rates);
    const expenseByCategory = getExpenseByCategory(subscriptions, timezone, rates);

    const activeSubscriptions = subscriptions.filter((s) => s.isActive);
    const now = getCurrentTimeInTimezone(timezone);
    const sevenDaysLater = new Date(now.getTime() + 7 * MS_PER_DAY);
    const expiringSoon = activeSubscriptions.filter((s) => {
      const expiryDate = new Date(s.expiryDate);
      return expiryDate >= now && expiryDate <= sevenDaysLater;
    }).length;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          monthlyExpense,
          yearlyExpense,
          activeSubscriptions: {
            active: activeSubscriptions.length,
            total: subscriptions.length,
            expiringSoon
          },
          recentPayments,
          upcomingRenewals,
          expenseByType,
          expenseByCategory,
          schedulerStatus,
          schedulerStatusHistory,
          /** 新增：使用者時區（前端可依此顯示） */
          timezone
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取儀表板统计失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: '取得統計資料失敗: ' + (error && error.message ? error.message : error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export { handleDashboardStats };
