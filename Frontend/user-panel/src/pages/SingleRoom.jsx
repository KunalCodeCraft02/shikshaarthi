
//frontend/user-panel/src/pages/SingleRoom.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import { toast } from 'sonner';
import tokenService from '../utils/tokenService';
import assets from "../assets/assets.js";
import './ServicePage.css'; // Import the shared CSS

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const SingleRoom = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImage, setSelectedImage] = useState('');

    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to view room details.");
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                await tokenService.ensureValidToken();
                const config = { headers: { Authorization: `Bearer ${tokenService.getToken()}` } };
                const response = await axios.get(`${API_URL}/api/rentals/${id}`, config);
                
                if (response.data.success) {
                    const room = response.data.data;
                    setRoomData(room);
                    setSelectedImage(room.imageUrls?.[0]?.url || assets.r1);
                } else {
                    setError('Failed to load room details');
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch room details.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens();
                    navigate('/login');
                } else if (err.response?.status === 404) {
                    setError('The room you are looking for does not exist.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchRoomDetails();
    }, [id, navigate]);

    const handleInterest = () => {
        if (roomData) {
            navigate('/rooms-order', { state: { roomData: {
                id: roomData._id, name: roomData.name, price: roomData.price,
                address: roomData.address, ownerName: roomData.holderName,
                ownerMobile: roomData.mobile, ownerEmail: roomData.email,
                district: roomData.district, state: roomData.state, pincode: roomData.pincode
            }}});
        }
    };

    if (loading) {
        return (
            <div className="services-page">
                <div className="loader-container">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !roomData) {
        return (
            <div className="services-page">
                <main className="services-content-area">
                    <div className="info-message">
                        <h4>{error}</h4>
                        <button className="view-offer-button" style={{marginTop: '2rem'}} onClick={() => navigate('/rooms')}>
                            Back to Rooms
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const images = roomData.imageUrls?.length > 0 
        ? roomData.imageUrls.map(img => img.url)
        : [assets.r1, assets.r2, assets.r3];

    return (
        <div className="services-page">
            <main className="services-content-area">
                <div className="single-room-container">
                    {/* Left Column: Image Gallery */}
                    <div className="image-gallery">
                        <img src={selectedImage} className="main-image" alt="Selected room view" />
                        <div className="thumbnail-gallery">
                            {images.map((img, index) => (
                                <img
                                    key={index}
                                    src={img}
                                    className={`thumbnail-image ${selectedImage === img ? 'active' : ''}`}
                                    alt={`Room thumbnail ${index + 1}`}
                                    onClick={() => setSelectedImage(img)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Room Details */}
                    <div className="room-details">
                        <h1 className="room-title">{roomData.name}</h1>
                        <p className="room-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {roomData.address}, {roomData.district}, {roomData.state} - {roomData.pincode}
                        </p>

                        <div className="price-display">
                            <span className="price-label">Price</span>
                            <p className="price">
                                ₹{roomData.price}
                                <span className="price-period">/ month</span>
                            </p>
                        </div>
                        
                        <div className="details-section">
                            <h3 className="section-title">Features</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span>Status</span>
                                    <strong>Available</strong>
                                </div>
                                {roomData.type && <div className="detail-item"><span>Type</span><strong>{roomData.type}</strong></div>}
                                {roomData.sharing && <div className="detail-item"><span>Sharing</span><strong>{roomData.sharing}</strong></div>}
                            </div>
                        </div>

                        {roomData.amenities &&
                            <div className="details-section">
                                <h3 className="section-title">Amenities</h3>
                                <p className="section-content">{roomData.amenities}</p>
                            </div>
                        }
                        
                        {roomData.rules &&
                            <div className="details-section">
                                <h3 className="section-title">Rules & Regulations</h3>
                                <p className="section-content">{roomData.rules}</p>
                            </div>
                        }

                        <button onClick={handleInterest} className="action-button">
                            I'm Interested <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleRoom;