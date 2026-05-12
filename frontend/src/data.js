export const personas = [
  { id: 'marcela',   nombre: 'Marcela Restrepo',  inicial: 'M', area: 'Diseño' },
  { id: 'andres',    nombre: 'Andrés Gutiérrez',  inicial: 'A', area: 'Ingeniería' },
  { id: 'juliana',   nombre: 'Juliana Cardona',   inicial: 'J', area: 'Producto' },
  { id: 'camilo',    nombre: 'Camilo Ríos',       inicial: 'C', area: 'Ingeniería' },
  { id: 'valentina', nombre: 'Valentina Ospina',  inicial: 'V', area: 'Diseño' },
  { id: 'santiago',  nombre: 'Santiago Mejía',    inicial: 'S', area: 'Operaciones' },
  { id: 'laura',     nombre: 'Laura Quintero',    inicial: 'L', area: 'Producto' },
  { id: 'mateo',     nombre: 'Mateo Vásquez',     inicial: 'M', area: 'Ingeniería' },
]

export const productosIniciales = [
  { id: 'jet',       nombre: 'Chocolatina Jet',   emoji: '🍫', precio: 2500, activo: true },
  { id: 'bonbonbum', nombre: 'Bon Bon Bum',       emoji: '🍭', precio: 1000, activo: true },
  { id: 'gomitas',   nombre: 'Gomitas Trululú',   emoji: '🍬', precio: 1500, activo: true },
  { id: 'papitas',   nombre: 'Papitas Margarita', emoji: '🥔', precio: 3500, activo: true },
  { id: 'detodito',  nombre: 'Detodito',          emoji: '🌽', precio: 4000, activo: true },
  { id: 'galleta',   nombre: 'Festival',          emoji: '🍪', precio: 1800, activo: true },
  { id: 'masmelo',   nombre: 'Masmelos',          emoji: '☁️', precio: 2000, activo: true },
  { id: 'chocoramo', nombre: 'Chocoramo',         emoji: '🍰', precio: 3000, activo: true },
  { id: 'mani',      nombre: 'Maní Manimoto',     emoji: '🥜', precio: 2200, activo: false },
]

const hoy = new Date()
const d = (offset) => {
  const x = new Date(hoy)
  x.setDate(hoy.getDate() - offset)
  return x.toISOString()
}

export const comprasIniciales = [
  { id: 'c1',  personaId: 'marcela',   productoId: 'jet',       cantidad: 1, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c2',  personaId: 'marcela',   productoId: 'bonbonbum', cantidad: 2, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c3',  personaId: 'marcela',   productoId: 'papitas',   cantidad: 1, metodo: 'transferencia', fecha: d(1) },
  { id: 'c4',  personaId: 'marcela',   productoId: 'chocoramo', cantidad: 1, metodo: 'efectivo',      fecha: d(2) },
  { id: 'c5',  personaId: 'marcela',   productoId: 'gomitas',   cantidad: 1, metodo: 'transferencia', fecha: d(4) },
  { id: 'c6',  personaId: 'marcela',   productoId: 'jet',       cantidad: 2, metodo: 'efectivo',      fecha: d(5) },
  { id: 'c7',  personaId: 'andres',    productoId: 'detodito',  cantidad: 1, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c8',  personaId: 'andres',    productoId: 'jet',       cantidad: 3, metodo: 'efectivo',      fecha: d(1) },
  { id: 'c9',  personaId: 'andres',    productoId: 'papitas',   cantidad: 1, metodo: 'transferencia', fecha: d(3) },
  { id: 'c10', personaId: 'juliana',   productoId: 'bonbonbum', cantidad: 4, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c11', personaId: 'juliana',   productoId: 'galleta',   cantidad: 2, metodo: 'transferencia', fecha: d(2) },
  { id: 'c12', personaId: 'camilo',    productoId: 'masmelo',   cantidad: 1, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c13', personaId: 'valentina', productoId: 'chocoramo', cantidad: 2, metodo: 'efectivo',      fecha: d(1) },
  { id: 'c14', personaId: 'valentina', productoId: 'jet',       cantidad: 1, metodo: 'transferencia', fecha: d(2) },
  { id: 'c15', personaId: 'santiago',  productoId: 'detodito',  cantidad: 2, metodo: 'efectivo',      fecha: d(0) },
  { id: 'c16', personaId: 'laura',     productoId: 'bonbonbum', cantidad: 3, metodo: 'efectivo',      fecha: d(1) },
  { id: 'c17', personaId: 'laura',     productoId: 'papitas',   cantidad: 1, metodo: 'transferencia', fecha: d(3) },
  { id: 'c18', personaId: 'mateo',     productoId: 'jet',       cantidad: 1, metodo: 'efectivo',      fecha: d(0) },
]

export const fmtCOP = (n) =>
  '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const fechaRelativa = (iso) => {
  const dias = Math.floor((new Date() - new Date(iso)) / (1000 * 60 * 60 * 24))
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 7)  return `Hace ${dias} días`
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}