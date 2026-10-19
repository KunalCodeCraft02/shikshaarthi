import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css'; // Re-use the same stylesheet

const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const LaundryCard = ({ service }) => (
    <div className="room-card">
        <div className="image-wrapper">
            <img
                className="room-image"
                src={service.imageUrls && service.imageUrls.length > 0 ? service.imageUrls[0].url : assets.l1}
                alt={service.name}
            />
        </div>
        <div className="card-body">
            <h5 className="card-title">{service.name}</h5>
            
            <div className="detail-item mb-2">
                <span className="price-label">
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }}></i> Location
                </span>
                <strong>{service.district}</strong>
            </div>

            <div className="detail-item mb-3">
                <span className="price-label">
                    <i className="fas fa-phone" style={{ marginRight: '8px' }}></i> Contact
                </span>
                <strong>{service.mobile}</strong>
            </div>

            <div className="details-container">
                <div>
                    <span className="price-label">Cost / Kg</span>
                    <p className="price">₹{service.costPerKg?.toFixed(2)}</p>
                </div>
                <Link to={`/laundry/${service._id}`} className="view-offer-button">
                    View Details <i className="fas fa-arrow-right button-icon"></i>
                </Link>
            </div>
        </div>
    </div>
);

const Laundry = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(5); // Default 5km for laundry
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLaundryServices = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby laundry services.");
                navigate('/login');
                return;
            }
            setLoading(true);
            setError('');
            setServices([]);
            try {
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                const response = await axios.get(`${API_URL}/api/laundry/nearby`, config);
                setServices(response.data.data);

                if (response.data.data.length === 0) {
                    setError(`No verified laundry services found within ${searchRadius}km. Try expanding your search.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch available laundry services.";
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
        fetchLaundryServices();
    }, [navigate, searchRadius]);

    const renderContent = () => {
        if (loading) {
            return <div className="loader-container"><div className="spinner"></div></div>;
        }
        if (error || services.length === 0) {
            return <div className="info-message">{error || 'No available laundry services match your criteria.'}</div>;
        }
        return (
            <div className="grid-container">
                {services.map(service => <LaundryCard key={service._id} service={service} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header" style={{backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.9), rgba(18, 18, 18, 0.7)), url(${assets.laundry})`}}>
                <h1 className="page-title">Convenient Laundry Services</h1>
                <p className="lead-text">Find trusted and verified laundry services for all your needs, just around your campus.</p>
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

export default Laundry;