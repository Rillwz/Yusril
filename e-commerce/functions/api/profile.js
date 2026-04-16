export async function onRequestGet(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };

    const url = new URL(context.request.url);
    const uid = parseInt(url.searchParams.get('user_id')) || 1;

    // ❌ VULN: IDOR — tidak ada cek otorisasi
    const userDatabase = {
        1: {
            name: 'Budi Pratama',
            email: 'budi@nexshop.com',
            role: 'Member',
            saldo: 'Rp 250.000',
            alamat: 'Jakarta Selatan'
        },
        2: {
            name: 'Citra Kirana',
            email: 'citra@nexshop.com',
            role: 'Gold Member',
            saldo: 'Rp 1.450.000',
            alamat: 'Surabaya'
        },
        3: {
            name: 'Admin Pusat',
            email: 'admin@nexshop.com',
            role: 'Administrator',
            saldo: 'Rp 99.999.999',
            alamat: 'Akses Privat',
            secret_key: 'NEX-ADMIN-7f3a9b'
        }
    };

    if (userDatabase[uid]) {
        return new Response(JSON.stringify({
            success: true,
            user: userDatabase[uid]
        }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({
        success: false,
        message: 'Pengguna tidak ditemukan'
    }), { headers: corsHeaders });
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true'
        }
    });
}