import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Assuming a shared CSS file for styling

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SingleMedical = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [medicalService, setMedicalService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchMedicalServiceDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view medical service details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };
                const response = await axios.get(`${API_URL}/api/medical/${id}`, config);

                if (response.data.success) {
                    const service = response.data.data;
                    setMedicalService(service);
                    setSelectedImage(service.imageUrls?.[0]?.url || assets.medical);
                } else {
                    setError('Failed to load medical service details');
                    toast.error('Failed to load medical service details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch medical service details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 404) {
                    setError('The medical service you are looking for does not exist.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMedicalServiceDetails();
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container"><div className="spinner"></div></div>
            </div>
        );
    }

    if (error || !medicalService) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/medical')}>
                            Back to Medical Services
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const images = medicalService.imageUrls?.length > 0
        ? medicalService.imageUrls.map(img => img.url)
        : [assets.medical, assets.medical2, assets.medical3];

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container">
                    {/* Left Column: Image Gallery & Map */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected service view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Medical service thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                        <div className="details-section" style={{marginTop: '2rem'}}>
                            <h3 className="section-title">Location on Map</h3>
                            {medicalService.location?.coordinates ? (
                                <iframe
                                    title="Service Location"
                                    src={`https://www.google.com/maps?q=${medicalService.location.coordinates[1]},${medicalService.location.coordinates[0]}&output=embed`}
                                    width="100%"
                                    height="300"
                                    className="rounded border shadow-sm"
                                    style={{ border: "1px solid #ddd" }}
                                    allowFullScreen=""
                                    loading="lazy"
                                ></iframe>
                            ) : (
                                <div className="info-message">Map data not available.</div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Service Details */}
                    <div className="room-details">
                        <h1 className="room-title">{medicalService.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {medicalService.address}, {medicalService.district}, {medicalService.pincode}
                        </p>

                        <div className="details-section">
                            <h3 className="section-title">Key Information</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span><i className="fas fa-pills"></i> Type</span>
                                    <strong>{medicalService.type}</strong>
                                </div>
                                {medicalService.specialization && (
                                    <div className="detail-item">
                                        <span><i className="fas fa-stethoscope"></i> Specialization</span>
                                        <strong>{medicalService.specialization}</strong>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span><i className="fas fa-phone"></i> Mobile</span>
                                    <strong>{medicalService.mobile}</strong>
                                </div>
                                {medicalService.operatingHours && (
                                    <div className="detail-item">
                                        <span><i className="fas fa-clock"></i> Hours</span>
                                        <strong>{medicalService.operatingHours.open} - {medicalService.operatingHours.close}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {medicalService.services && (
                            <div className="details-section">
                                <h3 className="section-title">Services Offered</h3>
                                <p className="section-content">{medicalService.services}</p>
                            </div>
                        )}

                        <button onClick={() => navigate('/medical')} className="action-button">
                            <i className="fas fa-arrow-left"></i> Back to Services
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleMedical;