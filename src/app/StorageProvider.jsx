import { useCallback, useEffect, useState } from 'react'
import { findDanglingAssignments } from '../services/dataIntegrity.js'
import { StorageContext } from './StorageContext.js'

export default function StorageProvider({ children, service, mode }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null, recovery: null, dangling: [], noticeError: null })

  useEffect(() => {
    let active = true
    const unsubscribe = service.subscribeToStorage((noticeError) => {
      if (active) setState((current) => ({ ...current, noticeError }))
    })
    service.inspectAppData().then(
      (result) => { if (active) setState({ status: 'ready', ...result, error: null, noticeError: null }) },
      (error) => { if (active) setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null }) },
    )
    return () => { active = false; unsubscribe() }
  }, [service])

  const retry = useCallback(async () => {
    try {
      const result = await service.inspectAppData()
      setState({ status: 'ready', ...result, error: null, noticeError: null })
    } catch (error) {
      setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null })
    }
  }, [service])

  const reset = useCallback(async () => {
    await service.resetLocalData()
    try {
      const result = await service.inspectAppData()
      setState({ status: 'ready', ...result, error: null, noticeError: null })
    } catch (error) {
      setState({ status: 'error', data: null, error, recovery: null, dangling: [], noticeError: null })
      throw error
    }
  }, [service])

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

  const applyRecovery = useCallback(() => run(() => service.applyRecovery({ confirmed: true })), [run, service])
  const importGuestData = useCallback((proposal) => run(() => service.importGuestData(proposal, { confirmed: true })), [run, service])

  const saveExercise = useCallback(async (id, input) => {
    return run(() => id ? service.updateExercise(id, input) : service.createExercise(input))
  }, [run, service])

  const deleteExercise = useCallback(async (id) => {
    return run(() => service.deleteExercise(id))
  }, [run, service])

  const saveRoutine = useCallback(async (id, input, options) => {
    return run(() => id ? service.updateRoutine(id, input, options) : service.createRoutine(input))
  }, [run, service])

  const deleteRoutine = useCallback(async (id) => {
    return run(() => service.deleteRoutine(id))
  }, [run, service])

  const saveAssignment = useCallback(async (routineId, dayOfWeek, assignmentId, input) => {
    return run(() => assignmentId ? service.updateAssignment(routineId, dayOfWeek, assignmentId, input) : service.addAssignment(routineId, dayOfWeek, input))
  }, [run, service])

  const removeAssignment = useCallback(async (routineId, dayOfWeek, assignmentId) => {
    return run(() => service.removeAssignment(routineId, dayOfWeek, assignmentId))
  }, [run, service])

  const reorderAssignments = useCallback(async (routineId, dayOfWeek, orderedIds) => {
    return run(() => service.reorderAssignments(routineId, dayOfWeek, orderedIds))
  }, [run, service])

  const prepareTodayWorkouts = useCallback(async (date) => {
    return run(() => service.prepareTodayWorkouts(date))
  }, [run, service])

  const completeWorkout = useCallback(async (routineId, date) => {
    return run(() => service.completeWorkout(routineId, date))
  }, [run, service])

  return <StorageContext value={{ ...state, mode, retry, reset, applyRecovery, importGuestData, exportSavedData: service.exportSavedData, saveExercise, deleteExercise, saveRoutine, deleteRoutine, saveAssignment, removeAssignment, reorderAssignments, prepareTodayWorkouts, completeWorkout }}>{children}</StorageContext>
}
