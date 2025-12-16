import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function HomeRoute({ children }) {
    const { user } = useAuth()

    if (!user) {
        return <Navigate to="/welcome" replace />
    }

    return children
}
