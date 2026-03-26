# VR Academy - Backend API

API REST para la plataforma educativa VR Academy. Gestión de usuarios, estudiantes y métricas de cursos de realidad virtual.

## Stack

- **NestJS** + TypeScript
- **Prisma ORM** + PostgreSQL
- **Docker Compose** para desarrollo local
- **JWT** para autenticación
- **class-validator** para validación de DTOs
- **bcrypt** para hashing de contraseñas

## Decisiones técnicas

- **PostgreSQL**: Misma base de datos en local (Docker) y producción (Supabase). Sin divergencias entre entornos.
- **Prisma 7 + adapter-pg**: Driver adapter para PostgreSQL con tipado completo y enums a nivel de DB.
- **Enums de Prisma**: `Role` (admin | instructor) y `StudentStatus` (activo | inactivo | completado | abandonado) validados en la base de datos, no solo en código.
- **Roles con guards**: Decoradores `@Roles()` y `RolesGuard` para autorización declarativa en cada endpoint.
- **Scope por instructor**: Los instructores solo acceden a sus propios estudiantes. El filtrado se aplica a nivel de servicio, no de controlador.
- **Métricas en backend**: Las agregaciones del dashboard se calculan con queries de Prisma (`groupBy`, `aggregate`, `count`), no en el frontend.
- **Registro público de instructores**: Los instructores se auto-registran via `/api/auth/register`. Los admins se crean desde el panel de admin o el seed.

## Requisitos

- Node.js >= 18
- Docker y Docker Compose

## Instalación

```bash
cp .env.example .env
npm install
```

`npm install` genera automáticamente el cliente de Prisma via `postinstall`.

## Variables de entorno

Editar `.env`:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://vracademy:vracademy@localhost:5432/vracademy` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `jwt-secret-change-me` |
| `PORT` | Puerto del servidor | `3001` |
| `CORS_ORIGIN` | Orígenes permitidos (separados por coma) | Todos (si no se define) |

## Levantar el proyecto

```bash
# 1. Levantar PostgreSQL local
docker compose up -d

# 2. Sincronizar schema con la base de datos
npm run db:push

# 3. Poblar con datos de prueba
npm run db:seed

# 4. Iniciar en modo desarrollo
npm run start:dev
```

El servidor arranca en `http://localhost:3001`.

Documentación Swagger disponible en `http://localhost:3001/api/docs`.

### Credenciales del seed

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@vracademy.lat` | `admin123` |
| Instructor | `carlos@vracademy.lat` | `pass123` |
| Instructor | `maria@vracademy.lat` | `pass123` |
| Instructor | `jorge@vracademy.lat` | `pass123` |

## Producción

Para apuntar a producción, cambiar `DATABASE_URL` en `.env` a la URL de PostgreSQL de producción y ejecutar:

```bash
npm run db:push
npm run db:seed
npm run build
npm run start:prod
```

## Tests

```bash
npm test
```

39 tests unitarios cubriendo: AuthService, UsersService, StudentsService, DashboardService.

## Endpoints

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registro de instructor |
| POST | `/api/auth/login` | No | Iniciar sesión |
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado |
| PATCH | `/api/auth/change-password` | JWT | Cambiar contraseña |

### Usuarios (solo admin)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/users?page=1&limit=10` | JWT + Admin | Listar usuarios (paginado) |
| GET | `/api/users/:id` | JWT + Admin | Detalle de usuario |
| POST | `/api/users` | JWT + Admin | Crear usuario |
| PATCH | `/api/users/:id` | JWT + Admin | Actualizar usuario |
| DELETE | `/api/users/:id` | JWT + Admin | Eliminar usuario |

### Estudiantes
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/students?page=1&limit=10&status=activo&search=texto` | JWT | Listar (paginado, filtros, búsqueda) |
| GET | `/api/students/:id` | JWT | Detalle |
| POST | `/api/students` | JWT | Crear estudiante |
| PATCH | `/api/students/:id` | JWT | Actualizar |
| DELETE | `/api/students/:id` | JWT | Eliminar |

**Nota:** El instructor solo ve/modifica sus propios estudiantes. El admin ve todos y puede asignar un `instructorId` al crear o actualizar.

### Dashboard
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard` | JWT | Métricas |

Respuesta:
- `totalStudents` — total de estudiantes
- `statusDistribution` — cantidad por estado (`[{name, value}]`)
- `avgProgress` — progreso promedio (%)
- `last7Days` — registros por día (`[{name, complete}]`)
- `instructorRanking` — ranking por estudiantes completados con tasa de completitud (solo admin)

## Estructura

```
├── prisma/
│   ├── schema.prisma       # Modelos y enums
│   ├── seed.ts             # Datos de prueba
│   └── migrations/
├── src/
│   ├── auth/               # Login, registro, JWT, change-password
│   ├── users/              # CRUD usuarios (admin, paginado)
│   ├── students/           # CRUD estudiantes (scoped, paginado, búsqueda)
│   ├── dashboard/          # Métricas y agregaciones
│   ├── common/             # Guards, decorators, filters
│   ├── prisma/             # PrismaService
│   ├── app.module.ts
│   └── main.ts
├── docker-compose.yml
└── .env.example
```
