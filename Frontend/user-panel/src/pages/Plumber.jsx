import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom'; // Ensure Link is imported
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css'; // Re-use the same stylesheet

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

// ====================== CARD MODIFIED HERE ======================
const PlumberCard = ({ plumber }) => (
    <div className="room-card">
        <div className="image-wrapper">
            <img
                className="room-image"
                src={plumber.imageUrls && plumber.imageUrls.length > 0 ? plumber.imageUrls[0].url : assets.pl1}
                alt={plumber.name}
            />
        </div>
        <div className="card-body">
            <h5 className="card-title">{plumber.name}</h5>
            
            <div className="detail-item mb-2">
                <span className="price-label">
                    <i className="fas fa-tools" style={{ marginRight: '8px' }}></i> Specialization
                </span>
                <strong>{plumber.specialization || 'General Plumbing'}</strong>
            </div>

            <div className="detail-item mb-3">
                <span className="price-label">
                    <i className="fas fa-phone" style={{ marginRight: '8px' }}></i> Contact
                </span>
                <strong>{plumber.mobile}</strong>
            </div>

            <div className="details-container">
                <div>
                    <span className="price-label">Experience</span>
                    <p className="price">{plumber.experience} years</p>
                </div>
                {/* Changed this from an <a> tag to a <Link> component */}
                <Link to={`/plumber/${plumber._id}`} className="view-offer-button">
                    View Details <i className="fas fa-arrow-right button-icon"></i>
                </Link>
            </div>
        </div>
    </div>
);
// =================================================================

const Plumber = () => {
    const [plumbers, setPlumbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(10); // Default radius for plumbers
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlumbers = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby plumbers.");
                navigate('/login');
                return;
            }
            setLoading(true);
            setError('');
            setPlumbers([]);
            try {
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                // Note the API endpoint
                const response = await axios.get(`${API_URL}/api/plumber/nearby`, config);
                setPlumbers(response.data.data);

                if (response.data.data.length === 0) {
                    setError(`No verified plumbers found within ${searchRadius}km. Try expanding your search.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch available plumbers.";
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
        fetchPlumbers();
    }, [navigate, searchRadius]);

    const renderContent = () => {
        if (loading) {
            return <div className="loader-container"><div className="spinner"></div></div>;
        }
        if (error || plumbers.length === 0) {
            return <div className="info-message">{error || 'No available plumbers match your criteria.'}</div>;
        }
        return (
            <div className="grid-container">
                {plumbers.map(plumber => <PlumberCard key={plumber._id} plumber={plumber} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header" style={{backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.9), rgba(18, 18, 18, 0.7)), url(${assets.household})`}}>
                <h1 className="page-title">Expert Plumber Services</h1>
                <p className="lead-text">Find reliable and verified plumbers for all your repair needs, right around the corner.</p>
                <div className="header-controls">
                    {[5, 10, 20].map(radius => (
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

export default Plumber;