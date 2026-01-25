import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    console.log('Newsletter signup:', email);
    setEmail('');
  };

  return (
    <footer className={styles.footer} id="contact">
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <h3 className={styles.logo}>SafeForest</h3>
            <p className={styles.tagline}>
              Learn cybersecurity through immersive gameplay
            </p>

            {/* Newsletter Signup */}
            <form className={styles.newsletter} onSubmit={handleNewsletterSubmit}>
              <h4 className={styles.newsletterHeading}>Stay Updated</h4>
              <div className={styles.newsletterInput}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.emailInput}
                  required
                />
                <button type="submit" className={styles.subscribeBtn}>
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          <div className={styles.links}>
            <h4 className={styles.heading}>Quick Links</h4>
            <ul className={styles.linkList}>
              <li>
                <a href="#about" className={styles.link}>
                  About
                </a>
              </li>
              <li>
                <a href="#demo" className={styles.link}>
                  Demo
                </a>
              </li>
              <li>
                <button onClick={() => navigate('/game')} className={styles.link}>
                  Play Game
                </button>
              </li>
            </ul>
          </div>

          <div className={styles.contact}>
            <h4 className={styles.heading}>Contact</h4>
            <ul className={styles.linkList}>
              <li>
                <a href="mailto:info@SafeForest.com" className={styles.link}>
                  info@SafeForest.com
                </a>
              </li>
              <li>
                <a href="#" className={styles.link}>
                  Support
                </a>
              </li>
              <li>
                <a href="#" className={styles.link}>
                  Feedback
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} SafeForest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
