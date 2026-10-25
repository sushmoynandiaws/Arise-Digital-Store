import json, os, secrets, subprocess
from pathlib import Path

ROOT = Path('/root/.arise-marketplace')
ROOT.mkdir(mode=0o700, exist_ok=True)
os.chmod(ROOT, 0o700)

def run(args, data=None):
    result = subprocess.run(args, input=data, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: {result.stderr[-2500:]}')
    return result.stdout.strip()

def save(path, content, mode=0o600):
    path.write_text(content)
    os.chmod(path, mode)

container = json.loads(run(['docker','inspect','arisesell-postgres']))[0]
pg_env = dict(item.split('=',1) for item in container['Config']['Env'] if '=' in item)
admin = pg_env.get('POSTGRES_USER','postgres')
database = pg_env['POSTGRES_DB']
assert database == 'arisesell_db'

def sql(query):
    return run(['docker','exec','-i','arisesell-postgres','psql','-X','-U',admin,'-d',database,'-At','-v','ON_ERROR_STOP=1'],query)

password_file = ROOT/'database-password'
if not password_file.exists():
    save(password_file,secrets.token_hex(32))
password = password_file.read_text().strip()
assert len(password)==64 and all(c in '0123456789abcdef' for c in password)

sql(Path('/opt/arise-digital-store/migrations/002_postgres.sql').read_text())
sql(Path('/opt/arise-digital-store/migrations/003_reviews.sql').read_text())
sql(Path('/opt/arise-digital-store/migrations/004_shop_pages.sql').read_text())
sql("""BEGIN;
DO $$ BEGIN
IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='arise_marketplace_runtime') THEN
CREATE ROLE arise_marketplace_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT 16 PASSWORD '%s';
END IF;
END $$;
GRANT CONNECT ON DATABASE arisesell_db TO arise_marketplace_runtime;
GRANT USAGE ON SCHEMA arise_marketplace TO arise_marketplace_runtime;
GRANT SELECT ON arise_marketplace.schema_version TO arise_marketplace_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
arise_marketplace.auth_requests, arise_marketplace.sessions, arise_marketplace.moderation,
arise_marketplace.reports, arise_marketplace.rate_limits, arise_marketplace.reviews,
arise_marketplace.shop_pages TO arise_marketplace_runtime;
ALTER ROLE arise_marketplace_runtime IN DATABASE arisesell_db SET search_path TO arise_marketplace, pg_catalog;
ALTER ROLE arise_marketplace_runtime IN DATABASE arisesell_db SET idle_session_timeout TO '30s';
COMMIT;""" % password)
assert sql("SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication FROM pg_roles WHERE rolname='arise_marketplace_runtime'") == 'f'
assert sql("SELECT count(*) FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='arise_marketplace_runtime')") == '0'
assert sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v','m','p') AND has_table_privilege('arise_marketplace_runtime',c.oid,'SELECT,INSERT,UPDATE,DELETE')") == '0'
assert sql('SELECT max(version) FROM arise_marketplace.schema_version') == '3'

pool = ROOT/'pgbouncer'
pool.mkdir(mode=0o755,exist_ok=True)
if not (ROOT/'ca.key').exists():
    run(['openssl','req','-x509','-newkey','rsa:3072','-sha256','-nodes','-days','3650','-keyout',str(ROOT/'ca.key'),'-out',str(pool/'ca.crt'),'-subj','/CN=Arise Marketplace Database CA','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign'])
    os.chmod(ROOT/'ca.key',0o600)

for label, cn, use, target in [('server','187.53.134.195','serverAuth',pool),('client','arise_marketplace_runtime','clientAuth',ROOT)]:
    key, crt = target/f'{label}.key', target/f'{label}.crt'
    if not crt.exists():
        csr = ROOT/f'{label}.csr'
        ext = ROOT/f'{label}.ext'
        save(ext,'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage='+use+'\n'+('subjectAltName=IP:187.53.134.195\n' if label=='server' else ''))
        run(['openssl','req','-new','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(csr),'-subj','/CN='+cn])
        run(['openssl','x509','-req','-in',str(csr),'-CA',str(pool/'ca.crt'),'-CAkey',str(ROOT/'ca.key'),'-CAcreateserial','-out',str(crt),'-days','365','-sha256','-extfile',str(ext)])
    os.chmod(key,0o600)
    run(['openssl','verify','-CAfile',str(pool/'ca.crt'),'-purpose','sslserver' if label=='server' else 'sslclient',str(crt)])

verifier = sql("SELECT rolpassword FROM pg_authid WHERE rolname='arise_marketplace_runtime'")
assert verifier.startswith('SCRAM-SHA-256$')
save(pool/'userlist.txt','"arise_marketplace_runtime" "'+verifier+'"\n')
print('PASS: schema v2, restricted login, zero commerce table privileges, server/client certificates, SCRAM verifier')
