// AI Health Checker - Workers Backend
// V3: Supports AI Analysis with optional D1 Database logging.

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'GET') return new Response('OK', { status: 200, headers: corsHeaders });
        if (request.method === 'OPTIONS') return handleOptions(request);
        if (request.method !== 'POST') return new Response('Use POST', { status: 405 });

        try {
            const { message: userQuery } = await request.json();
            if (!userQuery) throw new Error('Message is required.');

            // --- Phase 1: Web Search ---
            if (!env.SERPER_API_KEY) throw new Error("SERPER_API_KEY missing.");

            const searchRes = await fetch("https://google.serper.dev/search", {
                method: 'POST',
                headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: userQuery })
            });
            const searchData = await searchRes.json();

            const context = searchData.organic?.length
                ? searchData.organic.map((i, idx) => `${idx + 1}. ${i.title}: ${i.snippet}`).join('\n')
                : "No web results found.";

            // --- Phase 2: AI Analysis (Llama-3) ---
            const systemPrompt = `You are a professional AI Health Symptom Checker in Visakhapatnam, India. Date: ${new Date().toDateString()}.
      
      Analyze the symptoms based on the provided web search context.
      Structure your response exactly like this:
      1. ### Detailed Analysis of Possible Conditions
      2. ### Comprehensive Home Care & Remedies
      3. ### Urgent Warning Signs (When to see a Doctor)
      
      Be educational, safe, and detailed. Always include a disclaimer.`;

            const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Context:\n${context}\n\nQuery:\n${userQuery}` }
                ],
                max_tokens: 1536
            });

            // --- Phase 3: Logging (Optional D1 Database) ---
            // If you bind a D1 database named 'DB', logs will be saved here.
            // If not, this step is skipped.
            if (env.DB) {
                const query = "INSERT INTO chat_logs (timestamp, query, response, context) VALUES (?, ?, ?, ?)";
                const timestamp = new Date().toISOString();

                ctx.waitUntil(
                    env.DB.prepare(query)
                        .bind(timestamp, userQuery, aiResponse.response, context)
                        .run()
                        .catch(e => console.error("D1 Log Error:", e))
                );
            }

            return new Response(JSON.stringify({ reply: aiResponse.response }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
};

function handleOptions(request) {
    return new Response(null, { headers: corsHeaders });
}
