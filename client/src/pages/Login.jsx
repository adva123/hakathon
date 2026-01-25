import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { GameContext } from '../context/GameContext';
import styles from './Login.module.css';

const Login = ({ onClose, onLoginSuccess }) => {
    const [showMessage, setShowMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { handleLogin } = useContext(GameContext);

    // Check if Google OAuth is available
    const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

    // Always call the hook, but conditionally use it
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                setIsLoading(true);

                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );

                console.log('📧 Google user info:', userInfo.data);

                const serverResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email: userInfo.data.email,
                    username: userInfo.data.given_name || userInfo.data.name
                });

                console.log('🎯 Server response:', serverResponse.data);

                if (serverResponse.data.success) {
                    const userData = serverResponse.data.user;
                    const googlePicture = userInfo.data.picture;

                    // Store user picture in localStorage
                    if (googlePicture) {
                        localStorage.setItem('userPicture', googlePicture);
                    }

                    // Call onLoginSuccess if provided (for backward compatibility)
                    if (onLoginSuccess) {
                        onLoginSuccess(userData, googlePicture);
                    } else {
                        // Otherwise, handle login directly
                        handleLogin(userData);
                    }

                    console.log('✅ Login Success! User ID:', userData.id);
                    setShowMessage(serverResponse.data.message);

                    setTimeout(() => {
                        if (onClose) {
                            onClose();
                        } else {
                            // Redirect to game page
                            navigate('/game');
                        }
                    }, 1000);
                } else {
                    setShowMessage('Login failed: ' + serverResponse.data.message);
                }

            } catch (error) {
                console.error('❌ Error during login:', error);
                let errorMsg = 'Login failed. ';

                if (error.response?.status === 404) {
                    errorMsg += 'Server endpoint not found';
                } else if (error.response?.data?.message) {
                    errorMsg += error.response.data.message;
                } else {
                    errorMsg += 'Connection error';
                }

                setShowMessage(errorMsg);
                setTimeout(() => setShowMessage(''), 4000);
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => {
            setShowMessage('Google login failed. Please try again.');
            setTimeout(() => setShowMessage(''), 3000);
        },
    });

    const handleGoogleLogin = () => {
        if (!hasGoogleAuth) {
            setShowMessage('Google login is not configured. Please use Guest mode.');
            setTimeout(() => setShowMessage(''), 3000);
            return;
        }
        googleLogin();
    };

    const handleMinistryOfEducationClick = () => {
        window.open('https://lgn.edu.gov.il/nidp/edu/', '_blank');
        setShowMessage('Redirecting to Ministry of Education portal...');
        setTimeout(() => setShowMessage(''), 3000);
    };

    const handleGuestLogin = () => {
        const guestUser = {
            id: 'guest-' + Date.now(),
            username: 'Guest Player',
            email: 'guest@localhost',
            score: 0,
            coins: 100,
            energy: 100
        };

        console.log('🎮 Guest login:', guestUser);

        // Call onLoginSuccess if provided (for backward compatibility)
        if (onLoginSuccess) {
            onLoginSuccess(guestUser, '');
        } else {
            // Otherwise, handle login directly
            handleLogin(guestUser);
        }

        setShowMessage('Welcome, Guest! 🎮');
        setTimeout(() => {
            if (onClose) {
                onClose();
            } else {
                // Redirect to game page
                navigate('/game');
            }
        }, 1000);
    };

    return (
        <div className={styles.loginContainer}>
            {/* LEFT SIDE: Visual Branding */}
            <div className={styles.visualSide}>
                {/* Animated gradient background */}
                <div className={styles.floatingShapes}>
                    <div className={styles.shape}></div>
                    <div className={styles.shape}></div>
                    <div className={styles.shape}></div>
                </div>

                {/* Branding Content */}
                <div className={styles.brandingContent}>
                    <h1 className={styles.brandLogo}>SafeForest</h1>
                    <p className={styles.brandTagline}>Your Cybersecurity Sanctuary</p>
                    <p className={styles.brandDescription}>
                        Journey through an immersive digital forest where you'll master password security,
                        privacy protection, and digital safety through engaging 3D challenges and AI companions.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form */}
            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    {onClose && (
                        <button className={styles.closeButton} onClick={onClose}>✕</button>
                    )}

                    <div className={styles.header}>
                        <h2 className={styles.title}>Welcome Back</h2>
                        <p className={styles.subtitle}>Sign in to continue your journey</p>
                    </div>

                    {showMessage && (
                        <div className={styles.message}>
                            {showMessage}
                        </div>
                    )}

                    <div className={styles.buttons}>
                        <button
                            className={`${styles.loginButton} ${styles.google}`}
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className={styles.spinner}></div>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>

                        <button className={`${styles.loginButton} ${styles.ministry}`} onClick={handleMinistryOfEducationClick}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                            </svg>
                            Ministry of Education
                        </button>
                    </div>

                    <div className={styles.divider}>or</div>

                    <button
                        className={`${styles.loginButton} ${styles.guestButton}`}
                        onClick={handleGuestLogin}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                        Play as Guest
                    </button>

                    <div className={styles.footer}>
                        <p className={styles.footerText}>
                            By continuing, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
