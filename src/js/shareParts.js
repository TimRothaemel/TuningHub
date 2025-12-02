import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
    try {
        const id = event.queryStringParameters.id;

        if (!id) {
            return {
                statusCode: 400,
                body: "Fehlende ID."
            };
        }

        // Supabase verbinden
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Teil abrufen
        const { data: part, error } = await supabase
            .from('parts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !part) {
            return {
                statusCode: 404,
                body: "Teil nicht gefunden."
            };
        }

        const title = `${part.title} – ${part.price}€`;
        const desc = part.description || "Jetzt auf TuningHub ansehen!";
        const img = part.image_url;

        // Wohin der Nutzer nach dem OG-Preview hingeht:
        const redirectUrl = `https://tuninghub.netlify.app/src/teile-detail.html?id=${id}`;

        // OG-Preview HTML
        const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">

    <title>${title}</title>

    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${img}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://tuninghub.netlify.app/.netlify/functions/share?id=${id}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${img}">

    <!-- Sofortige Weiterleitung -->
    <meta http-equiv="refresh" content="0; URL='${redirectUrl}'" />
</head>

<body>
    <p>Weiterleitung zu TuningHub...</p>

    <script>
        window.location.href = "${redirectUrl}";
    </script>
</body>
</html>
`;

        return {
            statusCode: 200,
            headers: { "Content-Type": "text/html" },
            body: html
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: "Serverfehler: " + err.message
        };
    }
}