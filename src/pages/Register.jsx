import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Eye, EyeOff } from 'lucide-react'
import { register } from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await register(form.name, form.email, form.password)
      const { access_token, tenant_id } = res.data
      localStorage.setItem('nw_token', access_token)
      localStorage.setItem('nw_tenant', JSON.stringify({
        id: tenant_id,
        name: form.name,
        plan: 'starter'
      }))
      navigate('/dashboard')
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F5F7FA' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#0D1B2A' }}>
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0D1B2A' }}>
            NeuralWatch
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B94A6' }}>
            Create your account
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 24px rgba(13,27,42,0.08)'
          }}
        >
          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: '#5A6478' }}>
                Full name
              </label>
              <input
                type="text"
                placeholder="Your name or company"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  border: '1px solid #E5E9F0',
                  backgroundColor: '#F5F7FA',
                  color: '#0D1B2A',
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: '#5A6478' }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onKeyDown={handleKeyDown}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  border: '1px solid #E5E9F0',
                  backgroundColor: '#F5F7FA',
                  color: '#0D1B2A',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: '#5A6478' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm pr-10"
                  style={{
                    border: '1px solid #E5E9F0',
                    backgroundColor: '#F5F7FA',
                    color: '#0D1B2A',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" style={{ color: '#8B94A6' }} />
                    : <Eye className="w-4 h-4" style={{ color: '#8B94A6' }} />
                  }
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#8B94A6' }}>
                Must be at least 6 characters
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3.5 py-2.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: loading ? '#6B9FFF' : '#0057FF' }}
            >
              {loading
                ? <><div className="nw-spinner !w-4 !h-4 !border-white/30 !border-t-white" />Creating account...</>
                : 'Create account'
              }
            </button>
          </div>
        </div>

        {/* Login link */}
        <p className="text-center text-sm mt-5" style={{ color: '#8B94A6' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold"
            style={{ color: '#0057FF' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
