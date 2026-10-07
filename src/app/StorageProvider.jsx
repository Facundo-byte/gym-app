import { useCallback, useEffect, useState } from 'react'
import { gymService } from '../services/gymService.js'
import { findDanglingAssignments } from '../services/dataIntegrity.js'
import { StorageContext } from './StorageContext.js'

export default function StorageProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null, recovery: null, dangling: [], noticeError: null })

  useEffect(() => {
    let active = true
    const unsubscribe = gymService.subscribeToStorage((noticeError) => {
      if (active) setState((current) => ({ ...current, noticeError }))
    })
    gymService.inspectAppData().then(
      (result) => { if (active) setState({ status: 'ready', ...result, error: null, noticeError: null }) },
      (error) => { if (active) setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null }) },
    )
    return () => { active = false; unsubscribe() }
  }, [])

  const retry = useCallback(async () => {
    try {
      const result = await gymService.inspectAppData()
      setState({ status: 'ready', ...result, error: null, noticeError: null })
    } catch (error) {
      setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null })
    }
  }, [])

  const reset = useCallback(async () => {
    await gymService.resetLocalData()
    try {
      const result = await gymService.inspectAppData()
      setState({ status: 'ready', ...result, error: null, noticeError: null })
    } catch (error) {
      setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null })
      throw error
    }
  }, [])

  const run = useCallback(async (operation) => {
    try {
      const data = await operation()
      setState((current) => ({ ...current, status: 'ready', data, error: null, recovery: null, dangling: findDanglingAssignments(data) }))
      return data
    } catch (error) {
      if (error.code === 'stale') setState((current) => ({ ...current, noticeError: error }))
      throw error
    }
  }, [])

  const applyRecovery = useCallback(() => run(() => gymService.applyRecovery({ confirmed: true })), [run])

  const saveExercise = useCallback(async (id, input) => {
    return run(() => id ? gymService.updateExercise(id, input) : gymService.createExercise(input))
  }, [run])

  const deleteExercise = useCallback(async (id) => {
    return run(() => gymService.deleteExercise(id))
  }, [run])

  const saveRoutine = useCallback(async (id, input, options) => {
    return run(() => id ? gymService.updateRoutine(id, input, options) : gymService.createRoutine(input))
  }, [run])

  const deleteRoutine = useCallback(async (id) => {
    return run(() => gymService.deleteRoutine(id))
  }, [run])

  const saveAssignment = useCallback(async (routineId, dayOfWeek, assignmentId, input) => {
    return run(() => assignmentId ? gymService.updateAssignment(routineId, dayOfWeek, assignmentId, input) : gymService.addAssignment(routineId, dayOfWeek, input))
  }, [run])

  const removeAssignment = useCallback(async (routineId, dayOfWeek, assignmentId) => {
    return run(() => gymService.removeAssignment(routineId, dayOfWeek, assignmentId))
  }, [run])

  const reorderAssignments = useCallback(async (routineId, dayOfWeek, orderedIds) => {
    return run(() => gymService.reorderAssignments(routineId, dayOfWeek, orderedIds))
  }, [run])

  const prepareTodayWorkouts = useCallback(async (date) => {
    return run(() => gymService.prepareTodayWorkouts(date))
  }, [run])

  const completeWorkout = useCallback(async (routineId, date) => {
    return run(() => gymService.completeWorkout(routineId, date))
  }, [run])

  return <StorageContext value={{ ...state, retry, reset, applyRecovery, exportSavedData: gymService.exportSavedData, saveExercise, deleteExercise, saveRoutine, deleteRoutine, saveAssignment, removeAssignment, reorderAssignments, prepareTodayWorkouts, completeWorkout }}>{children}</StorageContext>
}
