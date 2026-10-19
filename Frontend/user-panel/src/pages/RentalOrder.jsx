// frontend/user-panel/src/pages/RentalOrder.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import './ServicePage.css';
import axios from "axios";
import tokenService from "../utils/tokenService";

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const RentalOrder = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const roomData = location.state?.roomData;

    const [interestSubmitted, setInterestSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(true); // Start in a loading state
    const [submitError, setSubmitError] = useState(null);

    const submitInterest = useCallback(async (abortController) => {
        if (!roomData?.id || !tokenService.isAuthenticated()) {
            setSubmitError("Could not record interest due to missing information.");
            setIsSubmitting(false);
            return;
        }
        
        // Ensure state is correct for a new attempt (e.g., retry)
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await tokenService.ensureValidToken();
            const config = {
                headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                signal: abortController.signal,
                timeout: 15000,
            };
            
            console.log(`🚀 Submitting interest for rental: ${roomData.id}`);
            const response = await axios.post(
                `${API_URL}/api/rentals/${roomData.id}/interest`,
                {},
                config
            );

            console.log("✅ Interest submission successful:", response.data);
            setInterestSubmitted(true);

        } catch (error) {
            // =======================================================================
            // THE FIX: Ignore cancellation errors caused by React Strict Mode
            // This prevents the temporary error message from flashing on the screen.
            // =======================================================================
            if (axios.isCancel(error) || error.name === 'CanceledError') {
                console.log("⏹️ Request was cancelled. This is expected in Strict Mode. Ignoring.");
                return; // Do nothing, let the second request succeed.
            }

            console.error("❌ Interest submission failed:", error);
            const message = error.response?.data?.message || "An error occurred. Your interest may not have been recorded.";
            
            if (error.response?.status === 409 || error.response?.data?.data?.alreadyExists) {
                console.log("ℹ️ Interest already exists (detected from error), marking as success.");
                setInterestSubmitted(true);
            } else {
                setSubmitError(message);
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsSubmitting(false);
            }
        }
    }, [roomData?.id]);

    useEffect(() => {
        const abortController = new AbortController();
        submitInterest(abortController);
        return () => {
            abortController.abort();
        };
    }, [submitInterest]);

    const handleRetryInterest = () => {
        if (isSubmitting) return;
        const retryAbortController = new AbortController();
        submitInterest(retryAbortController);
    };

    if (!roomData) {
        // ... (this part is fine, no changes needed)
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>No Room Information Found</h4>
                        <button className="view-offer-button" onClick={() => navigate('/rooms')}>
                            Browse Rooms
                        </button>
                    </div>
                </main>
            </div>
        );
    }
    
    const handleCall = () => { if (roomData.ownerMobile) window.location.href = `tel:${roomData.ownerMobile}`; };
    const handleEmail = () => { if (roomData.ownerEmail) window.location.href = `mailto:${roomData.ownerEmail}`; };
    const handleWhatsApp = () => {
        if (roomData.ownerMobile) {
            const cleanNumber = roomData.ownerMobile.replace(/\D/g, '');
            const message = encodeURIComponent(`Hello, I am interested in your room "${roomData.name}". I found the listing on Shikshaarthi.`);
            window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
        }
    };

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="formal-contact-container">
                    <div className="formal-contact-card">
                        <h2 className="card-title-formal">Owner Contact Information</h2>
                        
                        <div className="interest-status-container">
                             {/* Show loading indicator ONLY if no success or error */}
                            {isSubmitting && !interestSubmitted && !submitError && (
                                <div className="status-message info">📝 Recording your interest...</div>
                            )}
                            
                            {interestSubmitted && (
                                <div className="status-message success">✅ Interest recorded! Admin has been notified.</div>
                            )}
                            
                            {submitError && (
                                <div className="status-message error">
                                    <span>⚠️ {submitError}</span>
                                    <button onClick={handleRetryInterest} disabled={isSubmitting} className="retry-button">
                                        {isSubmitting ? 'Retrying...' : 'Retry'}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <p className="card-intro-text">Please use the details below to contact the owner directly.</p>
                        
                        <div className="contact-details-wrapper">
                            <div className="contact-detail-item"><span>Name</span><strong>{roomData.ownerName}</strong></div>
                            <div className="contact-detail-item"><span>Mobile</span><strong>{roomData.ownerMobile}</strong></div>
                            {roomData.ownerEmail && (<div className="contact-detail-item"><span>Email</span><strong>{roomData.ownerEmail}</strong></div>)}
                        </div>
                        
                        <div className="action-button-group">
                            <button onClick={handleCall} className="contact-btn primary"><i className="fas fa-phone"></i> Call Now</button>
                            <button onClick={handleWhatsApp} className="contact-btn secondary"><i className="fab fa-whatsapp"></i> WhatsApp</button>
                            {roomData.ownerEmail && (<button onClick={handleEmail} className="contact-btn secondary"><i className="fas fa-envelope"></i> Email</button>)}
                        </div>
                    </div>
                    
                    <div className="text-center mt-4">
                        <button onClick={() => navigate('/rooms')} className="back-to-rooms-btn"><i className="fas fa-arrow-left"></i> Back to All Rooms</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RentalOrder;