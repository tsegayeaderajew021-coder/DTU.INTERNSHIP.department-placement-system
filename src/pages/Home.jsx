import React from "react";
import { Link } from "react-router-dom";
import { FaBriefcase, FaGraduationCap, FaUsers } from "react-icons/fa";
import image1 from "../assets/image.png";
import image2 from "../assets/images.jpg";
import image3 from "../assets/image1.jpg";
import image4 from "../assets/image2.jpg";
import "./Home.css";

function Home() {
  const slides = [
    {
      image: image1,
      badge: "DTU Department Placement System",
      title: " Debre Tabor University student department placement system",
      text: "A modern and trusted platform for departments, students, and placement offices to manage academic placement services with confidence.",
    },
    {
      image: image2,
      badge: "Career & Internship Support",
      title: "Guide Students From Campus to Career",
      text: "Support learners with internships, career readiness, and organized placement progress for long-term success.",
    },
    {
      image: image3,
      badge: "University Student Management",
      title: "Streamlined Department and Placement Management",
      text: "Create a professional experience for advisors, departments, and placement officers with clear digital workflows.",
    },
    {
      image: image4,
      badge: "Institutional Excellence",
      title: "A Strong Digital Future for DTU",
      text: "Build a visible, modern, and efficient placement system that reflects the quality of Debre Tabor University.",
    },
  ];

  const highlights = [
    {
      icon: <FaGraduationCap />,
      title: "Academic Placement",
      description: "Support students across faculties with department-based placement coordination.",
    },
    {
      icon: <FaBriefcase />,
      title: "Career Readiness",
      description: "Prepare graduates for internships, employment, and professional growth.",
    },
    {
      icon: <FaUsers />,
      title: "Student Support",
      description: "Connect learners with advisors, employers, and university placement offices.",
    },
  ];

  return (
    <section className="home-page">
      <div className="container">
        <div className="home-hero">
          {slides.map((slide) => (
            <div
              key={slide.badge}
              className="home-hero__slide"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}

          <div className="home-hero__overlay">
            <div className="home-hero__content">
              <span className="home-hero__badge">{slides[0].badge}</span>
              <h1 className="home-hero__title">{slides[0].title}</h1>
              <p className="home-hero__text">{slides[0].text}</p>
              <div className="home-hero__actions">
                <Link className="home-hero__button primary btn btn-lg" to="/services">
                  View Placement Services
                </Link>
                <Link className="home-hero__button secondary btn btn-lg" to="/contact">
                  Contact Office
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-2">
          <div className="col-lg-8">
            <div className="home-panel p-4">
              <h2 className="panel-title h4 fw-semibold mb-3">Why DTU students choose this portal</h2>
              <p className="text-muted mb-4">
                This platform is designed to support departments in managing placement requests, tracking student progress, and connecting applicants with the right opportunities.
              </p>
              <div className="row g-3">
                <div className="col-sm-4">
                  <div className="home-stat">
                    <strong>120+</strong>
                    <span className="text-muted">Placement records</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="home-stat">
                    <strong>24/7</strong>
                    <span className="text-muted">Support access</span>
                  </div>
                </div>
                <div className="col-sm-4">
                  <div className="home-stat">
                    <strong>95%</strong>
                    <span className="text-muted">Readiness rate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="home-panel p-4">
              <h3 className="panel-title h5 fw-semibold mb-3">Core Services</h3>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">• Department placement tracking</li>
                <li className="mb-2">• Internship and job coordination</li>
                <li className="mb-2">• Student advisory support</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-1">
          {highlights.map((item) => (
            <div className="col-md-4" key={item.title}>
              <div className="home-panel p-4 h-100">
                <div className="mb-3" style={{ color: "#0f3d6e", fontSize: "1.3rem" }}>{item.icon}</div>
                <h3 className="panel-title h5 fw-semibold mb-2">{item.title}</h3>
                <p className="text-muted mb-0">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
