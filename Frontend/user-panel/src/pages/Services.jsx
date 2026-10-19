
import React, { useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { toast } from 'sonner'; // 2. Import toast for notifications
import WOW from "wow.js";
import "animate.css";
import tokenService from '../utils/tokenService'; // 3. Import your tokenService

// The services array remains the same
const services = [
  {
    icon: "fas fa-home",
    title: "Rental Rooms",
    description: "Find nearby hostel rooms with pricing and availability.",
    link: "/rooms",
    isPremium: true // 4. Add a flag to identify premium services
  },
  {
    icon: "fas fa-utensils",
    title: "Mess Services",
    description: "Switch messes weekly, view menus, and pay per week.",
    link: "/mess",
    isPremium: true
  },
 
  {
    icon: "fas fa-hospital",
    title: "Medical Services",
    description: "Find nearby hospitals and medical shops with ease.",
    link: "/medical",
    isPremium: true
  },
  {
    icon: "fas fa-tshirt",
    title: "Laundry Services",
    description: "Find nearby laundry services for hassle-free washing.",
    link: "/laundry",
    isPremium: true
  },
  {
    icon: "fas fa-bolt",
    title: "Electrician Services",
    description: "Get expert electricians for home repairs and installations.",
    link: "/electrician", // Corrected typo from "electrican"
    isPremium: true
  },
  {
    icon: "fas fa-wrench",
    title: "Plumber Services",
    description: "Hire professional plumbers for household repairs.",
    link: "/plumber",
    isPremium: true
  },
  {
    icon: "fas fa-shopping-cart",
    title: "Buy Pre-Owned Stationery",
    description: "Purchase second-hand books, notes, and accessories.",
    link: "/products",
    isPremium: true
  },
  {
    icon: "fas fa-handshake",
    title: "Sell Pre-Owned Stationery",
    description: "Sell used stationery and educational materials easily.",
    link: "/sell-products",
    isPremium: true
  },
];

const Services = () => {
  const navigate = useNavigate(); // 5. Initialize navigate hook

  useEffect(() => {
    const wow = new WOW({ live: false });
    wow.init();
  }, []);

  // 6. Create the handler function
  const handleServiceClick = (e, service) => {
    e.preventDefault(); // Prevent the default <a> tag behavior

    // If the service is not premium, navigate directly
    if (!service.isPremium) {
      navigate(service.link);
      return;
    }

    // Check if the user is logged in
    if (!tokenService.isAuthenticated()) {
      toast.error("Please log in to access this service.");
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    // Get user data from token service
    const user = tokenService.getUser();
    
    // Check for an active subscription
    const hasActiveSubscription = user?.subscription?.status === 'active' && new Date(user.subscription.endDate) > new Date();

    if (hasActiveSubscription) {
      // If subscribed, navigate to the service page
      navigate(service.link);
    } else {
      // If not subscribed, show a message and redirect to upgrade page
      toast.info("This is a premium feature!", {
        description: "Please upgrade to access all services.",
      });
      setTimeout(() => navigate('/upgrade'), 1500);
    }
  };

  return (
    <div className="container-fluid service py-6">
      <div className="container">
        <div className="text-center wow bounceInUp" data-wow-delay="0.1s">
          <small className="d-inline-block fw-bold text-dark text-uppercase bg-light border border-primary rounded-pill px-4 py-1 mb-3">
            Our Services
          </small>
          <h1 className="display-5 mb-5">What We Offer</h1>
        </div>
        <div className="row g-4">
          {services.map((service, index) => (
            <div
              key={index}
              className="col-lg-3 col-md-6 col-sm-12 wow bounceInUp"
              data-wow-delay={`${0.1 + index * 0.1}s`}
            >
              <div className="bg-light rounded service-item">
                <div className="service-content d-flex align-items-center justify-content-center p-4">
                  <div className="service-content-icon text-center">
                    <i className={`${service.icon} fa-7x text-primary mb-4`}></i>
                    <h4 className="mb-3">{service.title}</h4>
                    <p className="mb-4">{service.description}</p>
                    {/* 7. Update the link to use the onClick handler */}
                    <a 
                      href={service.link} 
                      onClick={(e) => handleServiceClick(e, service)}
                      className="btn btn-primary px-4 py-2 rounded-pill"
                    >
                      Read More
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;