# Marianita's snacks

Proyecto del equipo FCS Center para ayudar a Mariana a llevar la tiendita de snacks
en las instalaciones de LG CNS.

Los empleados registran lo que consumen (efectivo, transferencia o fiado) y Mari
lleva las cuentas, el catálogo y el inventario desde un panel protegido por PIN.

## Estructura

| Carpeta                    | Qué es                                                             |
|----------------------------|--------------------------------------------------------------------|
| [`frontend/`](frontend)    | App React + Vite (móvil primero), con i18n en español, inglés y coreano |
| [`backend/`](backend)      | API en Google Apps Script sobre una hoja de Google Sheets           |

No hay servidor propio: el backend es un Web App de Apps Script y los datos viven en
la hoja de cálculo. Ver [`backend/README.md`](backend/README.md) para el esquema, los
permisos de cada acción y el despliegue.

## Poner en marcha el frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # y pega la URL /exec de tu Web App
npm run dev
```

`VITE_API_URL` es la URL del Web App de Apps Script. Sin ella la app arranca pero no
carga datos.

### Scripts

| Comando            | Qué hace                                    |
|--------------------|---------------------------------------------|
| `npm run dev`      | Servidor de desarrollo                      |
| `npm run build`    | Build de producción en `frontend/dist`      |
| `npm run preview`  | Sirve el build ya generado                  |
| `npm run lint`     | ESLint sobre todo el frontend               |
| `npm run test:run` | Tests (Vitest + Testing Library)            |
| `npm run coverage` | Tests con informe de cobertura              |

Las pruebas del backend corren aparte, sin depender de Google:

```bash
node backend/test/seguridad.test.js
```

## Cómo funciona el acceso

- Cada empleado tiene un **PIN de 4 dígitos**. Al validarlo recibe un token firmado
  que dura 12 horas y que autoriza sus peticiones.
- Un registro nuevo queda **pendiente** hasta que Mari lo aprueba desde el panel.
- El panel de Mari pide su propio PIN y su sesión **no** sobrevive a una recarga.
- Todos los permisos se comprueban en el backend, no en la interfaz. Ver la sección
  de autenticación de [`backend/README.md`](backend/README.md#autenticación).

## Licencia

[MIT](LICENSE).
