# 🚀 Deployment en Render con Neon PostgreSQL

Guía paso a paso para desplegar el sistema con Neon PostgreSQL.

## ✅ Pre-requisitos Completados

- [x] Base de datos Neon PostgreSQL configurada
- [x] Scripts SQL ejecutados (setup-neon.sql, seed.sql, add_user_countries.sql)
- [x] Backend actualizado con soporte SSL para Neon
- [x] Código en GitHub actualizado

## 📋 Variables de Entorno para Render

### Backend (API)

En el dashboard de Render, ir a tu servicio de backend → Environment → Add Environment Variable:

```bash
# 1. Base de Datos (CRÍTICO)
DATABASE_URL=postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require

# 2. JWT Secret (CRÍTICO)
JWT_SECRET=tu-clave-secreta-jwt-super-segura-cambiar-en-produccion

# 3. Frontend URL (CRÍTICO)
FRONTEND_URL=https://muestras-univarsolutions-frontend.onrender.com

# 4. Entorno (CRÍTICO)
NODE_ENV=production

# 5. Puerto (OPCIONAL - Render lo asigna automáticamente)
PORT=3001
```

### Frontend (React)

En el dashboard de Render, ir a tu servicio de frontend → Environment → Add Environment Variable:

```bash
# URL del Backend
VITE_API_URL=https://tu-backend.onrender.com
```

## 🔧 Pasos de Deployment

### 1. Actualizar Variables en Render Backend

1. Ve a: https://dashboard.render.com
2. Selecciona tu servicio de **Backend**
3. Ve a **Environment** en el menú lateral
4. Click en **Add Environment Variable**
5. Agrega **UNA POR UNA** las variables de arriba
6. Click en **Save Changes**

**⚠️ IMPORTANTE:**
- Copia el `DATABASE_URL` **exactamente** como está (incluye `?sslmode=require`)
- NO agregues espacios antes o después
- NO pongas comillas en los valores

### 2. Verificar Deployment del Backend

Después de guardar las variables, Render redesplegará automáticamente.

Espera a que termine y verifica:

```bash
# Verificar salud del backend
curl https://tu-backend.onrender.com/api/health

# Debería responder:
# {"status":"ok","database":"connected"}
```

### 3. Verificar Login

Prueba hacer login con un usuario de prueba:

**Usuarios disponibles:**
- Email: `admin@sample.com`
- Password: `password123`
- Role: ADMIN

O:

- Email: `user@sample.com`
- Password: `password123`
- Role: USER

### 4. Frontend

Si el frontend también necesita actualización:

1. Selecciona tu servicio de **Frontend**
2. Ve a **Environment**
3. Asegúrate que `VITE_API_URL` apunte al backend correcto
4. Guarda y espera el redespliegue

## 🐛 Troubleshooting

### Error: "Database connection failed"

**Causa:** DATABASE_URL mal configurado

**Solución:**
1. Ve a Environment Variables en Render
2. Verifica que `DATABASE_URL` sea exactamente:
   ```
   postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require
   ```
3. NO debe tener espacios al inicio o final
4. Debe incluir `?sslmode=require`

### Error: "SSL connection required"

**Causa:** Falta `?sslmode=require` en la URL

**Solución:**
- Asegúrate que el `DATABASE_URL` termine con `?sslmode=require`

### Error 500: "Internal Server Error"

**Causa:** Falta alguna variable de entorno

**Solución:**
1. Verifica que TODAS estas variables estén configuradas:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`

### Error: "CORS policy blocked"

**Causa:** FRONTEND_URL no coincide con el origen real

**Solución:**
1. En el backend, verifica que `FRONTEND_URL` sea la URL exacta de tu frontend
2. Sin `/` al final
3. Ejemplo: `https://muestras-univarsolutions-frontend.onrender.com`

### Los datos no aparecen

**Causa:** La base de datos está vacía

**Solución:**
Los datos ya fueron insertados cuando ejecuté los scripts. Si por alguna razón no están:

1. Conecta a Neon directamente:
   ```bash
   psql 'postgresql://neondb_owner:npg_Ez8jRiUutQ0W@ep-noisy-truth-afxypmn4-pooler.c-2.us-west-2.aws.neon.tech/Muestras?sslmode=require'
   ```
2. Verifica los datos:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM countries;
   ```

## 📊 Verificación Final

### Checklist de Deployment

- [ ] Variables de entorno configuradas en Render Backend
- [ ] DATABASE_URL tiene el formato correcto con `?sslmode=require`
- [ ] Backend desplegado sin errores
- [ ] `/api/health` responde correctamente
- [ ] Login funciona con usuarios de prueba
- [ ] Frontend conecta al backend
- [ ] Dashboard carga datos correctamente
- [ ] Gráficos se muestran correctamente

### Endpoints para Verificar

Una vez desplegado, prueba estos endpoints:

```bash
# Salud del sistema
GET https://tu-backend.onrender.com/api/health

# Login
POST https://tu-backend.onrender.com/api/auth/login
Body: {"email":"admin@sample.com","password":"password123"}

# Países (requiere token)
GET https://tu-backend.onrender.com/api/countries
Headers: Authorization: Bearer [tu-token]

# Dashboard stats (requiere token)
GET https://tu-backend.onrender.com/api/dashboard/stats
Headers: Authorization: Bearer [tu-token]
```

## 🔐 Seguridad en Producción

### Después del primer deployment exitoso:

1. **Cambiar contraseñas de usuarios de prueba**
   ```sql
   -- Conectar a Neon
   UPDATE users SET hashed_password = crypt('nueva_password_segura', gen_salt('bf'))
   WHERE email = 'admin@sample.com';
   ```

2. **Cambiar JWT_SECRET**
   - Genera un nuevo secret seguro
   - Actualiza en Render Environment Variables
   - Esto invalidará todos los tokens existentes (logout forzado)

3. **Revisar permisos de usuarios**
   - Asegúrate que los roles estén asignados correctamente
   - Verifica que `is_active` sea correcto para cada usuario

## 📱 Acceso a la Aplicación

Una vez todo desplegado:

**Frontend:** https://muestras-univarsolutions-frontend.onrender.com
**Backend API:** https://tu-backend.onrender.com

**Usuarios de prueba:**
- Admin: `admin@sample.com` / `password123`
- User: `user@sample.com` / `password123`

## 🆘 Soporte

Si algo falla:

1. **Revisa los logs en Render**
   - Dashboard → Tu servicio → Logs
   - Busca errores específicos

2. **Revisa las variables de entorno**
   - Dashboard → Tu servicio → Environment
   - Verifica que todas estén configuradas

3. **Prueba la conexión a Neon**
   - Usa el comando psql para conectar directamente
   - Verifica que la base de datos responda

4. **Verifica el código en GitHub**
   - Asegúrate que el último commit está desplegado
   - Manual Deploy si es necesario

## ✅ Estado Actual

- ✅ Base de datos Neon PostgreSQL configurada
- ✅ Tablas creadas (11 tablas)
- ✅ Datos iniciales insertados:
  - 5 países
  - 3 categorías
  - 3 proveedores
  - 3 bodegas
  - 3 ubicaciones
  - 3 responsables
  - 2 usuarios
- ✅ Backend actualizado con soporte SSL
- ✅ Código en GitHub actualizado

**Siguiente paso:** Configurar variables de entorno en Render y redesplegar.
