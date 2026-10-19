import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css';

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const MessCard = ({ mess }) => (
    <div className="room-card">
        <div className="image-wrapper">
            <img
                className="room-image"
                src={mess.imageUrls && mess.imageUrls.length > 0 ? mess.imageUrls[0].url : assets.event4}
                alt={mess.name}
            />
        </div>
        <div className="card-body">
            <h5 className="card-title">{mess.name}</h5>
            
            {/* ====================== TIMING DISPLAY ADDED ====================== */}
            <div className="detail-item mb-3">
                <span className="price-label">
                    <i className="fas fa-clock" style={{ marginRight: '5px' }}></i> Timings
                </span>
                <strong>{mess.timing || 'Not available'}</strong>
            </div>
            {/* ================================================================= */}

            <div className="details-container">
                <div>
                    <span className="price-label">Starts at</span>
                    <p className="price">
                        {mess.price}
                    </p>
                </div>
                <Link to={`/mess/${mess._id}`} className="view-offer-button">
                    View Details <i className="fas fa-arrow-right button-icon"></i>
                </Link>
            </div>
        </div>
    </div>
);

const Mess = () => {
    const [messes, setMesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(5);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMesses = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby messes.");
                setLoading(false);
                navigate('/login');
                return;
            }
            setLoading(true);
            setError('');
            setMesses([]);
            try {
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                const response = await axios.get(`${API_URL}/api/mess/nearby`, config);
                setMesses(response.data.data);

                if (response.data.data.length === 0) {
                    setError(`No messes found within ${searchRadius}km. Try expanding your search.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch available messes.";
                setError(message);
                toast.error(message);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    tokenService.clearTokens();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchMesses();
    }, [navigate, searchRadius]);

    const renderContent = () => {
        if (loading) {
            return <div className="loader-container"><div className="spinner"></div></div>;
        }
        if (error || messes.length === 0) {
            return <div className="info-message">{error || 'No available messes match your search criteria.'}</div>;
        }
        return (
            <div className="grid-container">
                {messes.map(mess => <MessCard key={mess._id} mess={mess} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header" style={{backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.9), rgba(18, 18, 18, 0.7)), url(${assets.event5})`}}>
                <h1 className="page-title">Fuel Your Success</h1>
                <p className="lead-text">Explore wholesome and delicious mess options located conveniently near you.</p>
                <div className="header-controls">
                    {[2, 5, 10].map(radius => (
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

export default Mess;