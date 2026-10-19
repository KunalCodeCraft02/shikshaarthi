
// frontend/admin-panel/src/pages/RentalInterest.jsx

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { submissionAPI } from '../services/adminApi';
import { toast } from 'sonner';

// ... timeAgo helper function ...

const RentalInterest = () => {
    const [interests, setInterests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const highlightedNotifId = searchParams.get('notifId');

    useEffect(() => {
        const fetchInterests = async () => {
            setIsLoading(true);
            try {
                // This fetches an array of notification documents.
                // Each 'interest' in the state is a notification.
                const response = await submissionAPI.getRentalInterestNotifications();
                setInterests(response.data || []);
            } catch (error) { 
                toast.error(error.message); 
            } finally { 
                setIsLoading(false); 
            }
        };
        fetchInterests();
    }, []);

    return (
        <div className="container-xxl flex-grow-1 container-p-y">
            <h4 className="fw-bold py-3 mb-4">
                <span className="text-muted fw-light">Services / Rental Rooms / </span>Interests
            </h4>
            <div className="card">
                <div className="table-responsive text-nowrap">
                    <table className="table table-hover">
                        {/* ... table head ... */}
                        <tbody className="table-border-bottom-0">
                            {isLoading ? (
                                <tr><td colSpan="5" className="text-center p-5"><div className="spinner-border"></div></td></tr>
                            ) : interests.length > 0 ? interests.map(interest => (
                                // Here, 'interest' is the notification object.
                                // 'interest._id' is the ID of the notification. This is CORRECT.
                                <tr key={interest._id} className={highlightedNotifId === interest._id ? 'table-primary' : ''}>
                                    <td>
                                        <div><strong>{interest.metadata.userName}</strong></div>
                                        <small className="text-muted">{interest.metadata.userEmail}</small>
                                    </td>
                                    <td>{interest.metadata.rentalName}</td>
                                    <td><small>{new Date(interest.createdAt).toLocaleString()}</small></td>
                                    <td>{interest.isRead ? <span className="badge bg-label-secondary">Viewed</span> : <span className="badge bg-label-success">New</span>}</td>
                                    <td>
                                        {/* This Link correctly passes the notification's ID to the details page. This is PERFECT. */}
                                        <Link to={`/admin/services/rental-interest/${interest._id}`} className="btn btn-sm btn-primary">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="text-center p-5">No rental interest notifications found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RentalInterest;