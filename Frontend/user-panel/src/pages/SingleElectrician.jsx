import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Reusing the shared CSS file

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SingleElectrician = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [electricianData, setElectricianData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchElectricianDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };
                const response = await axios.get(`${API_URL}/api/electrician/${id}`, config);

                if (response.data.success) {
                    const electrician = response.data.data;
                    setElectricianData(electrician);
                    setSelectedImage(electrician.imageUrls?.[0]?.url || assets.e1);
                } else {
                    setError('Failed to load electrician details');
                    toast.error('Failed to load electrician details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 404) {
                    setError('The electrician you are looking for does not exist or is not verified.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchElectricianDetails();
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container"><div className="spinner"></div></div>
            </div>
        );
    }

    if (error || !electricianData) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/electrician')}>
                            Back to Electricians
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const images = electricianData.imageUrls?.length > 0
        ? electricianData.imageUrls.map(img => img.url)
        : [assets.e1, assets.e2, assets.e3];

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container">
                    {/* Image Gallery */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected electrician view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Electrician thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="room-details">
                        <h1 className="room-title">{electricianData.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {electricianData.address}, {electricianData.district} - {electricianData.pincode}
                        </p>

                        <div className="price-display">
                            <span className="price-label">Contact</span>
                            <p className="price">{electricianData.mobile}</p>
                        </div>

                        <div className="details-section">
                            <h3 className="section-title">Details</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span>Specialization</span>
                                    <strong>{electricianData.specialization || 'General Work'}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Experience</span>
                                    <strong>{electricianData.experience} years</strong>
                                </div>
                            </div>
                        </div>

                        {electricianData.location?.coordinates && (
                            <div className="details-section">
                                <h3 className="section-title">Location on Map</h3>
                                <iframe
                                    title="Electrician Location"
                                    src={`https://www.google.com/maps?q=${electricianData.location.coordinates[1]},${electricianData.location.coordinates[0]}&output=embed`}
                                    width="100%"
                                    height="250"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}

                        <a href={`tel:${electricianData.mobile}`} className="action-button">
                            Call Now <i className="fas fa-phone"></i>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleElectrician;