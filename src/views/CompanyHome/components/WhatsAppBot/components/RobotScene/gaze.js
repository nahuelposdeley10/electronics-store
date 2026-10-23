// Keep reacting across the viewport without snapping at the canvas edges.
export function getGazeTarget(cursor, origin, viewport) {
  const dx = cursor.x - origin.x
  const dy = cursor.y - origin.y
  const horizontalDepth = Math.max(180, viewport.width * 0.22)
  const verticalDepth = Math.max(140, viewport.height * 0.22)
  return {
    x: dx / Math.hypot(dx, horizontalDepth),
    y: dy / Math.hypot(dy, verticalDepth),
  }
}
