import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ErrorBoundary } from "./ErrorBoundary";

const backendUrl = import.meta.env.VITE_API_GATEWAY_URL;

const OTPVerification = ({ email, tempUserId, onSuccess, onBack, type = "registration" }) => {
  const [otp, setOtp] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(120); // 2 minutes initial cooldown
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState({
    verifying: false,
    resending: false
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions to proceed");
      return;
    }

    setLoading(prev => ({ ...prev, verifying: true }));

    try {
      const response = await axios.post(`${backendUrl}/api/auth/verify-otp`, {
        tempUserId,
        otp: otp.trim(),
        type
      });

      if (response.data.success) {
        onSuccess(response.data.token, response.data.user);
      }

    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || "Verification failed";
      
      toast.error(errorMessage);
      
      // Update attempts left if provided
      if (errorData?.attemptsLeft !== undefined) {
        setOtpAttempts(errorData.attemptsLeft);
        
        if (errorData.attemptsLeft === 0) {
          toast.error("Too many failed attempts. Please start again.");
          setTimeout(() => {
            onBack();
          }, 2000);
        }
      }
    } finally {
      setLoading(prev => ({ ...prev, verifying: false }));
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(prev => ({ ...prev, resending: true }));

    try {
      await axios.post(`${backendUrl}/api/auth/resend-otp`, {
        email,
        tempUserId,
        type
      });

      toast.success("Verification code sent again!");
      setResendCooldown(60); // 1 minute cooldown for resend
      setOtp(""); // Clear current OTP
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to resend verification code";
      toast.error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, resending: false }));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TermsModal = () => (
    <div className={`modal ${showTerms ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Terms and Conditions</h5>
            <button type="button" className="btn-close" onClick={() => setShowTerms(false)}></button>
          </div>
          <div className="modal-body">
            <div className="terms-content">
              <h6 className="fw-bold mb-3">Service Usage Agreement</h6>
              
              <p className="small text-muted mb-2">
                1. We access your email for OTP verification purposes only.
              </p>
              <p className="small text-muted mb-2">
                2. Gallery access is permitted for Supercoin feature image uploads only.
              </p>
              <p className="small text-muted mb-3">
                3. User-provided data is processed voluntarily; we are not responsible for complications arising from its utilization.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowTerms(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="container min-vh-100 d-flex align-items-center justify-content-center py-4">
        <div className="card shadow-lg p-4" style={{ maxWidth: "500px", width: "100%" }}>
          <div className="text-center mb-4">
            <div className="mb-3">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-circle" 
                   style={{ width: "80px", height: "80px" }}>
                <i className="fas fa-envelope text-white" style={{ fontSize: "2rem" }}></i>
              </div>
            </div>
            <h2 className="text-primary mb-3">Verify Your Email</h2>
            <p className="text-muted">
              We've sent a 6-digit verification code to<br />
              <strong className="text-dark">{email}</strong>
            </p>
            <small className="text-muted">
              Check your inbox and spam folder
            </small>
          </div>

          <form onSubmit={handleVerifyOTP}>
            <div className="form-floating mb-3">
              <input
                type="text"
                className="form-control text-center fw-bold"
                id="otp"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                style={{ 
                  letterSpacing: "0.5em", 
                  fontSize: "1.5rem",
                  height: "60px"
                }}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <label htmlFor="otp">Verification Code</label>
            </div>

            <div className="text-center mb-3">
              <small className="text-muted">
                Attempts remaining: 
                <span className={`fw-bold ms-1 ${otpAttempts <= 1 ? 'text-danger' : 'text-warning'}`}>
                  {otpAttempts}
                </span>
              </small>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="acceptTerms">
                I agree to the{" "}
                <button
                  type="button"
                  className="btn btn-link p-0 text-primary"
                  style={{ fontSize: "inherit", textDecoration: "underline" }}
                  onClick={() => setShowTerms(true)}
                >
                  Terms and Conditions
                </button>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mb-3 py-3"
              disabled={loading.verifying || !otp || otp.length !== 6 || !acceptedTerms}
              style={{ fontSize: "1.1rem", fontWeight: "600" }}
            >
              {loading.verifying ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Verifying...
                </>
              ) : (
                `Verify ${type === 'registration' ? '& Complete Registration' : 'Code'}`
              )}
            </button>

            <div className="text-center mb-3">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading.resending}
                style={{ textDecoration: resendCooldown > 0 ? 'none' : 'underline' }}
              >
                {loading.resending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${formatTime(resendCooldown)}`
                ) : (
                  "Resend Code"
                )}
              </button>
            </div>
            
            <div className="text-center">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onBack}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back to Form
              </button>
            </div>
          </form>

          <div className="text-center mt-4">
            <small className="text-muted">
              Didn't receive the code? Check your spam folder or try resending.
            </small>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal />
    </ErrorBoundary>
  );
};

export default OTPVerification;