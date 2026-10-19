import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css'; // Re-use the same stylesheet

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const ElectricianCard = ({ electrician }) => (
    <div className="room-card">
        <div className="image-wrapper">
            <img
                className="room-image"
                src={electrician.imageUrls && electrician.imageUrls.length > 0 ? electrician.imageUrls[0].url : assets.e1}
                alt={electrician.name}
            />
        </div>
        <div className="card-body">
            <h5 className="card-title">{electrician.name}</h5>
            
            <div className="detail-item mb-2">
                <span className="price-label">
                    <i className="fas fa-bolt" style={{ marginRight: '8px' }}></i> Specialization
                </span>
                <strong>{electrician.specialization || 'General Work'}</strong>
            </div>

            <div className="detail-item mb-3">
                <span className="price-label">
                    <i className="fas fa-phone" style={{ marginRight: '8px' }}></i> Contact
                </span>
                <strong>{electrician.mobile}</strong>
            </div>

            <div className="details-container">
                <div>
                    <span className="price-label">Experience</span>
                    <p className="price">{electrician.experience} years</p>
                </div>
                <Link to={`/electrician/${electrician._id}`} className="view-offer-button">
                    View Details <i className="fas fa-arrow-right button-icon"></i>
                </Link>
            </div>
        </div>
    </div>
);

const Electrician = () => {
    const [electricians, setElectricians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(10);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchElectricians = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby electricians.");
                navigate('/login');
                return;
            }
            setLoading(true);
            setError('');
            setElectricians([]);
            try {
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                const response = await axios.get(`${API_URL}/api/electrician/nearby`, config);
                setElectricians(response.data.data);

                if (response.data.data.length === 0) {
                    setError(`No verified electricians found within ${searchRadius}km. Try expanding your search.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch available electricians.";
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
        fetchElectricians();
    }, [navigate, searchRadius]);

    const renderContent = () => {
        if (loading) {
            return <div className="loader-container"><div className="spinner"></div></div>;
        }
        if (error || electricians.length === 0) {
            return <div className="info-message">{error || 'No available electricians match your criteria.'}</div>;
        }
        return (
            <div className="grid-container">
                {electricians.map(electrician => <ElectricianCard key={electrician._id} electrician={electrician} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header" style={{backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.9), rgba(18, 18, 18, 0.7)), url(${assets.electrican})`}}>
                <h1 className="page-title">Expert Electrician Services</h1>
                <p className="lead-text">Find reliable and verified electricians for all your wiring and repair needs.</p>
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

export default Electrician;