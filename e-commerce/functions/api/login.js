export async function onRequestPost(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
        'Content-Type': 'application/json'
    };

    try {
        const body = await context.request.json();
        const { username, password, action } = body;

        // Handle logout
        if (action === 'logout') {
            return new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
                headers: {
                    ...corsHeaders,
                    'Set-Cookie': 'nex_session=; Path=/; Max-Age=0, nex_token=; Path=/; Max-Age=0'
                }
            });
        }

        // ❌ VULN: Hardcoded plain text credentials
        const validUsers = {
            'admin': { password: 'admin123', role: 'administrator', user_id: 3 },
            'user':  { password: 'user123',  role: 'member',       user_id: 1 },
            'citra': { password: 'citra456', role: 'gold_member',  user_id: 2 }
        };

        if (!username || !password) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Username dan password wajib diisi'
            }), { headers: corsHeaders });
        }

        // ❌ VULN: Information disclosure (reveal if user exists)
        if (!validUsers[username]) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Username atau password salah',
                debug_user_exists: false
            }), { headers: corsHeaders });
        }

        const user = validUsers[username];

        if (password !== user.password) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Username atau password salah',
                debug_user_exists: true,
                debug_hint: 'password_mismatch'
            }), { headers: corsHeaders });
        }

        // ✅ FIX: btoa() bukan Buffer (Web API, ada di Workers)
        const raw = `${username}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        const token = btoa(raw);

        return new Response(JSON.stringify({
            success: true,
            message: 'Login berhasil',
            username: username,
            role: user.role,
            user_id: user.user_id,
            token: token,
            server_time: new Date().toISOString()
        }), {
            headers: {
                ...corsHeaders,
                'Set-Cookie': `nex_session=${encodeURIComponent(username)}; Path=/; Max-Age=3600, nex_token=${token}; Path=/; Max-Age=3600`
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            success: false,
            message: 'Server error: ' + err.message
        }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}