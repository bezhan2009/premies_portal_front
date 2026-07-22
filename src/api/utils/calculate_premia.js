export function calculateTotalPremia(worker) {
    const safeArray = (arr) => Array.isArray(arr) ? arr : [];

    const card_sales = safeArray(worker.CardSales)[0] || {};
    const turnover = safeArray(worker.CardTurnovers)[0] || {};
    const service = safeArray(worker.ServiceQuality)[0] || {};
    const mobile_bank = safeArray(worker.MobileBank)[0] || {};

    const basePremia =
        (mobile_bank.mobile_bank_connects * 10 || 0) +
        (turnover.card_turnovers_prem || 0) +
        (turnover.active_cards_perms || 0) +
        (card_sales.cards_prem || 0) +
        (worker.salary_project || 0);

    const callCenter = service.call_center === 0 ? 0 : service.call_center;
    let callPercent = 0;

    if (callCenter >= 0 && callCenter <= 1) {
        callPercent = -30;
    } else if (callCenter > 1 && callCenter <= 3) {
        callPercent = -20;
    } else if (callCenter > 3 && callCenter <= 5) {
        callPercent = -10;
    } else if (callCenter > 5 && callCenter <= 7) {
        callPercent = 0;
    } else if (callCenter > 7 && callCenter <= 9) {
        callPercent = 10;
    } else if (callCenter > 9 && callCenter <= 10) {
        callPercent = 20;
    }

    const tests = service.tests === 0 ? 0 : service.tests;
    let testPercent = 0;

    if (tests >= 0 && tests <= 2) {
        testPercent = -10;
    } else if (tests > 2 && tests <= 4) {
        testPercent = -5;
    } else if (tests > 4 && tests <= 6) {
        testPercent = 0;
    } else if (tests > 6 && tests <= 8) {
        testPercent = 5;
    } else if (tests > 8 && tests <= 9) {
        testPercent = 10;
    } else if (tests > 9 && tests <= 10) {
        testPercent = 15;
    }

    const totalCoef = (callPercent + testPercent) / 100;
    const calculatedPremia = basePremia * (1 + totalCoef);

    // Получаем максимально допустимую премию (1.5 от оклада)
    const maxAllowedPremia = worker.Salary * 1.5;

    // Возвращаем меньшую из двух величин: рассчитанную премию или максимально допустимую
    return Math.min(calculatedPremia, maxAllowedPremia);
}
