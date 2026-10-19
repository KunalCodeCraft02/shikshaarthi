import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios'; // <-- 1. ADDED: Direct import for axios
import tokenService from '../utils/tokenService';
import assets from '../assets/assets.js';
import './ServicePage.css';

// 2. ADDED: API Gateway URL defined directly in the component
const API_URL = import.meta.env.VITE_API_GATEWAY_URL;

const MedicalCard = ({ service }) => (
  <div className="room-card">
      <div className="image-wrapper">
          <img
              className="room-image"
              src={service.imageUrls && service.imageUrls.length > 0 ? service.imageUrls[0].url : assets.medical}
              alt={service.name}
          />
      </div>
      <div className="card-body">
          <h5 className="card-title">{service.name}</h5>
          <div className="detail-item mb-3">
              <span className="price-label">
                  <i className="fas fa-pills" style={{ marginRight: '5px' }}></i> Type
              </span>
              <strong>{service.type}</strong>
          </div>
          <div className="details-container">
              <div>
                  <span className="price-label">From</span>
                  <p className="price">{service.district}</p>
              </div>
              <Link to={`/medical/${service._id}`} className="view-offer-button">
                  View Details <i className="fas fa-arrow-right button-icon"></i>
              </Link>
          </div>
      </div>
  </div>
);

const MedicalService = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchRadius, setSearchRadius] = useState(5);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchServices = async () => {
            if (!tokenService.isAuthenticated()) {
                toast.error("Please log in to see nearby medical services.");
                navigate('/login');
                return;
            }
            setLoading(true);
            setError('');
            try {
                // --- 3. CHANGED: Direct API call using axios ---
                await tokenService.ensureValidToken();
                const config = {
                    headers: { Authorization: `Bearer ${tokenService.getToken()}` },
                    params: { radius: searchRadius }
                };
                const response = await axios.get(`${API_URL}/api/medical/nearby`, config);
                // --- End of Change ---

                setServices(response.data.data);
                if (response.data.data.length === 0) {
                    setError(`No medical facilities found within ${searchRadius}km.`);
                }
            } catch (err) {
                const message = err.response?.data?.message || "Could not fetch medical services.";
                setError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [navigate, searchRadius]);
    
    const renderContent = () => {
        if (loading) return <div className="loader-container"><div className="spinner"></div></div>;
        if (error) return <div className="info-message">{error}</div>;
        return (
            <div className="grid-container">
                {services.map(service => <MedicalCard key={service._id} service={service} />)}
            </div>
        );
    };

    return (
        <div className="services-page">
            <header className="services-header" style={{backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.8), rgba(18, 18, 18, 0.6)), url(${assets.medical3})`}}>
                <h1 className="page-title">Health & Wellness Nearby</h1>
                <p className="lead-text">Find trusted clinics, hospitals, and pharmacies near you.</p>
                <div className="header-controls">
                    {[2, 5, 10].map(radius => (
                        <button key={radius} className={`radius-btn ${searchRadius === radius ? 'active' : ''}`} onClick={() => setSearchRadius(radius)} disabled={loading}>
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

export default MedicalService;