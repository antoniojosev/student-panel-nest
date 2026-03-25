# VR Academy - Backend API

API REST para la plataforma educativa VR Academy. Gestión de usuarios, estudiantes y métricas de cursos de realidad virtual.

## Stack

- **NestJS** + TypeScript
- **Prisma ORM** + SQLite (via LibSQL adapter)
- **JWT** para autenticación
- **class-validator** para validación de DTOs
- **bcrypt** para hashing de contraseñas

## Decisiones técnicas

- **SQLite**: Base de datos ligera sin dependencias externas. Ideal para desarrollo y demos. La migración a PostgreSQL solo requiere cambiar el adapter en Prisma.
- **Prisma 7 + LibSQL**: Adapter nativo para SQLite con soporte completo de migraciones y tipado.
- **Roles con guards**: Decoradores `@Roles()` y `RolesGuard` para autorización declarativa en cada endpoint.
- **Scope por instructor**: Los instructores solo acceden a sus propios estudiantes. El filtrado se aplica a nivel de servicio, no de controlador.
- **Métricas en backend**: Las agregaciones del dashboard se calculan con queries de Prisma (`groupBy`, `aggregate`, `count`), no en el frontend.
- **Sin registro público**: Los usuarios los crea el admin desde el panel. El admin default se genera con el seed.

## Requisitos

- Node.js >= 18

## Instalación

```bash
cd backend
cp .env.example .env
npm install
```

`npm install` genera automáticamente el cliente de Prisma via `postinstall`.

## Variables de entorno

Editar `.env` si es necesario:


| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Ruta al archivo SQLite | `file:./prisma/dev.db` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `jwt-secret-change-me` |
| `PORT` | Puerto del servidor | `3001` |

## Base de datos

Crear la base de datos y aplicar migraciones:

```bash
npx prisma migrate dev
```

## Seed

Poblar la base de datos con datos de prueba (4 usuarios + 30 estudiantes):

```bash
npx prisma db seed
```

### Credenciales del seed

| Rol | Email | Password |
|-----|-------|----------|
| Admin | `admin@vracademy.lat` | `admin123` |
| Instructor | `carlos@vracademy.lat` | `pass123` |
| Instructor | `maria@vracademy.lat` | `pass123` |
| Instructor | `jorge@vracademy.lat` | `pass123` |

## Ejecutar

```bash
# Desarrollo (watch mode)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

El servidor arranca en `http://localhost:3001`.

## Tests

```bash
npm test
```

37 tests unitarios cubriendo: AuthService, UsersService, StudentsService, DashboardService.

## Endpoints

### Auth
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Iniciar sesión |
| GET | `/api/auth/me` | JWT | Perfil del usuario autenticado |

### Usuarios (solo admin)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/users` | JWT + Admin | Listar usuarios |
| GET | `/api/users/:id` | JWT + Admin | Detalle de usuario |
| POST | `/api/users` | JWT + Admin | Crear usuario |
| PATCH | `/api/users/:id` | JWT + Admin | Actualizar usuario |
| DELETE | `/api/users/:id` | JWT + Admin | Eliminar usuario |

### Estudiantes
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/students` | JWT | Listar (paginado, filtros) |
| GET | `/api/students/:id` | JWT | Detalle |
| POST | `/api/students` | JWT | Crear estudiante |
| PATCH | `/api/students/:id` | JWT | Actualizar |
| DELETE | `/api/students/:id` | JWT | Eliminar |

**Query params de listado:** `?page=1&limit=10&status=activo&search=texto`

**Nota:** El instructor solo ve/modifica sus propios estudiantes. El admin ve todos y puede asignar un `instructorId` al crear.

### Dashboard
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard` | JWT | Métricas |

Respuesta:
- `totalStudents` — total de estudiantes
- `statusDistribution` — cantidad por estado
- `avgProgress` — progreso promedio (%)
- `last7Days` — registros por día (últimos 7 días)
- `instructorRanking` — ranking por estudiantes completados (solo admin)

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma       # Modelos de datos
│   ├── seed.ts             # Datos de prueba
│   └── migrations/
├── src/
│   ├── auth/               # Login, JWT, guards
│   ├── users/              # CRUD usuarios (admin)
│   ├── students/           # CRUD estudiantes (scoped)
│   ├── dashboard/          # Métricas y agregaciones
│   ├── common/             # Guards, decorators, filters
│   ├── prisma/             # PrismaService
│   ├── app.module.ts
│   └── main.ts
└── .env.example
```
