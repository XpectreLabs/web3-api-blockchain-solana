# AI Coding Instructions & Rules

Este archivo contiene las instrucciones y preferencias de codificación que la IA (Antigravity) debe seguir en este repositorio. Puedes editar este archivo para añadir, quitar o modificar reglas.

## Reglas del Proyecto (NestJS + Solana)

- **Tipado Estricto**: Evitar el uso de `any`. Siempre tipar las respuestas de Solana y las estructuras de datos utilizando interfaces específicas de `@solana/web3.js` o interfaces personalizadas.
- **Validación de Datos**: Todas las rutas y controladores deben validar los inputs (por ejemplo, validar direcciones de Solana usando pipes como `SolanaAddressPipe`, y inputs de consultas usando DTOs de `class-validator`).
- **Manejo de Errores**: Retornar siempre respuestas con códigos de estado HTTP semánticos (400 para BadRequest, 404 para NotFound, etc.) y estructurar las excepciones de forma clara.
- **Datos Sensibles**: No dejar datos sensibles hardcodeados en el código (llaves privadas, credenciales, IPs de wallets específicas u otros secretos). Todo debe manejarse mediante variables de entorno en el archivo `.env`.

## Flujo de Trabajo (Git & Pull Requests)

- **PRs en Cascada (Stacked PRs)**: Al trabajar en tareas complejas, dividir el trabajo en PRs pequeños y en cascada.
- **PR 1 hacia Main**: El primer PR de una serie usualmente debe ir hacia `main`.
- **Formato del PR**: Cada Pull Request debe incluir una descripción clara estructurada con las secciones `Summary`, `Changes`, `Testing` y `Notes`. Todo el contenido del PR debe estar en inglés.
- **Comentarios en el PR**: Añadir notas explicativas importantes en los comentarios del PR de GitHub (por ejemplo, limitaciones de APIs o RPCs externos) redactadas en inglés.

## Guía de Estilo

- **Sin Emojis**: No utilizar emojis en los encabezados, descripciones, commits o comentarios.
- **Idioma del Código y PRs**: Escribir siempre los comentarios en el código, descripciones de commit y Pull Requests en inglés.
- **Estructura**: Organizar el código de forma modular siguiendo la arquitectura de NestJS (Module, Controller, Service).
