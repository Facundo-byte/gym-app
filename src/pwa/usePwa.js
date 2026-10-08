import { useContext } from 'react'
import { PwaContext } from './PwaContext.js'

export function usePwa() { return useContext(PwaContext) }
