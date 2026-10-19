import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Reusing the shared CSS file

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SinglePlumber = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plumberData, setPlumberData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchPlumberDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view plumber details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };

                // Fetch plumber data from the API
                const response = await axios.get(`${API_URL}/api/plumber/${id}`, config);

                if (response.data.success) {
                    const plumber = response.data.data;
                    setPlumberData(plumber);
                    // Set the default selected image or a placeholder
                    setSelectedImage(plumber.imageUrls?.[0]?.url || assets.pl1);
                } else {
                    setError('Failed to load plumber details');
                    toast.error('Failed to load plumber details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch plumber details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens();
                    navigate('/login');
                } else if (err.response?.status === 404) {
                    setError('The plumber you are looking for does not exist or is not verified.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPlumberDetails();
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !plumberData) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/plumber')}>
                            Back to Plumbers
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Use dynamic images from plumberData or fall back to placeholders
    const images = plumberData.imageUrls?.length > 0
        ? plumberData.imageUrls.map(img => img.url)
        : [assets.pl1, assets.pl2, assets.pl3];


    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container"> {/* Reusing the same class for layout consistency */}
                    {/* Left Column: Image Gallery */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected plumber view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Plumber thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Plumber Details */}
                    <div className="room-details"> {/* Reusing class name */}
                        <h1 className="room-title">{plumberData.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {plumberData.address}, {plumberData.district}, {plumberData.state} - {plumberData.pincode}
                        </p>

                        <div className="price-display">
                            <span className="price-label">Contact</span>
                            <p className="price">
                                {plumberData.mobile}
                            </p>
                        </div>

                        <div className="details-section">
                            <h3 className="section-title">Details</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span>Specialization</span>
                                    <strong>{plumberData.specialization || 'General Plumbing'}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Experience</span>
                                    <strong>{plumberData.experience} years</strong>
                                </div>
                            </div>
                        </div>

                        {plumberData.location?.coordinates && (
                            <div className="details-section">
                                <h3 className="section-title">Location</h3>
                                <iframe
                                    title="Plumber Location"
                                    src={`https://www.google.com/maps?q=${plumberData.location.coordinates[1]},${plumberData.location.coordinates[0]}&output=embed`}
                                    width="100%"
                                    height="250"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}

                        <a href={`tel:${plumberData.mobile}`} className="action-button">
                            Call Now <i className="fas fa-phone"></i>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SinglePlumber;