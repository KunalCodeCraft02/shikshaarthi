// File: Frontend/admin-panel/src/components/layout/Sidebar.jsx

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppBrand from './AppBrand.jsx';
import { MenuHeader } from '../common/MenuItem.jsx';
import './Sidebar.css'

const isActivePath = (location, path) => location.pathname.startsWith(path);

const Sidebar = () => {
  const location = useLocation();

  useEffect(() => {
    // This effect ensures the theme's menu JS updates on route changes.
    if (window.menu && typeof window.menu.update === 'function') {
      const timerId = setTimeout(() => { try { window.menu.update(); } catch (e) { console.error("Error in menu.update():", e); }}, 100);
      return () => clearTimeout(timerId);
    }
  }, [location.pathname]);

  const handleDropdownToggle = (e) => {
    e.preventDefault();
    const menuItem = e.currentTarget.closest('.menu-item');
    if (menuItem) {
      menuItem.classList.toggle('open');
    }
  };

  // Define paths for top-level dropdowns to manage their 'active' and 'open' states
  const submissionPaths = [
    '/admin/submissions/pending',
    '/admin/submissions/approved',
    '/admin/submissions/rejected'
  ];
  
  const servicesPaths = [
    '/admin/services/rental-interest',
    '/admin/services/mess-interest'
  ];

  return (
    <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
      <AppBrand />
      <div className="menu-inner-shadow"></div>

      <ul className="menu-inner py-1">
        {/* Dashboard */}
        <li className={`menu-item ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
          <Link to="/" className="menu-link"><i className="menu-icon tf-icons bx bx-home-circle"></i><div>Dashboard</div></Link>
        </li>

        {/* Management Section */}
        <MenuHeader text="Management" />
        <li className={`menu-item ${isActivePath(location, '/admin/users') ? 'active' : ''}`}>
          <Link to="/admin/users" className="menu-link"><i className="menu-icon tf-icons bx bx-user"></i><div>Users List</div></Link>
        </li>
        <li className={`menu-item ${isActivePath(location, '/admin/notifications') ? 'active' : ''}`}>
          <Link to="/admin/notifications" className="menu-link"><i className="menu-icon tf-icons bx bx-bell"></i><div>Notifications</div></Link>
        </li>

        {/* Data Submissions (As a non-dropdown section) */}
        <MenuHeader text="Data Submissions" />
        <li className={`menu-item ${isActivePath(location, '/admin/submissions/pending') ? 'active' : ''}`}>
          <Link to="/admin/submissions/pending" className="menu-link"><i className="menu-icon tf-icons bx bx-time-five"></i><div>Pending Approvals</div></Link>
        </li>
        <li className={`menu-item ${isActivePath(location, '/admin/submissions/approved') ? 'active' : ''}`}>
          <Link to="/admin/submissions/approved" className="menu-link"><i className="menu-icon tf-icons bx bx-check-circle"></i><div>Approved Submissions</div></Link>
        </li>
        <li className={`menu-item ${isActivePath(location, '/admin/submissions/rejected') ? 'active' : ''}`}>
          <Link to="/admin/submissions/rejected" className="menu-link"><i className="menu-icon tf-icons bx bx-x-circle"></i><div>Rejected Submissions</div></Link>
        </li>

        {/* Services Dropdown (for viewing submitted data) */}
        <MenuHeader text="Services Data" />
        <li className={`menu-item`}>
           <a href="#" className="menu-link menu-toggle" onClick={handleDropdownToggle}>
            <i className="menu-icon tf-icons bx bx-data"></i>
            <div>View Submitted Data</div>
          </a>
          <ul className="menu-sub">
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/rental') ? 'active' : ''}`}>
              <Link to="/admin/submissions/rental" className="menu-link">
                <div>Rental Rooms</div>
              </Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/mess') ? 'active' : ''}`}>
              <Link to="/admin/submissions/mess" className="menu-link">
                <div>Mess Service</div>
              </Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/plumber') ? 'active' : ''}`}>
              <Link to="/admin/submissions/plumber" className="menu-link">
                <div>Plumber Service</div>
              </Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/laundry') ? 'active' : ''}`}>
              <Link to="/admin/submissions/laundry" className="menu-link">
                <div>Laundry Service</div>
              </Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/electrician') ? 'active' : ''}`}>
              <Link to="/admin/submissions/electrician" className="menu-link">
                <div>Electrician Service</div>
              </Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/submissions/medical') ? 'active' : ''}`}>
              <Link to="/admin/submissions/medical" className="menu-link">
                <div>Medical Service</div>
              </Link>
            </li>
          </ul>
        </li>

        

        {/* Services for Interest Users */}
        <MenuHeader text="Service Interests" />
        <li className={`menu-item ${servicesPaths.some(p => isActivePath(location, p)) ? 'active open' : ''}`}>
          <a href="#" className="menu-link menu-toggle" onClick={handleDropdownToggle}>
            <i className="menu-icon tf-icons bx bx-heart"></i>
            <div>User Interests</div>
          </a>
          <ul className="menu-sub">
            <li className={`menu-item ${isActivePath(location, '/admin/services/rental-interest') ? 'active' : ''}`}>
              <Link to="/admin/services/rental-interest" className="menu-link"><div>Rental Interest</div></Link>
            </li>
            <li className={`menu-item ${isActivePath(location, '/admin/services/mess-interest') ? 'active' : ''}`}>
              <Link to="/admin/services/mess-interest" className="menu-link"><div>Mess Interest</div></Link>
            </li>
            {/* Add other interest links here as services are built */}
          </ul>
        </li>

        {/* Configuration */}
        <MenuHeader text="Configuration" />
        <li className={`menu-item ${isActivePath(location, '/admin/settings') ? 'active' : ''}`}>
          <Link to="/admin/settings" className="menu-link"><i className="menu-icon tf-icons bx bx-cog"></i><div>Settings</div></Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;