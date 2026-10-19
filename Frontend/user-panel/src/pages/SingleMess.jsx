import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Using the same shared CSS file

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SingleMess = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [messData, setMessData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchMessDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view mess details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };
                
                // Fetch mess data from the correct endpoint
                const response = await axios.get(`${API_URL}/api/mess/${id}`, config);
                
                if (response.data.success) {
                    const mess = response.data.data;
                    setMessData(mess);
                    // Set the default selected image or a placeholder
                    setSelectedImage(mess.imageUrls?.[0]?.url || assets.event4);
                } else {
                    setError('Failed to load mess details');
                    toast.error('Failed to load mess details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch mess details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens();
                    navigate('/login');
                } else if (err.response?.status === 404) {
                    setError('The mess you are looking for does not exist.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMessDetails();
        }
    }, [id, navigate]);

    // const handleExpressInterest = async () => {
    //     if (!messData) return;

    //     try {
    //         await tokenService.ensureValidToken();
    //         const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };
    //         const response = await axios.post(`${API_URL}/api/mess/${messData._id}/interest`, {}, config);

    //         if (response.data.success) {
    //             toast.success(response.data.message || "Your interest has been recorded!");
    //         } else {
    //             toast.error(response.data.message || "Could not record your interest.");
    //         }
    //     } catch (err) {
    //         const message = err.response?.data?.message || "An error occurred while showing interest.";
    //         toast.error(message);
    //     }
    // };

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !messData) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/mess')}>
                            Back to Messes
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Use dynamic images from messData or fall back to placeholders
    const images = messData.imageUrls?.length > 0 
        ? messData.imageUrls.map(img => img.url)
        : [assets.event4, assets.event5, assets.event3];

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container"> {/* Reusing the same class for layout consistency */}
                    {/* Left Column: Image Gallery */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected mess view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Mess thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Mess Details */}
                    <div className="room-details"> {/* Reusing class name */}
                        <h1 className="room-title">{messData.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {messData.address}, {messData.district}, {messData.state} - {messData.pincode}
                        </p>

                        <div className="price-display">
                            <span className="price-label">Price</span>
                            <p className="price">
                                {messData.price}
                            </p>
                        </div>
                        
                        <div className="details-section">
                            <h3 className="section-title">Details</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span>Type</span>
                                    <strong>{messData.messType}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Timings</span>
                                    <strong>{messData.timing || 'Not specified'}</strong>
                                </div>
                            </div>
                        </div>

                        {messData.description &&
                            <div className="details-section">
                                <h3 className="section-title">Description</h3>
                                <p className="section-content">{messData.description}</p>
                            </div>
                        }
                        
                        {messData.location?.coordinates && (
                            <div className="details-section">
                                <h3 className="section-title">Location</h3>
                                <iframe
                                    title="Mess Location"
                                    src={`https://www.google.com/maps?q=${messData.location.coordinates[1]},${messData.location.coordinates[0]}&output=embed`}
                                    width="100%"
                                    height="250"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}

                        {/* <button onClick={handleExpressInterest} className="action-button">
                            Express Interest <i className="fas fa-heart"></i>
                        </button> */}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleMess;