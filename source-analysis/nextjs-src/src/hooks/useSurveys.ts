import { useState } from 'react'
import api from '@/lib/api'

export function useSurveys() {
  const [loading, setLoading] = useState(false)

  const createSurvey = async (data: any, photos?: File[]) => {
    setLoading(true)
    try {
      const formData = new FormData()
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key])
        }
      })
      
      if (photos && photos.length > 0) {
        photos.forEach((photo, index) => {
          formData.append(`photos[${index}]`, photo)
        })
      }

      const res = await api.post('/production-surveys', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const surveyId = res.data.data.id
      await api.post(`/production-surveys/${surveyId}/apply`)
      
      return { success: true, data: res.data.data }
    } catch (err) {
      console.error(err)
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  return { createSurvey, loading }
}
