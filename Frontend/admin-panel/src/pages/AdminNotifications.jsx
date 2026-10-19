
//frontend/ad in-panel/src/pages/AdminNotifications.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { submissionAPI } from '../services/adminApi';

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.round(hours / 24)} days ago`;
};

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); 
    const navigate = useNavigate();

    // Define which types are for service interests
    const serviceInterestTypes = ['rental_interest', 'mess_interest'];

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await submissionAPI.getAdminNotifications();
            const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setNotifications(sorted);
        } catch (error) { toast.error(error.message); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleMarkAsRead = async (e, notificationId) => {
        e.preventDefault(); e.stopPropagation();
        const original = [...notifications];
        setNotifications(current => current.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
        try { await submissionAPI.markNotificationAsRead(notificationId); toast.success("Marked as read."); } 
        catch (error) { toast.error("Failed to update."); setNotifications(original); }
    };
    
    const handleNotificationClick = (notification) => {
        if (!notification.isRead) submissionAPI.markNotificationAsRead(notification._id).catch(console.error);
        
        if (notification.type === 'rental_interest') navigate(`/admin/services/rental-interest`);
        else if (notification.type === 'mess_interest') navigate(`/admin/services/mess-interest`); // Future navigation
        else if (notification.type === 'new_submission') navigate('/admin/submissions/pending');
        else if (notification.link) navigate(notification.link);
    }

    const getIconForType = (type) => {
        switch (type) {
            case 'reward_redemption_request': return 'bx bx-gift text-success';
            case 'new_submission': return 'bx bxs-file-plus text-warning';
            case 'spin_wheel_win': return 'bx bx-trophy text-info';
            case 'rental_interest': return 'bx bx-home-heart text-primary';
            case 'mess_interest': return 'bx bx-restaurant text-primary'; // Future icon
            default: return 'bx bx-bell text-secondary';
        }
    };

    const getFriendlyFilterName = () => ({
        new_submission: 'pending submissions',
        reward_redemption_request: 'coin redemptions',
        spin_wheel_win: 'spin wheel prizes',
        SERVICES: 'service interests',
        ALL: 'new',
    })[filter] || 'new';

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'ALL') return true;
        if (filter === 'SERVICES') return serviceInterestTypes.includes(n.type);
        return n.type === filter;
    });

    return (
        <div className="container-xxl flex-grow-1 container-p-y">
            <div className="d-flex justify-content-between align-items-center py-3 mb-4 flex-wrap gap-2">
                <h4 className="fw-bold mb-0">Admin Notifications</h4>
                <div className="btn-group" role="group">
                    {/* Filter buttons as per your request */}
                    <input type="radio" className="btn-check" name="notif-filter" id="fAll" checked={filter === 'ALL'} onChange={() => setFilter('ALL')} /><label className="btn btn-sm btn-outline-primary" htmlFor="fAll">All</label>
                    <input type="radio" className="btn-check" name="notif-filter" id="fSub" checked={filter === 'new_submission'} onChange={() => setFilter('new_submission')} /><label className="btn btn-sm btn-outline-primary" htmlFor="fSub"><i className="bx bxs-file-plus me-1"></i> Submissions</label>
                    <input type="radio" className="btn-check" name="notif-filter" id="fRed" checked={filter === 'reward_redemption_request'} onChange={() => setFilter('reward_redemption_request')} /><label className="btn btn-sm btn-outline-primary" htmlFor="fRed"><i className="bx bx-gift me-1"></i> Redemptions</label>
                    <input type="radio" className="btn-check" name="notif-filter" id="fSpin" checked={filter === 'spin_wheel_win'} onChange={() => setFilter('spin_wheel_win')} /><label className="btn btn-sm btn-outline-primary" htmlFor="fSpin"><i className="bx bx-trophy me-1"></i> Spin Wins</label>
                    <input type="radio" className="btn-check" name="notif-filter" id="fSvc" checked={filter === 'SERVICES'} onChange={() => setFilter('SERVICES')} /><label className="btn btn-sm btn-outline-primary" htmlFor="fSvc"><i className="bx bx-collection me-1"></i> Services</label>
                </div>
            </div>
            <div className="card">
                <div className="list-group list-group-flush">
                    {isLoading ? <div className="p-5 text-center"><div className="spinner-border"></div></div> :
                    filteredNotifications.length > 0 ? filteredNotifications.map(notif => (
                        <div key={notif._id} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start flex-wrap ${!notif.isRead ? 'list-group-item-light fw-semibold' : ''}`} onClick={() => handleNotificationClick(notif)} style={{ cursor: 'pointer' }}>
                            <div className="d-flex align-items-center"><div className="me-3"><i className={`bx-md ${getIconForType(notif.type)}`}></i></div><div className="w-100"><p className="mb-1">{notif.message}</p><small className="text-muted">{timeAgo(notif.createdAt)}</small></div></div>
                            <div className="ms-md-3 mt-2 mt-md-0 text-nowrap">{!notif.isRead && (<button className="btn btn-xs btn-outline-secondary" onClick={(e) => handleMarkAsRead(e, notif._id)}><i className="bx bx-check me-1"></i>Mark as Read</button>)}</div>
                        </div>
                    )) :
                    <div className="p-5 text-center"><i className="bx bx-check-double bx-lg text-success mb-3"></i><h5 className="mb-1">All Caught Up!</h5><p className="mb-0 text-muted">There are no {getFriendlyFilterName()} notifications.</p></div>}
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;