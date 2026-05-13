const BASE = import.meta.env.VITE_API_URL

export async function getPersonas() {
  const res = await fetch(`${BASE}/personas`)
  return res.json()
}

export async function getProductos() {
  const res = await fetch(`${BASE}/productos`)
  return res.json()
}

export async function postCompra(body) {
  const res = await fetch(`${BASE}/compras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function getResumen({ fechaInicio, fechaFin }) {
  const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
  const res = await fetch(`${BASE}/reportes/resumen?${params}`)
  return res.json()
}