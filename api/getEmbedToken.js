// Genera un embed token de Power BI usando un service principal (Azure AD).
// Requiere variables de entorno configuradas en Vercel (ver README.md).
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const {
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    POWERBI_WORKSPACE_ID,
    POWERBI_REPORT_ID,
  } = process.env;

  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !POWERBI_WORKSPACE_ID || !POWERBI_REPORT_ID) {
    res.status(500).json({ error: 'Faltan variables de entorno de Power BI en el servidor.' });
    return;
  }

  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Autenticación con Azure AD falló (${tokenResponse.status})`);
    }
    const { access_token: aadToken } = await tokenResponse.json();

    const reportResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_WORKSPACE_ID}/reports/${POWERBI_REPORT_ID}`,
      { headers: { Authorization: `Bearer ${aadToken}` } }
    );
    if (!reportResponse.ok) {
      throw new Error(`No se pudo obtener el reporte (${reportResponse.status})`);
    }
    const report = await reportResponse.json();

    const embedTokenResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_WORKSPACE_ID}/reports/${POWERBI_REPORT_ID}/GenerateToken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aadToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessLevel: 'View' }),
      }
    );
    if (!embedTokenResponse.ok) {
      throw new Error(`No se pudo generar el embed token (${embedTokenResponse.status})`);
    }
    const { token: embedToken } = await embedTokenResponse.json();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      embedUrl: report.embedUrl,
      reportId: report.id,
      embedToken,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
