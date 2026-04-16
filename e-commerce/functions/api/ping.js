// ============================================
// Cloudflare Pages Function: /api/ping
// ❌ VULNERABILITY: Command Injection simulation
// ============================================

export async function onRequestPost(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };

    try {
        const body = await context.request.json();
        const target = body.target || '127.0.0.1';

        let output = `> ping ${target}\n`;
        output += `PING ${target.split(/[;|&`$]/)[0]} (127.0.0.1): 56 data bytes\n`;
        output += `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042ms\n`;

        // ❌ Simulasi Command Injection
        const isInjected = /[;&|`$(){}]/.test(target);

        if (isInjected) {
            output += `\n[!] INJECTION DETECTED → perintah tambahan:\n`;
            const injectPart = target.toLowerCase();

            if (injectPart.includes('whoami')) {
                output += `uid=33(www-data) gid=33(www-data) groups=33(www-data)\n`;
            }
            if (injectPart.includes('ls')) {
                output += `index.html  functions/  .env  secret.txt  config.js\n`;
            }
            if (injectPart.includes('cat /etc/passwd')) {
                output += `root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www\nnobody:x:65534:65534:nobody:/nonexistent\n`;
            }
            if (injectPart.includes('id')) {
                output += `uid=33(www-data) gid=33(www-data) context=system_u:system_r:httpd_t\n`;
            }
            if (injectPart.includes('env')) {
                output += `DB_HOST=localhost\nDB_USER=nexshop_admin\nDB_PASS=Sup3rS3cret!\nAWS_SECRET=AKIAIOSFODNN7EXAMPLE\n`;
            }
            output += `\n⚠️ Eksekusi perintah sistem berhasil (RCE)`;
        } else {
            output += `\n--- ${target} ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss`;
        }

        return new Response(JSON.stringify({
            success: true,
            output: output,
            injected: isInjected
        }), { headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({
            success: false,
            output: `Error: ${err.message}`
        }), { headers: corsHeaders });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}