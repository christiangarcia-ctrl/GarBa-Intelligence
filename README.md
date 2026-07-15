# GarBa Intelligence — Planeación Patrimonial

Micrositio estático, independiente de GarBa Advisor, diseñado para publicarse en GitHub Pages.

## Estado actual

- Portal central funcional y responsive.
- Navegación independiente a las tres herramientas.
- Páginas base separadas para cada módulo.
- Arquitectura preparada para almacenamiento local y descargas futuras.

## Estructura

```text
/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/main.js
├── mi-ruta-de-retiro/
│   └── index.html
├── control-financiero-mensual/
│   └── index.html
└── radar-proteccion-familiar/
    └── index.html
```

## Publicar en GitHub Pages

1. Crear un repositorio nuevo, por ejemplo `garba-intelligence`.
2. Subir todo el contenido de esta carpeta a la rama `main`.
3. Abrir `Settings > Pages`.
4. En `Build and deployment`, seleccionar `Deploy from a branch`.
5. Elegir `main` y la carpeta `/root`.
6. Guardar.

## Arquitectura funcional propuesta

### Portal central

1. Hero y promesa de valor.
2. Origen de las herramientas.
3. Cómo llegaron al usuario.
4. Tarjetas principales de acceso.
5. Principios de experiencia.
6. Perfil de Christian García y GarBa.
7. Aviso legal.

### Patrón de cada herramienta

1. Bienvenida y explicación.
2. Qué información conviene tener a la mano.
3. Captura guiada por pasos.
4. Revisión de datos.
5. Análisis y lectura personalizada.
6. Simulador de escenarios.
7. Recomendaciones y prioridades.
8. Descargas.
9. Actualizar datos o limpiar sesión.

### Persistencia

- `localStorage` por herramienta.
- Claves separadas para evitar cruces de información.
- Guardado automático después de cada cambio.
- Botón explícito para limpiar datos.

### Descargas

- CSV generado en el navegador.
- PDF generado del lado del cliente, sin backend.
- No se prometerá Excel nativo hasta validar una librería compatible y estable con GitHub Pages.

## Experiencia privada de acceso

La versión actual incluye una antesala ceremonial que solicita nombre completo y correo para crear una sensación de ingreso privado y personal. No consulta usuarios autorizados, no usa contraseñas y no valida el correo contra ningún servicio.

- Al pulsar **Acceder a mi espacio**, se muestra la transición “Preparando tu espacio patrimonial”.
- La sesión se guarda localmente con la clave `garbaIntelligence.session.v1`.
- El portal personaliza textos con el primer nombre.
- Las páginas internas regresan a la antesala cuando no existe una sesión local.
- **Cambiar de usuario** elimina solamente la identidad activa y conserva los avances.
- **Cerrar sesión** elimina toda la información local cuyo prefijo sea `garbaIntelligence.`.
- Ningún dato se envía a servidores en esta etapa.
