
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import tokenService from "../utils/tokenService";

// NOTE: It is best practice to move these two imports to your main entry file (e.g., src/main.jsx)
// so they are loaded only once for the entire application.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL;

const Navbar = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();

  const navbarCollapseRef = useRef(null); // Ref for the collapsible menu

  // --- Functions for closing the menu and handling navigation ---

  const handleLinkClick = () => {
    // Check if the navbar collapse element exists and is currently open
    if (navbarCollapseRef.current && navbarCollapseRef.current.classList.contains('show')) {
      // Use Bootstrap's JS API to programmatically hide the menu
      const bsCollapse = new window.bootstrap.Collapse(navbarCollapseRef.current, {
        toggle: false
      });
      bsCollapse.hide();
    }
  };

  const handleNavClick = (path, label) => {
    handleLinkClick(); // Close the menu
    toast.info(`Navigating to ${label}...`);
    // Navigation will be handled by the <Link> component itself
  };

  // --- Authentication and State Management ---

  const initializeAuth = async () => {
    try {
      setAuthChecking(true);
      const authResult = await tokenService.getAuthWithCache();
      if (authResult.success && authResult.user) {
        setIsAuthenticated(true);
        setUserInfo(authResult.user);
        if (!tokenService.healthCheck().autoRefreshActive) {
          tokenService.startAutoRefresh();
        }
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
        if (authResult.error === 'Invalid refresh token' || authResult.error === 'Token validation failed') {
          tokenService.clearTokens();
        }
      }
    } catch (error) {
      console.error("Navbar: Auth initialization failed:", error);
      setIsAuthenticated(false);
      setUserInfo(null);
    } finally {
      setAuthChecking(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized]);

  // Effect for handling auth changes, storage events, and periodic checks
  useEffect(() => {
    if (!isInitialized) return;

    const handleAuthChange = (event) => {
        const { isAuthenticated: newAuthState, user } = event.detail;
        setIsAuthenticated(newAuthState);
        setUserInfo(user);
    };
    
    const handleStorageChange = (e) => {
        if (e.key === tokenService.tokenKey || e.key === tokenService.cacheKey) {
            initializeAuth(); // Re-check auth if token changes in another tab
        }
    };

    window.addEventListener("authStateChanged", handleAuthChange);
    window.addEventListener("storage", handleStorageChange);
    
    const intervalId = setInterval(() => {
        if(!document.hidden) initializeAuth();
    }, 180000); // 3 minutes

    return () => {
      window.removeEventListener("authStateChanged", handleAuthChange);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [isInitialized]);

  const dispatchAuthChange = (authStatus, userData = null) => {
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { isAuthenticated: authStatus, user: userData, timestamp: Date.now() }
    }));
  };

  const handleLogout = async () => {
    setLoading(true);
    setShowModal(false);
    const loadingToast = toast.loading("Logging you out...");

    try {
      const token = tokenService.getToken();
      if (backendUrl && token) {
        await axios.post(`${backendUrl}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(err => console.warn("Backend logout failed, proceeding.", err));
      }
    } finally {
      tokenService.clearTokens();
      tokenService.stopAutoRefresh();
      sessionStorage.clear();
      setIsAuthenticated(false);
      setUserInfo(null);
      dispatchAuthChange(false, null);
      setLoading(false);
      toast.success("Logged out successfully!", { id: loadingToast });
      setTimeout(() => navigate("/login", { replace: true }), 1000);
    }
  };

  const handleLoginClick = () => {
    toast.info("Redirecting to login page...");
    setTimeout(() => navigate("/login"), 500);
  };

  const handleSignupClick = () => {
    toast.info("Redirecting to sign up page...");
    setTimeout(() => navigate("/sign-up"), 500);
  };
  
  const handleProtectedLink = (e, path) => {
    handleLinkClick(); // Close menu
    e.preventDefault();
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', path);
      toast.info("Please log in to continue.");
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  const handleLogoutClick = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && closeModal();
    if (showModal) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  // Loading state UI
  if (authChecking) {
    return (
      <nav className="navbar navbar-expand-lg navbar-light py-4 bg-white shadow-sm">
        <div className="container">
          <Link to="/" className="navbar-brand">
            <h1 className="text-primary fw-bold mb-0">Shiksha<span className="text-dark">rthi</span></h1>
          </Link>
          <div className="d-flex align-items-center"><div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div><small className="text-muted">Checking session...</small></div>
        </div>
      </nav>
    );
  }

  // Main component render
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light py-4 bg-white shadow-sm">
        <div className="container">
          <Link to="/" className="navbar-brand" onClick={() => handleNavClick('/', 'Home')}>
            <h1 className="text-primary fw-bold mb-0">Shikshaa<span className="text-dark">rthi</span></h1>
          </Link>

          <button className="navbar-toggler py-2 px-3" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
            <span className="fa fa-bars text-primary"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarCollapse" ref={navbarCollapseRef}>
            <div className="navbar-nav mx-auto">
              <Link to="/" className="nav-item nav-link" onClick={() => handleNavClick('/', 'Home')}>Home</Link>
              <Link to="/about" className="nav-item nav-link" onClick={() => handleNavClick('/about', 'About')}>About</Link>
              <Link to="/services" className="nav-item nav-link" onClick={() => handleNavClick('/services', 'Services')}>Services</Link>
              <a href="/add" className="nav-item nav-link" onClick={(e) => handleProtectedLink(e, '/add')}>Super coins</a>
              <a href="/history" className="nav-item nav-link" onClick={(e) => handleProtectedLink(e, '/history')}>Submissions</a>
              {/* <a href="/upgrade" className="nav-item nav-link" onClick={(e) => handleProtectedLink(e, '/upgrade')}>Subscription</a> */}
              <a href="/account" className="nav-item nav-link" onClick={(e) => handleProtectedLink(e, '/account')}>My Account</a>
            </div>

            <div className="d-flex gap-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={handleSignupClick} className="btn btn-outline-primary py-2 px-4 d-none d-xl-inline-block rounded-pill">Sign Up</button>
                  <button onClick={handleLoginClick} className="btn btn-primary py-2 px-4 d-none d-xl-inline-block rounded-pill"><i className="fas fa-sign-in-alt me-1"></i>Login</button>
                </>
              ) : (
                <button onClick={handleLogoutClick} className="btn btn-primary py-2 px-4 d-none d-xl-inline-block rounded-pill" disabled={loading} title={`Logout ${userInfo?.email || ''}`}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : <i className="fas fa-sign-out-alt me-1"></i>}
                  Logout {userInfo?.firstName && `(${userInfo.firstName})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-2">
                <h5 className="modal-title fw-bold text-dark"><i className="bi bi-box-arrow-right me-2 text-warning"></i>Confirm Logout</h5>
                <button type="button" className="btn-close" onClick={closeModal} disabled={loading}></button>
              </div>
              <div className="modal-body py-4 text-center">
                <p className="mb-2 text-muted fs-6">Are you sure you want to logout?</p>
                {userInfo && <small className="text-muted d-block mb-2"><strong>Account:</strong> {userInfo.email || userInfo.fullName}</small>}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-secondary px-4 py-2" onClick={closeModal} disabled={loading}>Cancel</button>
                <button type="button" className="btn btn-danger px-4 py-2" onClick={handleLogout} disabled={loading}>
                  {loading ? 'Logging out...' : 'Yes, Logout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css" />
    </>
  );
};

export default Navbar;

