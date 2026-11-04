import { Navigate } from 'react-router-dom'
import PlanetLoader from './PlanetLoader'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PlanetLoader full label="Warming up your orbit..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
