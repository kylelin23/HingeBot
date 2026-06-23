export function getCalibration(n) {
  let color, label
  if (n === 0) {
    color = '#97969f'
    label = 'No examples yet — add a few so it can find your rhythm.'
  } else if (n < 3) {
    color = '#6e8cff'
    label = `${n} example${n === 1 ? '' : 's'} — early signal, still finding the shape of how you write.`
  } else if (n < 8) {
    color = '#d9b36c'
    label = `${n} examples — good signal. It's picking up your rhythm.`
  } else {
    color = '#ff8a65'
    label = `${n} examples — strong match. This is sounding like you.`
  }

  const width = 600, height = 60, mid = height / 2
  const points = 40
  const amp = Math.min(4 + n * 1.6, 22)
  let d = `M0 ${mid}`
  for (let i = 1; i <= points; i++) {
    const x = (width / points) * i
    const phase = i * 0.85 + n * 0.4
    const y = mid + Math.sin(phase) * amp * 0.6 + Math.sin(phase * 2.1 + n) * amp * 0.4
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }

  return { count: n, color, label, path: d }
}