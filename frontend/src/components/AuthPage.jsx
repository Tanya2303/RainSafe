import { useState } from 'react'
import bg11 from '../assets/bg111.jpg';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile 
} from 'firebase/auth';
import { auth } from '../firebase'; // [NEW] Import the auth object

// AuthPage now accepts onAuthSuccess prop from App.jsx
const AuthPage = ({ onAuthSuccess, setCurrentUser, getUserDetails }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  })

  // Color palette as specified
  const colors = {
    background: '#FFFAED',
    card: '#FFFAED', // d
    primaryText: '#06304f', //d
    secondaryText: '#286198', //d
    accentBlue: '#1F6783',
    accentGreen: '#4CAF50',
    accentYellow: '#FFC107',
    accentOrange: '#FF8C00',
    accentRed: '#EF5350'
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    return password.length >= 6
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required'
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setShowSuccess(false)
    setErrors({})
    
    try {
        if (isLogin) {
            // --- Sign In with Firebase ---
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;
            
            setShowSuccess(true);
            setTimeout(() => {
                onAuthSuccess(user); // Triggers App.jsx redirection
            }, 500); 

        } else {
            // --- Sign Up with Firebase ---
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // Update user profile with display name
            await updateProfile(user, {
                displayName: formData.name
            });
            
            setShowSuccess(true);
            
            // On successful signup, switch to login page and clean up
            setTimeout(() => {
                setIsLogin(true);
                setFormData({ name: '', email: '', password: '', confirmPassword: '', rememberMe: false });
                setShowSuccess(false);
            }, 1000)
        }
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        
        let errorMessage = "An unknown error occurred.";
        if (error.code) {
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = "Invalid email or password.";
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = "Email already in use. Please sign in.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "Password should be at least 6 characters.";
                    break;
                default:
                    errorMessage = `Authentication failed: ${error.message}`;
            }
        }
        
        setErrors({ general: errorMessage });
        
    } finally {
        setIsLoading(false);
    }
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setErrors({})
    setShowSuccess(false)
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      rememberMe: false
    })
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      // ✅ 1. Apply bg11.jpeg as the full-page background
      style={{ 
        backgroundImage: `url(${bg11})`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="w-full max-w-6xl">
        {/* ✅ 2. Change the grid layout to a single column (grid-cols-1) */}
        <div className="grid grid-cols-1 gap-8 items-center">
          
          {/* ❌ Left side - Illustration area (DELETED) */}

          {/* Right side - Auth form (Now centered) */}
          <div className="w-full max-w-md mx-auto">
            <div 
              className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300"
              style={{ backgroundColor: colors.card }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: colors.primaryText }}>
                  {isLogin ? 'Welcome Back!' : 'Create Account'}
                </h1>
                <p className="text-sm" style={{ color: colors.secondaryText }}>
                  {isLogin ? 'Sign in to your account' : 'Sign up to get started'}
                </p>
              </div>

              {/* Success message */}
              {showSuccess && (
                <div className="mb-6 p-4 rounded-lg flex items-center" style={{ backgroundColor: `${colors.accentGreen}20` }}>
                  <div className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: colors.accentGreen }}></div>
                  <span className="text-sm font-medium" style={{ color: colors.accentGreen }}>
                    {isLogin ? 'Successfully signed in! Redirecting...' : 'Account created successfully!'}
                  </span>
                </div>
              )}
              
              {/* [NEW] General Error message */}
              {errors.general && (
                <div className="mb-6 p-4 rounded-lg flex items-center" style={{ backgroundColor: `${colors.accentRed}20` }}>
                  <div className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: colors.accentRed }}></div>
                  <span className="text-sm font-medium" style={{ color: colors.accentRed }}>
                    {errors.general}
                  </span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name field (Signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <label 
                      htmlFor="name" 
                      className="block text-sm font-medium"
                      style={{ color: colors.primaryText }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                        errors.name 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      style={{ 
                        focusRingColor: colors.accentBlue,
                        borderColor: errors.name ? colors.accentRed : undefined
                      }}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-sm" style={{ color: colors.accentRed }}>
                        {errors.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium"
                    style={{ color: colors.primaryText }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      errors.email 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    style={{ 
                      focusRingColor: colors.accentBlue,
                      borderColor: errors.email ? colors.accentRed : undefined
                    }}
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="text-sm" style={{ color: colors.accentRed }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium"
                    style={{ color: colors.primaryText }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      errors.password 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    style={{ 
                      focusRingColor: colors.accentBlue,
                      borderColor: errors.password ? colors.accentRed : undefined
                    }}
                    placeholder="Enter your password"
                  />
                  {errors.password && (
                    <p className="text-sm" style={{ color: colors.accentRed }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password field (Signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-medium"
                      style={{ color: colors.primaryText }}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                        errors.confirmPassword 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      style={{ 
                        focusRingColor: colors.accentBlue,
                        borderColor: errors.confirmPassword ? colors.accentRed : undefined
                      }}
                      placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm" style={{ color: colors.accentRed }}>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {/* Remember me checkbox (Login only) */}
                {isLogin && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        accentColor: colors.accentBlue,
                        focusRingColor: colors.accentBlue
                      }}
                    />
                    <label 
                      htmlFor="rememberMe" 
                      className="ml-2 text-sm"
                      style={{ color: colors.secondaryText }}
                    >
                      Remember me
                    </label>
                  </div>
                )}

                {/* Forgot password link (Login only) */}
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-sm hover:underline transition-colors"
                      style={{ color: colors.accentBlue }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                    isLoading 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:opacity-90 active:scale-95'
                  }`}
                  style={{ 
                    backgroundColor: colors.accentBlue,
                    boxShadow: isLoading ? 'none' : `0 4px 14px 0 ${colors.accentBlue}40`
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </div>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </button>

                {/* Toggle auth mode */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="text-sm hover:underline transition-colors"
                    style={{ color: colors.accentBlue }}
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage