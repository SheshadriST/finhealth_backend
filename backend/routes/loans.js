const express = require('express');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { simulationLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Loan eligibility & simulation
router.post('/simulate', auth, simulationLimiter, async (req, res) => {
  try {
    const { loanAmount, loanType, tenure, interestRate } = req.body;
    const user = req.user;

    // Get last 3 months financial data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const [incomeData, expenseData] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: user._id, type: 'income', date: { $gte: threeMonthsAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: user._id, type: 'expense', date: { $gte: threeMonthsAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const avgMonthlyIncome = incomeData[0] ? incomeData[0].total / 3 : user.monthlyIncome;
    const avgMonthlyExpense = expenseData[0] ? expenseData[0].total / 3 : 0;
    const netMonthlyIncome = avgMonthlyIncome - avgMonthlyExpense;
    const creditScore = user.creditScore || 650;
    const employmentStatus = user.employmentStatus;

    // EMI Calculation
    const monthlyRate = interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - loanAmount;

    // Eligibility scoring
    let eligibilityScore = 0;
    const factors = [];

    // 1. Credit Score (30 points)
    if (creditScore >= 750) { eligibilityScore += 30; factors.push({ factor: 'Credit Score', score: 30, max: 30, detail: `Excellent credit score (${creditScore})`, status: 'excellent' }); }
    else if (creditScore >= 700) { eligibilityScore += 22; factors.push({ factor: 'Credit Score', score: 22, max: 30, detail: `Good credit score (${creditScore})`, status: 'good' }); }
    else if (creditScore >= 650) { eligibilityScore += 15; factors.push({ factor: 'Credit Score', score: 15, max: 30, detail: `Fair credit score (${creditScore})`, status: 'fair' }); }
    else { eligibilityScore += 5; factors.push({ factor: 'Credit Score', score: 5, max: 30, detail: `Low credit score (${creditScore}). Improve to 700+`, status: 'poor' }); }

    // 2. Income vs EMI ratio (35 points)
    const emiToIncomeRatio = (emi / avgMonthlyIncome) * 100;
    if (emiToIncomeRatio <= 30) { eligibilityScore += 35; factors.push({ factor: 'EMI-to-Income Ratio', score: 35, max: 35, detail: `EMI is ${emiToIncomeRatio.toFixed(1)}% of income (ideal ≤30%)`, status: 'excellent' }); }
    else if (emiToIncomeRatio <= 40) { eligibilityScore += 25; factors.push({ factor: 'EMI-to-Income Ratio', score: 25, max: 35, detail: `EMI is ${emiToIncomeRatio.toFixed(1)}% of income (acceptable ≤40%)`, status: 'good' }); }
    else if (emiToIncomeRatio <= 50) { eligibilityScore += 12; factors.push({ factor: 'EMI-to-Income Ratio', score: 12, max: 35, detail: `EMI is ${emiToIncomeRatio.toFixed(1)}% of income (risky, ≤50%)`, status: 'fair' }); }
    else { eligibilityScore += 0; factors.push({ factor: 'EMI-to-Income Ratio', score: 0, max: 35, detail: `EMI (${emiToIncomeRatio.toFixed(1)}%) too high relative to income`, status: 'poor' }); }

    // 3. Employment Status (20 points)
    if (employmentStatus === 'employed') { eligibilityScore += 20; factors.push({ factor: 'Employment', score: 20, max: 20, detail: 'Salaried employment', status: 'excellent' }); }
    else if (employmentStatus === 'self-employed') { eligibilityScore += 14; factors.push({ factor: 'Employment', score: 14, max: 20, detail: 'Self-employed (additional docs may be required)', status: 'good' }); }
    else if (employmentStatus === 'retired') { eligibilityScore += 10; factors.push({ factor: 'Employment', score: 10, max: 20, detail: 'Retired (pension income considered)', status: 'fair' }); }
    else { eligibilityScore += 2; factors.push({ factor: 'Employment', score: 2, max: 20, detail: 'Unemployment reduces eligibility significantly', status: 'poor' }); }

    // 4. Savings buffer (15 points)
    const savingsRatio = netMonthlyIncome / avgMonthlyIncome;
    if (savingsRatio >= 0.3) { eligibilityScore += 15; factors.push({ factor: 'Savings Buffer', score: 15, max: 15, detail: `Saving ${(savingsRatio * 100).toFixed(0)}% of income`, status: 'excellent' }); }
    else if (savingsRatio >= 0.15) { eligibilityScore += 10; factors.push({ factor: 'Savings Buffer', score: 10, max: 15, detail: `Saving ${(savingsRatio * 100).toFixed(0)}% of income`, status: 'good' }); }
    else if (savingsRatio > 0) { eligibilityScore += 5; factors.push({ factor: 'Savings Buffer', score: 5, max: 15, detail: `Saving only ${(savingsRatio * 100).toFixed(0)}% of income`, status: 'fair' }); }
    else { eligibilityScore += 0; factors.push({ factor: 'Savings Buffer', score: 0, max: 15, detail: 'Expenses exceed income — high risk', status: 'poor' }); }

    // Determine eligibility
    let eligibilityStatus, recommendation;
    if (eligibilityScore >= 75) { eligibilityStatus = 'highly_likely'; recommendation = 'You are highly likely to be approved. Banks will offer competitive rates.'; }
    else if (eligibilityScore >= 55) { eligibilityStatus = 'likely'; recommendation = 'Good chances of approval. Compare rates across multiple lenders.'; }
    else if (eligibilityScore >= 35) { eligibilityStatus = 'possible'; recommendation = 'Possible but may face higher interest rates or collateral requirements.'; }
    else { eligibilityStatus = 'unlikely'; recommendation = 'Loan approval is unlikely. Focus on improving credit score and reducing expenses first.'; }

    // Max eligible loan amount
    const maxAffordableEMI = avgMonthlyIncome * 0.4;
    const maxLoanAmount = maxAffordableEMI * (Math.pow(1 + monthlyRate, tenure) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, tenure));

    // Amortization schedule (first 6 months)
    const schedule = [];
    let balance = loanAmount;
    for (let i = 1; i <= Math.min(6, tenure); i++) {
      const interest = balance * monthlyRate;
      const principal = emi - interest;
      balance -= principal;
      schedule.push({ month: i, emi: Math.round(emi), principal: Math.round(principal), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
    }

    res.json({
      eligible: eligibilityScore,
      eligibilityStatus,
      recommendation,
      factors,
      loanDetails: {
        amount: loanAmount, tenure, interestRate, loanType,
        emi: Math.round(emi), totalPayment: Math.round(totalPayment), totalInterest: Math.round(totalInterest)
      },
      financialSnapshot: {
        avgMonthlyIncome: Math.round(avgMonthlyIncome),
        avgMonthlyExpense: Math.round(avgMonthlyExpense),
        netMonthlyIncome: Math.round(netMonthlyIncome),
        emiToIncomeRatio: emiToIncomeRatio.toFixed(1),
        creditScore,
        maxEligibleLoan: Math.round(maxLoanAmount)
      },
      amortizationSchedule: schedule
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
