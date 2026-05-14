import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const features = [
    {
      icon: '📡',
      title: 'GPS Live Tracking',
      desc: 'Track every ambulance in real-time with centimeter-level accuracy across the entire city grid.',
    },
    {
      icon: '🚦',
      title: 'Smart Signal Control',
      desc: 'IoT-enabled traffic signals automatically switch to green, creating seamless corridors for ambulances.',
    },
    {
      icon: '🧠',
      title: 'AI Route Engine',
      desc: 'Predicts congestion and continuously optimizes the fastest route using live traffic analysis.',
    },
    {
      icon: '🏥',
      title: 'Hospital Matching',
      desc: 'Instantly identifies the best hospital by proximity, bed availability, ICU capacity, and specialty.',
    },
    {
      icon: '📱',
      title: 'Civilian Alerts',
      desc: 'Nearby vehicles receive real-time notifications to clear the way for approaching ambulances.',
    },
    {
      icon: '📊',
      title: 'Analytics Hub',
      desc: 'Comprehensive dashboards tracking response times, fleet performance, and operational metrics.',
    },
  ];

  const howItWorks = [
    { step: '01', title: 'Emergency Reported', desc: 'A call is received and the nearest available ambulance is identified automatically.' },
    { step: '02', title: 'Smart Dispatch', desc: 'AI selects the best ambulance and hospital, computing the optimal route instantly.' },
    { step: '03', title: 'Green Corridor', desc: 'All traffic signals along the route switch to green. Civilians are alerted to clear the path.' },
    { step: '04', title: 'Patient Delivered', desc: 'Hospital is pre-notified with patient details and ETA. No time wasted on arrival.' },
  ];

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className={`landing-nav ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">🚑</span>
            <span className="landing-logo-text">GREEN WAVE</span>
          </div>
          <div className="landing-nav-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>

            <a href="#contact">Contact</a>
          </div>
          <button className="landing-nav-cta" onClick={() => navigate('/login')}>
            Launch Dashboard →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-bg-shapes">
          <div className="hero-blob blob-1"></div>
          <div className="hero-blob blob-2"></div>
          <div className="hero-blob blob-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-left">
            <div className="hero-badge">🚨 Smart Emergency System</div>
            <h1 className="hero-heading">
              GREEN <span className="hero-heading-accent">WAVE</span>
            </h1>
            <p className="hero-description">
              Transforms urban traffic by clearing the path for emergency vehicles
              and connecting them instantly to hospitals.
            </p>
            <p className="hero-sub">
              AI-powered routing • IoT signal control • Real-time GPS tracking • Hospital coordination
            </p>
            <div className="hero-buttons">
              <button className="hero-btn-primary" onClick={() => navigate('/login')}>
                Get Started <span className="hero-btn-arrow">→</span>
              </button>
              <a href="#features" className="hero-btn-secondary">
                Learn More ↓
              </a>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image-wrapper">
              <div className="hero-image-ring ring-1"></div>
              <div className="hero-image-ring ring-2"></div>
              <div className="hero-image-ring ring-3"></div>
              <img src="/hero.png" alt="Smart Emergency Traffic Clearance System illustration" className="hero-image" />
            </div>
          </div>
        </div>
        <div className="hero-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z" fill="#0a0e1a" />
          </svg>
        </div>
      </section>


      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Intelligent Emergency Response</h2>
            <p className="section-subtitle">
              A connected ecosystem that reduces response time and saves lives through smart automation.
            </p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">From Alert to Arrival</h2>
            <p className="section-subtitle">
              Four automated steps that transform emergency response into a seamless, life-saving flow.
            </p>
          </div>
          <div className="steps-grid">
            {howItWorks.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.step}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < howItWorks.length - 1 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="contact">
        <div className="cta-inner">
          <h2>Ready to Save Lives?</h2>
          <p>Experience the power of intelligent emergency response. Launch the command center now.</p>
          <button className="hero-btn-primary" onClick={() => navigate('/login')}>
            Launch Command Center <span className="hero-btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="landing-logo-icon">🚑</span>
            <span className="landing-logo-text">GREEN WAVE</span>
            <p>Smart Emergency Traffic Clearance System</p>
          </div>
          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-copy">© 2026 GREEN WAVE. Saving lives through technology.</div>
        </div>
      </footer>
    </div>
  );
}
