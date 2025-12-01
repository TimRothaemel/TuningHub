import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
    const id = event.queryStringParameters.id;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

    const { data: part, error } = await supabase
        .from('parts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !part) {
        return {
            statusCode: 404,
            body: "Teil wurde nicht gefunden."
        };
    }

    const title = `${part.title} – ${part.price}€`;
    const desc = part.description || "Jetzt auf TuningHub ansehen!";
    const img = part.image_url;

    const redirect = `/src/teile-detail.html?id=${id}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>

    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${img}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://tuninghub.netlify.app/share/${id}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${img}">

    <meta http-equiv="refresh" content="0; url=${redirect}">
</head>
<body>
    <p>Weiterleitung...</p>
    <script>
        window.location.href = "${redirect}";
    </script>
</body>
</html>
`;

    return {
        statusCode: 200,
        headers: { "Content-Type": "text/html" },
        body: html
    };
}