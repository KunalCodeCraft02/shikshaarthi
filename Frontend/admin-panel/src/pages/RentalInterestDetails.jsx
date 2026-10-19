
// frontend/admin-panel/src/pages/RentalInterestDetails.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissionAPI } from '../services/adminApi';
import { toast } from 'sonner';

const DetailCard = ({ title, children }) => (
    <div className="card mb-4">
        <h5 className="card-header">{title}</h5>
        <div className="card-body">{children}</div>
    </div>
);

// =======================================================================
// THE FIX: Modify DetailItem to render nothing if the value is falsy (null, undefined, '')
// =======================================================================
const DetailItem = ({ label, value, isLink = false, to = '#' }) => {
    // If the value is not present, don't render the row at all.
    if (!value) {
        return null; 
    }
    return (
        <div className="row mb-2">
            <dt className="col-sm-4">{label}</dt>
            <dd className="col-sm-8">
                {isLink ? <Link to={to}>{value}</Link> : value}
            </dd>
        </div>
    );
};


const RentalInterestDetails = () => {
    const { notificationId } = useParams(); 
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (notificationId) {
            setIsLoading(true);
            submissionAPI.getRentalInterestDetails(notificationId)
                .then(response => {
                    if (response.success) {
                        setDetails(response.data);
                    } else {
                        toast.error(response.message || "Failed to load details.");
                    }
                })
                .catch(err => toast.error(err.message))
                .finally(() => setIsLoading(false));
        }
    }, [notificationId]);

    if (isLoading) {
        return <div className="container-xxl text-center p-5"><div className="spinner-border"></div></div>;
    }

    if (!details) {
        // ... no changes needed here
        return (
            <div className="container-xxl">
                <h4 className="fw-bold py-3 mb-4">Interest Details</h4>
                <div className="alert alert-danger">Could not load the interest details.</div>
                <Link to="/admin/services/rental-interest" className="btn btn-primary">Back to Interests</Link>
            </div>
        );
    }

    const { user, rental, notification } = details;

    return (
        <div className="container-xxl flex-grow-1 container-p-y">
            <h4 className="fw-bold py-3 mb-4">
                <span className="text-muted fw-light">Services / <Link to="/admin/services/rental-interest">Rental Interests</Link> / </span>
                Details
            </h4>

            <div className="row">
                <div className="col-md-6">
                    <DetailCard title="Interested User Details">
                        <dl className="row">
                            <DetailItem label="User Name" value={user.fullName} />
                            <DetailItem label="Email" value={user.email} />
                            {/* The component will now automatically hide if mobileNumber is missing */}
                            <DetailItem label="Mobile" value={user.mobileNumber} /> 
                            <DetailItem label="Shikshaarthi ID" value={user._id} />
                            <DetailItem label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
                        </dl>
                    </DetailCard>
                </div>
                <div className="col-md-6">
                    <DetailCard title="Rental Property Details">
                        <dl className="row">
                            <DetailItem label="Property Name" value={rental.name} />
                            <DetailItem label="Price" value={`₹${rental.price} / month`} />
                            <DetailItem label="Type" value={rental.type} />
                            {/* This will automatically hide if 'sharing' is empty */}
                            <DetailItem label="Sharing" value={rental.sharing} /> 
                            <DetailItem label="Address" value={`${rental.address}, ${rental.district}, ${rental.state} - ${rental.pincode}`} />
                        </dl>
                    </DetailCard>
                </div>
            </div>

            <DetailCard title="Owner & Notification Info">
                <div className="row">
                    <div className="col-md-6">
                        <h5>Owner Contact</h5>
                        <dl className="row">
                            <DetailItem label="Owner Name" value={rental.holderName} />
                            <DetailItem label="Owner Mobile" value={rental.mobile} />
                            {/* This will automatically hide if owner's email is empty */}
                            <DetailItem label="Owner Email" value={rental.email} />
                        </dl>
                    </div>
                    <div className="col-md-6">
                         <h5>Notification Details</h5>
                        <dl className="row">
                            <DetailItem label="Notification" value={notification.message} />
                            <DetailItem label="Interest Date" value={new Date(notification.createdAt).toLocaleString()} />
                            <DetailItem label="Status" value={notification.isRead ? 'Viewed' : 'New'} />
                        </dl>
                    </div>
                </div>
            </DetailCard>

            <div className="text-center">
                <Link to="/admin/services/rental-interest" className="btn btn-secondary">
                    <i className="bx bx-arrow-back me-1"></i> Back to All Interests
                </Link>
            </div>
        </div>
    );
};

export default RentalInterestDetails;