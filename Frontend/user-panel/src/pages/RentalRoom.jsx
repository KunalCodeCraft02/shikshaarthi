import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css'; // Import the shared CSS

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const RoomCard = ({ room }) => (
    <div className="room-card">
        <div className="image-wrapper">
            <img
                className="room-image"
                src={room.imageUrls && room.imageUrls.length > 0 ? room.imageUrls[0].url : assets.r1}
                alt={room.name}
            />
        </div>
        <div className="card-body">
            <h5 className="card-title">{room.name}</h5>
            <div className="details-container">
                <div>
                    <span className="price-label">From</span>
                    {/* --- UPDATED PRICE DISPLAY --- */}
                    <p className="price">
                        ₹{room.price}
                        <span className="price-period">/ month</span>
                    </p>
                </div>
                <a href={`/rooms/${room._id}`} className="view-offer-button">
                    View Offer <i className="fas fa-arrow-right button-icon"></i>
                </a>
            </div>
        </div>
    </div>
);

const RentalRoom = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(2);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRooms = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby rooms.");
                setLoading(false); navigate('/login'); return;
            }
            setLoading(true); setError(''); setRooms([]);
            try {
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                const response = await axios.get(`${API_URL}/api/rentals/nearby`, config);
                setRooms(response.data.data);
                if (response.data.data.length === 0) {
                    setError(`No rooms found within ${searchRadius}km. Try expanding your search.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch available rooms.";
                setError(message); toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens(); navigate('/login');
                }
            } finally { setLoading(false); }
        };
        fetchRooms();
    }, [navigate, searchRadius]);
    
    const renderContent = () => {
        if (loading) {
            return <div className="loader-container"><div className="spinner"></div></div>;
        }
        if (error || rooms.length === 0) {
            return <div className="info-message">{error || 'No available rooms match your search criteria.'}</div>;
        }
        return (
            <div className="grid-container">
                {rooms.map(room => <RoomCard key={room._id} room={room} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header">
                <h1 className="page-title">Find Your Sanctuary</h1>
                <p className="lead-text">Discover curated rooms near your campus, designed for focus and comfort.</p>
                <div className="header-controls">
                    {[2, 5].map(radius => (
                        <button
                            key={radius}
                            className={`radius-btn ${searchRadius === radius ? 'active' : ''}`}
                            onClick={() => setSearchRadius(radius)}
                            disabled={loading}
                        >
                            {radius} km
                        </button>
                    ))}
                </div>
            </header>
            <main className="services-content-area">
                {renderContent()}
            </main>
        </div>
    );
};

export default RentalRoom;