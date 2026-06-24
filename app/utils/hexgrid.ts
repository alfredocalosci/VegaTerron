import type p5Type from 'p5'

export interface HexCell {
  x: number
  y: number
  col: number
  row: number
}

export function buildHexGrid(width: number, height: number, radius: number): HexCell[] {
  const cells: HexCell[] = []
  const colStep = Math.sqrt(3) * radius
  const rowStep = 1.5 * radius
  const cols = Math.ceil(width / colStep) + 1
  const rows = Math.ceil(height / rowStep) + 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * colStep + (row % 2 === 1 ? colStep / 2 : 0)
      const y = row * rowStep
      cells.push({ x, y, col, row })
    }
  }
  return cells
}

// Edge index matches hexPoints vertex edge order in SVG (y-down):
// edge e is between vertex e and vertex (e+1)%6, facing: 0=SE, 1=SW, 2=W, 3=NW, 4=NE, 5=E
export function getHexNeighbors<T extends HexCell>(
  cell: T,
  cellMap: Map<string, T>
): (T | null)[] {
  const even = cell.row % 2 === 0
  const offsets = even
    ? [[0,+1],[-1,+1],[-1,0],[-1,-1],[0,-1],[+1,0]]
    : [[+1,+1],[0,+1],[-1,0],[0,-1],[+1,-1],[+1,0]]
  return offsets.map(([dc, dr]) =>
    cellMap.get(`${cell.col + dc!},${cell.row + dr!}`) ?? null
  )
}

export interface TextCell {
  x: number
  y: number
  char: string
}

export function buildHexText(col: number, row: number, text: string, radius: number): TextCell[] {
  const colStep = Math.sqrt(3) * radius
  const rowStep = 1.5 * radius
  return text.split('').map((char, i) => {
    const c = col + i
    const x = c * colStep + (row % 2 === 1 ? colStep / 2 : 0)
    const y = row * rowStep
    return { x, y, char }
  })
}

export interface HexNoiseCell extends HexCell {
  noise: number
}

export function buildNoiseField(cells: HexCell[], p: p5Type, scale: number = 0.01, time: number = 0): HexNoiseCell[] {
  return cells.map(cell => ({
    ...cell,
    noise: p.noise(cell.x * scale, cell.y * scale, time)
  }))
}

export function drawHex(p: p5Type, x: number, y: number, radius: number) {
  p.beginShape()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6
    p.vertex(x + radius * Math.cos(angle), y + radius * Math.sin(angle))
  }
  p.endShape(p.CLOSE)
}

export function findHexPath<T extends HexCell>(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  cellMap: Map<string, T>,
  isPassable: (cell: T) => boolean
): T[] {
  const start = cellMap.get(`${startCol},${startRow}`)
  const end = cellMap.get(`${endCol},${endRow}`)
  if (!start || !end || !isPassable(start) || !isPassable(end)) return []

  const key = (c: HexCell) => `${c.col},${c.row}`

  function hexDist(a: HexCell, b: HexCell): number {
    const qa = a.col - Math.floor(a.row / 2)
    const qb = b.col - Math.floor(b.row / 2)
    const dq = qa - qb, dr = a.row - b.row
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
  }

  type Node = { cell: T; g: number; f: number }
  const open: Node[] = [{ cell: start, g: 0, f: hexDist(start, end) }]
  const gScore = new Map<string, number>([[key(start), 0]])
  const cameFrom = new Map<string, T>()
  const closed = new Set<string>()
  const endKey = key(end)

  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const cur = open.shift()!
    const ck = key(cur.cell)

    if (ck === endKey) {
      const result: T[] = [cur.cell]
      let rk = ck
      while (cameFrom.has(rk)) {
        const prev = cameFrom.get(rk)!
        result.unshift(prev)
        rk = key(prev)
      }
      return result
    }

    closed.add(ck)
    for (const nb of getHexNeighbors(cur.cell, cellMap)) {
      if (!nb || !isPassable(nb)) continue
      const nk = key(nb)
      if (closed.has(nk)) continue
      const tg = cur.g + 1
      if (tg >= (gScore.get(nk) ?? Infinity)) continue
      gScore.set(nk, tg)
      cameFrom.set(nk, cur.cell)
      const f = tg + hexDist(nb, end)
      const existing = open.find(n => key(n.cell) === nk)
      if (existing) { existing.g = tg; existing.f = f }
      else open.push({ cell: nb, g: tg, f })
    }
  }
  return []
}
