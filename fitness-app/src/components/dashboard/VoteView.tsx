import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function VoteView() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/dashboard/classes', { replace: true }) }, [navigate])
  return null
}
