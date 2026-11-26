/** 83.456 -> "1:23.46" */
export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds - mins * 60
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`
}
