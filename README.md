# Proyecto e-Learning UST 2026-1

Dashboard estático (`index.html`) desplegado en Vercel, con un reporte de Power BI
embebido de forma privada (Power BI Embedded con service principal) mediante una
función serverless (`api/getEmbedToken.js`).

## Por qué esta arquitectura

El reporte de Power BI no puede ser público, así que no se usa "Publicar en la
Web". En su lugar, el navegador nunca ve credenciales: la función serverless en
Vercel se autentica contra Azure AD con un service principal y genera un
*embed token* de corta duración que el frontend usa solo para renderizar el
reporte con `powerbi-client`. Los datos se ven en vivo (sin rebuilds ni copias
estáticas) cada vez que alguien abre la página.

## 1. Registrar la app en Azure AD (service principal)

1. Portal de Azure > **Azure Active Directory** > **Registros de aplicaciones** > **Nuevo registro**.
2. Anota el **Application (client) ID** y el **Directory (tenant) ID**.
3. En **Certificados y secretos**, crea un **Client secret** nuevo y guarda su valor (solo se muestra una vez).

## 2. Habilitar el service principal en Power BI

1. En el [portal de administración de Power BI](https://app.powerbi.com/admin-portal),
   ve a **Configuración del inquilino** > **Configuración de desarrollador** >
   **Los service principals pueden usar las API de Power BI** y actívalo
   (idealmente restringido a un grupo de seguridad que incluya la app registrada).
2. En el **workspace** donde está el reporte, agrega la app (por su nombre/Client ID)
   como miembro con rol **Member** o **Viewer**.
3. Anota el **Workspace ID** (en la URL del workspace) y el **Report ID** (en la
   URL del reporte, `.../reports/<REPORT_ID>/...`).

## 3. Variables de entorno en Vercel

En el proyecto de Vercel, **Settings > Environment Variables**, agrega (ver `.env.example`):

| Variable | Valor |
|---|---|
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_CLIENT_SECRET` | Client secret generado |
| `POWERBI_WORKSPACE_ID` | ID del workspace |
| `POWERBI_REPORT_ID` | ID del reporte |

## 4. Conectar el repo a Vercel

1. En Vercel: **Add New > Project** > importar este repositorio de GitHub.
2. Framework preset: **Other** (es HTML estático + funciones en `/api`).
3. Deploy. Cada push a la rama conectada volverá a desplegar automáticamente.

## Notas

- El embed token generado es de corta duración y de solo lectura (`accessLevel: "View"`);
  se solicita uno nuevo cada vez que se carga la página.
- Si Power BI Embedded requiere capacidad (Premium/Fabric o capacidad A-SKU) para
  este workspace, confírmalo con el administrador del tenant antes de desplegar.
