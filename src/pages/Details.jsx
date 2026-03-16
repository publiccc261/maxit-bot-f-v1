import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Details.css';

export default function Details() {
  const navigate = useNavigate();
  
  const { personalDetailsData, updatePersonalDetailsData } = useLoanApplication();
  
  const [formData, setFormData] = useState({
    firstName: personalDetailsData.firstName || '',
    lastName: personalDetailsData.lastName || '',
    email: personalDetailsData.email || '',
    phoneNumber: personalDetailsData.phoneNumber || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '');
      // Max 9 digits (0XXXXXXXX format)
      const limitedDigits = digitsOnly.slice(0, 9);
      setFormData(prev => ({ ...prev, [name]: limitedDigits }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Valid Botswana formats:
  //   8 digits NOT starting with 0  (e.g. 71234567)
  //   9 digits starting with 0      (e.g. 071234567)
  const validatePhone = (phone) => {
    if (phone.length === 8 && phone[0] !== '0') return true;
    if (phone.length === 9 && phone[0] === '0') return true;
    return false;
  };

  const handleNext = (e) => {
    e.preventDefault();

    const phone = formData.phoneNumber;

    if (!validatePhone(phone)) {
      alert(
        'Please enter a valid Botswana mobile number:\n' +
        '• 8 digits without leading 0 (e.g. 71234567)\n' +
        '• 9 digits with leading 0 (e.g. 071234567)'
      );
      return;
    }
    
    updatePersonalDetailsData(formData);
    navigate('/summary');
  };

  const handlePrevious = () => {
    updatePersonalDetailsData(formData);
    navigate(-1);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="app-container">
      
      <header className="header">
        <button className="back-btn" onClick={handleBack}>← Back</button>
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

      <main className="main-content">
        <div className="container">
          
          <h1 className="form-title">Loan Application</h1>
          <p className="form-subtitle">Step 2 of 3</p>

          <div className="progress-indicator">
            <div className="progress-dot active"></div>
            <div className="progress-dot active"></div>
            <div className="progress-dot"></div>
          </div>

          <form onSubmit={handleNext}>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input 
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Kabo"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Molefe"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="kabo.molefe@example.com"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}>
                  🇧🇼 +267
                </div>
                <input 
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="71234567"
                  className="form-input"
                  style={{ flex: 1 }}
                  minLength="8"
                  maxLength="9"
                  required
                />
              </div>
              <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                8 digits without 0 (e.g. 71234567) or 9 digits with 0 (e.g. 071234567)
              </small>
            </div>

            <div className="button-container">
              <button type="button" className="previous-btn" onClick={handlePrevious}>
                PREVIOUS
              </button>
              <button type="submit" className="next-btn">
                NEXT STEP
              </button>
            </div>
          </form>

        </div>
      </main>

      <footer className="footer">
        © 2026 Max It Botswana
      </footer>
    </div>
  );
}