import { useContext } from 'react'
import { StorageContext } from './StorageContext.js'

export function useStorage() {
  const value = useContext(StorageContext)
  if (!value) throw new Error('useStorage must be used inside StorageProvider.')
  return value
}
