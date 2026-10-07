// Services keep stable English errors; localize legacy dynamic messages at display.
export const messagePatterns = [
  [/^Exercise added to (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\.$/, match => `Ejercicio agregado al ${['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(match[1])]}.`],
  [/^Exercise moved (up|down)\.$/, match => `Ejercicio movido hacia ${match[1] === 'up' ? 'arriba' : 'abajo'}.`],
  [/^Saved (exercises|routines|assignments) have duplicate IDs\. FORGE cannot safely choose which record to keep\. Download your saved data for recovery; nothing has been changed\.$/, () => 'Los datos guardados tienen identificadores duplicados. FORGE no puede elegir qué registro conservar de forma segura. Descargá tus datos para recuperarlos; nada cambió.'],
  [/^Exclude (\d+) invalid exercise records?\. Valid assignments referencing them stay visible as missing exercises\.$/, match => `Excluir ${match[1]} ${match[1] === '1' ? 'registro de ejercicio inválido' : 'registros de ejercicios inválidos'}. Sus asignaciones válidas siguen visibles como ejercicios no disponibles.`],
  [/^Remove (\d+) invalid images?, keeping the exercise names and muscles\.$/, match => `Eliminar ${match[1]} ${match[1] === '1' ? 'imagen inválida' : 'imágenes inválidas'}, conservando los nombres y los músculos de los ejercicios.`],
  [/^Exclude (\d+) invalid routine records?\.$/, match => `Excluir ${match[1]} ${match[1] === '1' ? 'registro de rutina inválido' : 'registros de rutinas inválidos'}.`],
  [/^Exclude (\d+) invalid or dependent assignment records?\.$/, match => `Excluir ${match[1]} ${match[1] === '1' ? 'asignación inválida o dependiente' : 'asignaciones inválidas o dependientes'}.`],
  [/^Remove (\d+) duplicate completion records?\. Keep the earliest valid completion for each routine\/date, breaking timestamp ties by ID\.$/, match => `Eliminar ${match[1]} ${match[1] === '1' ? 'registro de entrenamiento completado duplicado' : 'registros de entrenamientos completados duplicados'}. Conservar el primer registro válido por rutina y fecha; resolver coincidencias de hora por identificador.`],
  [/^Password should be at least (\d+) characters\.?$/, match => `La contraseña debe tener al menos ${match[1]} caracteres.`],
  [/^For security purposes, you can only request this after (\d+) seconds\.?$/, match => `Por seguridad, esperá ${match[1]} segundos antes de volver a solicitarlo.`],
]
