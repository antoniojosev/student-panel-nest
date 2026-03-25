# VR Academy - Prueba Tecnica Fullstack

## Objetivo
Plataforma SaaS educativa con VR para gestion de estudiantes y cursos. Evaluacion tecnica fullstack.

## Stack
- **Backend**: NestJS + TypeScript
- **Base de datos**: SQLite + Prisma ORM
- **Frontend**: React + TypeScript + MUI (Berry Template) — fase posterior
- **Auth**: JWT (access + refresh tokens)
- **Estado frontend**: TanStack Query — fase posterior

## Fases de desarrollo
1. **FASE 1 (actual): Backend completo**
   - Modelos y migraciones
   - Auth (registro, login, JWT, roles)
   - CRUD usuarios (admin only)
   - CRUD estudiantes (con scope por instructor)
   - Endpoints de metricas/dashboard
   - Validaciones y manejo de errores
2. **FASE 2: Frontend**
3. **FASE 3: Pulido, tests, deploy**
4. **FASE 4 (si hay tiempo): Bonus (WebRTC, etc)**

## Entidades

### Usuario
- email (unique), password (hashed), nombre, rol (admin | instructor)
- Admin: CRUD usuarios + metricas globales
- Instructor: solo sus estudiantes + sus metricas

### Estudiante
- nombre, email, institucion, curso_asignado, progreso (0-100)
- estado (activo | inactivo | completado | abandonado)
- fecha_registro, instructor_id (relacion obligatoria)

## Metricas del Dashboard
- Total de estudiantes (card)
- Distribucion por estado (chart)
- Progreso promedio (card %)
- Registros ultimos 7 dias (linea diaria)
- Ranking instructores por estudiantes completados (tabla)
- **Regla**: instructor ve solo lo suyo, admin ve todo

## Criterios de evaluacion clave
- Arquitectura limpia, SOLID, separacion de responsabilidades
- TypeScript estricto (no `any`)
- Auth + autorizacion por roles correcta
- Metricas con queries en backend, no en frontend
- Manejo de errores consistente
- Validaciones en DTOs
- README con decisiones tecnicas justificadas

## Comandos
```bash
# Backend
cd backend
npm run start:dev          # Desarrollo
npm run build              # Build
npm run test               # Tests
npx prisma migrate dev     # Migraciones
npx prisma generate        # Generar cliente
npx prisma studio          # UI de base de datos
```

## Estructura Backend (NestJS)
```
backend/
├── src/
│   ├── auth/              # Login, registro, JWT strategy, guards
│   ├── users/             # CRUD usuarios (admin)
│   ├── students/          # CRUD estudiantes (scoped por instructor)
│   ├── dashboard/         # Endpoints de metricas
│   ├── common/            # Guards, decorators, filters, pipes
│   └── prisma/            # Prisma service
├── prisma/
│   └── schema.prisma
└── test/
```

## Convenciones
- Nombres de archivos: kebab-case
- DTOs con class-validator para validacion
- Guards para auth y roles
- Custom decorators: @Roles(), @CurrentUser()
- Responses consistentes con shape uniforme
- Errores HTTP con mensajes descriptivos
