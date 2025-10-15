import { useState } from 'react'

const AuthPage = () => {
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
    background: '#F5F7FA',
    card: '#FFFFFF',
    primaryText: '#333333',
    secondaryText: '#888888',
    accentBlue: '#6A96FF',
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
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setShowSuccess(true)
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          rememberMe: false
        })
        setShowSuccess(false)
      }, 2000)
    }, 1000)
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setErrors({})
    setShowSuccess(false)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: colors.background }}
    >
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Illustration area for desktop */}
          <div className="hidden lg:block">
            <div 
              className="h-96 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${colors.accentBlue}20, ${colors.accentBlue}40)`
              }}
            >
              {/* Decorative elements */}
              <div className="absolute top-8 left-8 w-16 h-16 rounded-full opacity-20" style={{ backgroundColor: colors.accentBlue }}></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 rounded-full opacity-30" style={{ backgroundColor: colors.accentYellow }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="text-6xl">🌧️</div>
                <div className="text-center mt-4">
                  <h2 className="text-2xl font-bold" style={{ color: colors.primaryText }}>RainSafe</h2>
                  <p className="text-sm mt-2" style={{ color: colors.secondaryText }}>Weather Intelligence Platform</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth form */}
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
                    {isLogin ? 'Successfully signed in!' : 'Account created successfully!'}
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
