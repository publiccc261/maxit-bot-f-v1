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
      // Botswana: 9-10 digits
      const limitedDigits = digitsOnly.slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: limitedDigits }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = (e) => {
    e.preventDefault();

    const phone = formData.phoneNumber;

    // Validate: 9-10 digits, starting with 7 or 8
    if (
      (phone.length !== 9 && phone.length !== 10) ||
      (phone[0] !== '7' && phone[0] !== '8')
    ) {
      alert('Please enter a valid 9 or 10-digit Botswana mobile number starting with 7 or 8.');
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
                  placeholder="712345678"
                  className="form-input"
                  style={{ flex: 1 }}
                  minLength="9"
                  maxLength="10"
                  required
                />
              </div>
              <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                Enter 9 or 10 digits starting with 7 or 8 (e.g., 712345678)
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
        © 2025 Max It Botswana
      </footer>
    </div>
  );
}