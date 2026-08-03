Database setup (PostgreSQL)

1) Install PostgreSQL (or use an existing server).

2) Create a database and user (example):

```powershell
# create DB and user (run in psql as a superuser)
CREATE DATABASE myapp_db;
CREATE USER myapp_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE myapp_db TO myapp_user;
```

3) Apply the schema:

```powershell
psql -U myapp_user -d myapp_db -f "database/schema.sql"
```

4) Generate bcrypt hashes for passwords and update `database/seed.sql` replacing `<BCRYPT_HASH>` placeholders. Example (Node):

```bash
node -e "console.log(require('bcryptjs').hashSync('YourAdminPassword', 10))"
```

5) Apply the seed:

```powershell
psql -U myapp_user -d myapp_db -f "database/seed.sql"
```

6) Verify admin exists:

```powershell
psql -U myapp_user -d myapp_db -c "SELECT id, email, role FROM users WHERE role='admin';"
```

Notes:
- If you prefer SQLite or MySQL, tell me and I will produce equivalent files.
- Integrate with your application by using the connection string: `postgresql://myapp_user:secure_password@localhost:5432/myapp_db`.
