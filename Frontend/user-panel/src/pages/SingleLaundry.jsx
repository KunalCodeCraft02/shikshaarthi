import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Reusing the shared CSS file

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SingleLaundry = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [laundryData, setLaundryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchLaundryDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view service details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };

                const response = await axios.get(`${API_URL}/api/laundry/${id}`, config);

                if (response.data.success) {
                    const laundry = response.data.data;
                    setLaundryData(laundry);
                    setSelectedImage(laundry.imageUrls?.[0]?.url || assets.l1);
                } else {
                    setError('Failed to load laundry service details');
                    toast.error('Failed to load laundry service details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch service details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens();
                    navigate('/login');
                } else if (err.response?.status === 404) {
                    setError('The laundry service you are looking for does not exist or is not verified.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchLaundryDetails();
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container"><div className="spinner"></div></div>
            </div>
        );
    }

    if (error || !laundryData) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/laundry')}>
                            Back to Laundry Services
                        </button>
                    </div>
                </main>
            </div>
        );
    }
    
    const images = laundryData.imageUrls?.length > 0
        ? laundryData.imageUrls.map(img => img.url)
        : [assets.l1, assets.l2, assets.l3];

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container">
                    {/* Left Column: Image Gallery */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected laundry view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Laundry thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="room-details">
                        <h1 className="room-title">{laundryData.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {laundryData.address}, {laundryData.district} - {laundryData.pincode}
                        </p>

                        <div className="price-display">
                            <span className="price-label">Contact</span>
                            <p className="price">
                                {laundryData.mobile}
                            </p>
                        </div>

                        <div className="details-section">
                            <h3 className="section-title">Pricing & Terms</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span>Cost per Kg</span>
                                    <strong>₹{laundryData.costPerKg?.toFixed(2)}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Ironing Service</span>
                                    <strong>{laundryData.ironing ? 'Available' : 'Not Available'}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Return Time</span>
                                    <strong>{laundryData.returnDays || 'N/A'} days</strong>
                                </div>
                                 <div className="detail-item">
                                    <span>Laundry Type</span>
                                    <strong>{laundryData.laundryType || 'Regular'}</strong>
                                </div>
                            </div>
                        </div>

                        {laundryData.location?.coordinates && (
                            <div className="details-section">
                                <h3 className="section-title">Location</h3>
                                <iframe
                                    title="Laundry Location"
                                    src={`https://www.google.com/maps?q=${laundryData.location.coordinates[1]},${laundryData.location.coordinates[0]}&output=embed`}
                                    width="100%"
                                    height="250"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}

                        <a href={`tel:${laundryData.mobile}`} className="action-button">
                            Call Now <i className="fas fa-phone"></i>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleLaundry;