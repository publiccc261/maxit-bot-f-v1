import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './LoanCalculator.css';

export default function LoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(1000);
  const [loanTerm, setLoanTerm] = useState(12);
  const navigate = useNavigate();
  
  // Get context functionsf
  const { updateCalculatorData, updateLoanApplicationData } = useLoanApplication();

  // Calculate monthly payment (simple interest formula)
  const calculateMonthlyPayment = () => {
    const interestRate = 0.08; // 8% annual interest
    const monthlyRate = interestRate / 12;
    const payment = (loanAmount * (1 + monthlyRate * loanTerm)) / loanTerm;
    return payment.toFixed(0);
  };
  
  const handleApplyNow = () => {
    // Save calculator data to context
    updateCalculatorData({
      loanAmount,
      loanTerm,
      monthlyPayment: calculateMonthlyPayment()
    });
    
    // Pre-fill loan application form with calculator values
    updateLoanApplicationData({
      loanAmount: loanAmount.toString(),
      loanTerm: `${loanTerm} Months`
    });
    
    navigate('/loan-application');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-max">Max</span>
          <span className="logo-it">It</span>
        </div>
        <button className="menu-btn" aria-label="Menu">
          <div className="menu-line"></div>
          <div className="menu-line"></div>
          <div className="menu-line"></div>
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          <h1 className="title">Get Your Loan Approved Fast</h1>
          <p className="subtitle">Quick approval • Competitive rates • Flexible terms</p>

          {/* Loan Calculator */}
          <div className="calculator">
            <h2 className="calculator-title">Loan Calculator</h2>
            
            {/* Loan Amount Slider */}
            <div className="input-group">
              <div className="input-header">
                <span className="input-label">Loan Amount</span>
                <span className="input-value">BWP {loanAmount.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="800" 
                max="80000" 
                step="200"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="slider"
              />
              <div className="range-labels">
                <span>BWP 800</span>
                <span>BWP 80,000</span>
              </div>
            </div>

            {/* Loan Term Slider */}
            <div className="input-group">
              <div className="input-header">
                <span className="input-label">Loan Term</span>
                <span className="input-value">{loanTerm} months</span>
              </div>
              <input 
                type="range" 
                min="6" 
                max="60" 
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
                className="slider"
              />
              <div className="range-labels">
                <span>6 months</span>
                <span>60 months</span>
              </div>
            </div>

            {/* Monthly Payment Display */}
            <div className="payment-box">
              <span className="payment-label">Monthly Payment</span>
              <span className="payment-amount">BWP {Number(calculateMonthlyPayment()).toLocaleString()}</span>
            </div>
          </div>

          {/* Apply Button */}
          <button className="apply-btn" onClick={handleApplyNow}>APPLY NOW</button>

          {/* Features */}
          <div className="features">
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Fast Approval</div>
              <div className="feature-subtitle">Within 24 hours</div>
            </div>
            <div className="feature">
              <div className="feature-icon">💰</div>
              <div className="feature-title">Low Rates</div>
              <div className="feature-subtitle">From 8%</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <div className="feature-title">Secure</div>
              <div className="feature-subtitle">Bank-level</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        © 2026 Max It Botswana
      </footer>
    </div>
  );
}
