# Deploy en Render - Sistema de Gestión de Muestras

## Configuración de Base de Datos

**Base de datos PostgreSQL en Render:**
- Nombre: `muestras_db`
- URL Externa: `postgresql://muestras_db_user:CFXNetaFqTFJmXI0hCZoEtjOAggyPajw@dpg-d38c2sffte5s73bv4lq0-a.oregon-postgres.render.com/muestras_db`

## Configuración del Backend

### 1. Crear Web Service en Render

**Build Settings:**
- **Build Command:** `npm run render-build`
- **Start Command:** `npm start`
- **Root Directory:** `backend`

### 2. Variables de Entorno del Backend

Configurar estas variables en el panel de Render:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://muestras_db_user:CFXNetaFqTFJmXI0hCZoEtjOAggyPajw@dpg-d38c2sffte5s73bv4lq0-a.oregon-postgres.render.com/muestras_db
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
FRONTEND_URL=https://tu-frontend-app.onrender.com
CORS_ORIGIN=https://tu-frontend-app.onrender.com
```

**⚠️ IMPORTANTE:** Cambiar `JWT_SECRET` por un valor seguro y `FRONTEND_URL` por la URL real del frontend.

## Configuración del Frontend

### 1. Crear Static Site en Render

**Build Settings:**
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Root Directory:** `frontend`

### 2. Variables de Entorno del Frontend

```env
VITE_API_URL=https://tu-backend-app.onrender.com
NODE_ENV=production
```

**⚠️ IMPORTANTE:** Cambiar `VITE_API_URL` por la URL real del backend en Render.

## Orden de Despliegue

1. **Primero:** Desplegar el Backend
2. **Segundo:** Obtener la URL del backend
3. **Tercero:** Actualizar `VITE_API_URL` en las variables del frontend
4. **Cuarto:** Desplegar el Frontend
5. **Quinto:** Actualizar `FRONTEND_URL` en las variables del backend

## Scripts de Base de Datos

Para ejecutar las migraciones en producción, una vez desplegado el backend:

```bash
# Conectarse a la base de datos y ejecutar manualmente los scripts:
# 1. backend/database/schema.sql
# 2. backend/database/seed.sql
```

## Verificación

1. **Backend:** Verificar que `https://tu-backend-app.onrender.com/health` responda correctamente
2. **Frontend:** Verificar que la aplicación cargue y pueda hacer login
3. **Base de datos:** Verificar que existan usuarios y datos de prueba

## Credenciales por Defecto

Después de ejecutar las migraciones, usar estas credenciales para probar:

- **Email:** admin@ejemplo.com
- **Contraseña:** admin123

## Notas Importantes

- El primer deploy puede tardar varios minutos
- Render reinicia los servicios automáticamente después de 15 minutos de inactividad
- Los logs están disponibles en el panel de Render para debugging