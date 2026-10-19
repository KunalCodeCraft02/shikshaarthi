import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';

const backendUrl = import.meta.env.VITE_API_GATEWAY_URL;
const VITE_RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const Upgrade = () => {
    const [subscriptionDetails, setSubscriptionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const auth = await tokenService.getAuthWithCache();
                if (!auth.success || !auth.user) {
                    toast.error("You must be logged in to upgrade.");
                    navigate('/login');
                    return;
                }
                setUser(auth.user);

                const authHeader = tokenService.getAuthHeader();
                if (!authHeader) {
                    toast.error("Authentication failed. Please login again.");
                    navigate('/login');
                    return;
                }

                const config = { headers: { Authorization: authHeader } };
                const { data } = await axios.get(`${backendUrl}/api/auth/subscription/details`, config);
                
                if (data.isSubscribed) {
                    toast.info("You already have an active subscription!");
                    navigate('/');
                } else {
                    setSubscriptionDetails(data);
                }
            } catch (err) {
                console.error("Error fetching subscription details:", err);
                
                if (err.response?.status === 401) {
                    toast.error("Session expired. Please login again.");
                    tokenService.clearTokens();
                    navigate('/login');
                    return;
                }
                
                const errorMessage = err.response?.data?.message || "Could not load subscription details.";
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [navigate]);

    const handlePayment = async () => {
        if (!subscriptionDetails) return;

        if (!acceptedTerms) {
            toast.error("Please accept the Terms and Conditions to proceed.");
            return;
        }

        const loadingToast = toast.loading("Initializing secure payment...");

        try {
            const tokenValidation = await tokenService.ensureValidToken();
            if (!tokenValidation.success) {
                toast.error("Authentication failed. Please login again.", { id: loadingToast });
                navigate('/login');
                return;
            }

            const authHeader = tokenService.getAuthHeader();
            const config = { headers: { Authorization: authHeader } };
            
            const { data } = await axios.post(`${backendUrl}/api/auth/subscription/create-order`, {
                finalPrice: subscriptionDetails.finalPrice,
                rewardId: subscriptionDetails.discount.rewardId
            }, config);

            toast.dismiss(loadingToast);

            const options = {
                key: VITE_RAZORPAY_KEY_ID,
                amount: data.order.amount,
                currency: data.order.currency,
                name: "Shikshaarthi",
                description: "Annual Subscription",
                image: assets.logo,
                order_id: data.order.id,
                handler: async function (response) {
                    const verificationToast = toast.loading("Verifying payment... Please wait.");
                    try {
                        const authValidation = await tokenService.ensureValidToken();
                        if (!authValidation.success) {
                            toast.error("Session expired during payment. Please contact support.", { id: verificationToast });
                            return;
                        }

                        const verifyAuthHeader = tokenService.getAuthHeader();
                        const verifyConfig = { headers: { Authorization: verifyAuthHeader } };

                        const verifyResponse = await axios.post(`${backendUrl}/api/auth/subscription/verify-payment`, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            rewardId: subscriptionDetails.discount.rewardId
                        }, verifyConfig);

                        if (verifyResponse.data.success) {
                            toast.success("Payment successful! Welcome aboard!", { id: verificationToast });
                            
                            const updatedUser = { ...user, subscription: verifyResponse.data.subscription };
                            const currentToken = tokenService.getToken();
                            const currentRefreshToken = tokenService.getRefreshToken();
                            
                            tokenService.setTokens(currentToken, updatedUser, currentRefreshToken);
                            
                            navigate('/');
                        } else {
                            throw new Error("Payment verification failed.");
                        }

                    } catch (verifyError) {
                        console.error("Payment verification error:", verifyError);
                        
                        if (verifyError.response?.status === 401) {
                            toast.error("Session expired. Payment may have succeeded - please check your account.", { id: verificationToast });
                            tokenService.clearTokens();
                            navigate('/login');
                        } else {
                            toast.error("Payment verification failed. Please contact support.", { id: verificationToast });
                        }
                    }
                },
                prefill: {
                    name: user.fullName,
                    email: user.email,
                    contact: user.contact,
                },
                theme: {
                    color: "#d4a762"
                },
                modal: {
                    ondismiss: function() {
                        toast.info("Payment cancelled");
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(`Payment failed: ${response.error.description}`);
            });
            
            rzp.open();
            
        } catch (paymentError) {
            console.error("Payment initialization error:", paymentError);
            
            if (paymentError.response?.status === 401) {
                toast.error("Session expired. Please login again.", { id: loadingToast });
                tokenService.clearTokens();
                navigate('/login');
            } else {
                const errorMsg = paymentError.response?.data?.message || "Failed to start payment. Please try again.";
                toast.error(errorMsg, { id: loadingToast });
            }
        }
    };

    useEffect(() => {
        const handleAuthChange = (event) => {
            if (!event.detail.isAuthenticated) {
                toast.error("Session expired. Please login again.");
                navigate('/login');
            }
        };

        window.addEventListener('authStateChanged', handleAuthChange);

        return () => {
            window.removeEventListener('authStateChanged', handleAuthChange);
        };
    }, [navigate]);

    const services = [
        {
            icon: 'fas fa-utensils',
            title: 'Mess Services',
            description: 'Switch messes weekly, view menus, pay conveniently'
        },
        {
            icon: 'fas fa-home',
            title: 'Rental Rooms',
            description: 'Find hostels & PG accommodations near colleges'
        },
        {
            icon: 'fas fa-tools',
            title: 'Household Services',
            description: 'Plumbers, electricians, cleaners at your doorstep'
        },
        {
            icon: 'fas fa-medkit',
            title: 'Medical Services',
            description: 'Nearby medical shops, hospitals & emergency care'
        },
        {
            icon: 'fas fa-book',
            title: 'Pre-Owned Stationary',
            description: 'Buy/sell second-hand books & study materials'
        },
        {
            icon: 'fas fa-star',
            title: 'Premium Support',
            description: '24/7 customer support & priority assistance'
        }
    ];
    
    if (loading) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="text-center">
                    <div className="spinner-border" style={{ color: '#d4a762', width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3" style={{ color: '#333' }}>Loading subscription details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="text-center p-4">
                    <i className="fas fa-exclamation-triangle fa-3x mb-3" style={{ color: '#d4a762' }}></i>
                    <h4 style={{ color: '#333' }}>Oops! Something went wrong</h4>
                    <p className="text-muted mb-4">{error}</p>
                    <button 
                        className="btn px-4 py-2"
                        style={{ backgroundColor: '#d4a762', color: 'white', border: 'none', borderRadius: '25px' }}
                        onClick={() => window.location.reload()}
                    >
                        <i className="fas fa-redo me-2"></i>Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!subscriptionDetails) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="text-center p-4">
                    <i className="fas fa-info-circle fa-3x mb-3" style={{ color: '#d4a762' }}></i>
                    <h4 style={{ color: '#333' }}>No subscription details available</h4>
                    <button 
                        className="btn mt-3 px-4 py-2"
                        style={{ backgroundColor: '#333', color: '#d4a762', border: '1px solid #d4a762', borderRadius: '25px' }}
                        onClick={() => navigate('/')}
                    >
                        <i className="fas fa-arrow-left me-2"></i>Go Home
                    </button>
                </div>
            </div>
        );
    }

    // Calculate transaction charges (2% of base price)
    const transactionCharges = subscriptionDetails.basePrice * 0.02;
    const subtotal = subscriptionDetails.basePrice + transactionCharges;
    const finalAmountAfterDiscount = subtotal - subscriptionDetails.discount.amount;

    return (
        <>
            <Toaster richColors position="top-right" />
            <div className="min-vh-100 py-3 py-md-5" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
                <div className="container-fluid px-3 px-md-4">
                    <div className="row justify-content-center">
                        <div className="col-12 col-xl-11 col-xxl-10">
                            {/* Header Section */}
                            <div className="text-center mb-4 mb-md-5">
                                <img 
                                    src={assets.logo} 
                                    alt="Shikshaarthi Logo" 
                                    className="img-fluid mb-3"
                                    style={{ width: '80px', maxWidth: '100px' }} 
                                />
                                <h1 className="display-6 display-md-5 fw-bold mb-3" style={{ color: '#333', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                                    Unlock Premium <span style={{ color: '#d4a762' }}>Shikshaarthi</span>
                                </h1>
                                <p className="lead text-muted mb-0 px-2" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)' }}>
                                    Your complete hostel life management platform - Everything you need in one place
                                </p>
                            </div>

                            <div className="row g-3 g-md-4">
                                {/* Services Section */}
                                <div className="col-12 col-lg-8">
                                    <div className="card shadow-sm h-100" style={{ border: 'none', borderRadius: '15px' }}>
                                        <div className="card-header text-center py-3 py-md-4" style={{ backgroundColor: '#333', borderRadius: '15px 15px 0 0', border: 'none' }}>
                                            <h3 className="mb-0 fw-bold h4 h-md-3" style={{ color: '#d4a762', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>
                                                <i className="fas fa-crown me-2"></i>Premium Services Included
                                            </h3>
                                        </div>
                                        <div className="card-body p-3 p-md-4">
                                            <div className="row g-3 g-md-4">
                                                {services.map((service, index) => (
                                                    <div key={index} className="col-12 col-sm-6">
                                                        <div className="d-flex align-items-start">
                                                            <div className="flex-shrink-0 me-3">
                                                                <div className="rounded-circle d-flex align-items-center justify-content-center" 
                                                                     style={{ 
                                                                         width: '45px', 
                                                                         height: '45px', 
                                                                         backgroundColor: '#d4a762', 
                                                                         color: 'white',
                                                                         fontSize: '0.9rem'
                                                                     }}>
                                                                    <i className={service.icon}></i>
                                                                </div>
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h6 className="fw-bold mb-1" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                                    {service.title}
                                                                </h6>
                                                                <p className="text-muted mb-0" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>
                                                                    {service.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Why Choose Us Section */}
                                            <div className="mt-4 mt-md-5 pt-3 pt-md-4" style={{ borderTop: '2px solid #f8f9fa' }}>
                                                <h5 className="fw-bold mb-3 mb-md-4 text-center" style={{ color: '#333', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                                                    Why Choose Shikshaarthi Premium?
                                                </h5>
                                                <div className="row g-3">
                                                    <div className="col-12 col-sm-4 text-center">
                                                        <i className="fas fa-clock fa-2x mb-2" style={{ color: '#d4a762' }}></i>
                                                        <h6 className="fw-bold" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>24/7 Availability</h6>
                                                        <small className="text-muted">Round the clock service access</small>
                                                    </div>
                                                    <div className="col-12 col-sm-4 text-center">
                                                        <i className="fas fa-shield-alt fa-2x mb-2" style={{ color: '#d4a762' }}></i>
                                                        <h6 className="fw-bold" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>Verified Providers</h6>
                                                        <small className="text-muted">All service providers are verified</small>
                                                    </div>
                                                    <div className="col-12 col-sm-4 text-center">
                                                        <i className="fas fa-mobile-alt fa-2x mb-2" style={{ color: '#d4a762' }}></i>
                                                        <h6 className="fw-bold" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>Easy Booking</h6>
                                                        <small className="text-muted">Book services with just a few taps</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Section */}
                                <div className="col-12 col-lg-4">
                                    <div className="card shadow-lg h-100" style={{ border: 'none', borderRadius: '15px' }}>
                                        <div className="card-header text-center py-3 py-md-4" style={{ backgroundColor: '#d4a762', borderRadius: '15px 15px 0 0', border: 'none' }}>
                                            <h4 className="mb-0 fw-bold text-white h5 h-md-4" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>
                                                <i className="fas fa-gem me-2"></i>Premium Plan
                                            </h4>
                                            <p className="mb-0 text-white opacity-75" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>One Year Full Access</p>
                                        </div>
                                        <div className="card-body p-3 p-md-4 text-center">
                                            {/* Pricing Details */}
                                            <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>Base Price:</span>
                                                    <span className="fw-bold" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                        ₹{subscriptionDetails.basePrice.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                                                        Transaction Charges (2%):
                                                    </span>
                                                    <span className="fw-bold" style={{ color: '#333', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                        ₹{transactionCharges.toFixed(2)}
                                                    </span>
                                                </div>
                                                {subscriptionDetails.discount.percentage > 0 && (
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="text-muted" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                                                            Your Discount ({subscriptionDetails.discount.percentage}%):
                                                        </span>
                                                        <span className="fw-bold" style={{ color: '#d4a762', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                                                            - ₹{subscriptionDetails.discount.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <hr className="my-3" />
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="fw-bold" style={{ color: '#333', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>Total:</span>
                                                    <span className="fw-bold" style={{ color: '#d4a762', fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)' }}>
                                                        ₹{finalAmountAfterDiscount.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Features List */}
                                            <ul className="list-unstyled mb-4 text-start">
                                                <li className="mb-2 d-flex align-items-start">
                                                    <i className="fas fa-check-circle me-2 mt-1 flex-shrink-0" style={{ color: '#d4a762' }}></i>
                                                    <small style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>Access to All 6 Premium Services</small>
                                                </li>
                                                <li className="mb-2 d-flex align-items-start">
                                                    <i className="fas fa-check-circle me-2 mt-1 flex-shrink-0" style={{ color: '#d4a762' }}></i>
                                                    <small style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>Priority Customer Support</small>
                                                </li>
                                                <li className="mb-2 d-flex align-items-start">
                                                    <i className="fas fa-check-circle me-2 mt-1 flex-shrink-0" style={{ color: '#d4a762' }}></i>
                                                    <small style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>Exclusive Discounts & Offers</small>
                                                </li>
                                                <li className="mb-2 d-flex align-items-start">
                                                    <i className="fas fa-check-circle me-2 mt-1 flex-shrink-0" style={{ color: '#d4a762' }}></i>
                                                    <small style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>Advanced Booking Features</small>
                                                </li>
                                                <li className="mb-2 d-flex align-items-start">
                                                    <i className="fas fa-check-circle me-2 mt-1 flex-shrink-0" style={{ color: '#d4a762' }}></i>
                                                    <small style={{ fontSize: 'clamp(0.8rem, 2vw, 0.875rem)' }}>One Year Unlimited Access</small>
                                                </li>
                                            </ul>

                                            {/* Terms and Conditions Checkbox */}
                                            <div className="mb-4 text-start">
                                                <div className="form-check">
                                                    <input 
                                                        className="form-check-input" 
                                                        type="checkbox" 
                                                        id="termsCheck"
                                                        checked={acceptedTerms}
                                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                        style={{ 
                                                            borderColor: '#d4a762',
                                                            backgroundColor: acceptedTerms ? '#d4a762' : 'white'
                                                        }}
                                                    />
                                                    <label className="form-check-label" htmlFor="termsCheck" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                                        I agree to the{' '}
                                                        <strong style={{ color: '#d4a762' }}>Terms and Conditions</strong>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Terms and Conditions Box */}
                                            <div className="mb-4 p-3 text-start" style={{ 
                                                backgroundColor: '#fff3e0', 
                                                borderRadius: '8px', 
                                                border: '1px solid #d4a762' 
                                            }}>
                                                <h6 className="fw-bold mb-2" style={{ color: '#d4a762', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                                                    <i className="fas fa-exclamation-circle me-2"></i>Important Terms
                                                </h6>
                                                <ul className="mb-0 ps-3" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.825rem)', color: '#666' }}>
                                                    <li className="mb-1">
                                                        <strong>No Refunds:</strong> All subscription payments are non-refundable after successful payment processing.
                                                    </li>
                                                    <li className="mb-0">
                                                        <strong>No Cancellation:</strong> Subscription cancellation is not allowed once the payment is completed.
                                                    </li>
                                                </ul>
                                            </div>

                                            {/* Payment Button */}
                                            <button 
                                                className="btn w-100 py-3 fw-bold mb-3" 
                                                onClick={handlePayment} 
                                                style={{ 
                                                    backgroundColor: acceptedTerms ? '#333' : '#ccc', 
                                                    color: acceptedTerms ? '#d4a762' : '#999', 
                                                    border: acceptedTerms ? '2px solid #d4a762' : '2px solid #ccc', 
                                                    borderRadius: '12px',
                                                    transition: 'all 0.3s ease',
                                                    fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                                                    cursor: acceptedTerms ? 'pointer' : 'not-allowed'
                                                }}
                                                disabled={!subscriptionDetails || !acceptedTerms}
                                                onMouseOver={(e) => {
                                                    if (acceptedTerms) {
                                                        e.target.style.backgroundColor = '#d4a762';
                                                        e.target.style.color = 'white';
                                                    }
                                                }}
                                                onMouseOut={(e) => {
                                                    if (acceptedTerms) {
                                                        e.target.style.backgroundColor = '#333';
                                                        e.target.style.color = '#d4a762';
                                                    }
                                                }}
                                            >
                                                <i className="fas fa-credit-card me-2"></i> 
                                                Pay Now & Upgrade
                                            </button>

                                            {/* Security Badge */}
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="fas fa-lock me-2" style={{ color: '#d4a762' }}></i>
                                                <small className="text-muted" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>Secure payment via Razorpay</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Testimonial Section */}
                            <div className="row mt-4 mt-md-5">
                                <div className="col-12">
                                    <div className="card shadow-sm" style={{ border: 'none', borderRadius: '15px', backgroundColor: '#333' }}>
                                        <div className="card-body p-3 p-md-4 text-center">
                                            <h5 className="fw-bold mb-3" style={{ color: '#d4a762', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                                                Join 10,000+ Happy Students
                                            </h5>
                                            <p className="text-white mb-0 opacity-75 px-2" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>
                                                "Shikshaarthi has made my hostel life so much easier. From finding the best mess 
                                                to getting quick household repairs, everything is just a tap away!"
                                            </p>
                                            <div className="mt-3">
                                                <div className="d-flex justify-content-center">
                                                    {[1,2,3,4,5].map((star) => (
                                                        <i key={star} className="fas fa-star me-1" style={{ color: '#d4a762' }}></i>
                                                    ))}
                                                </div>
                                                <small style={{ color: '#d4a762', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>- Verified Student Review</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Upgrade;