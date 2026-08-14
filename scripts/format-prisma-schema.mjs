import fs from 'node:fs';
const path='prisma/schema.prisma';let s=fs.readFileSync(path,'utf8');
s=s.replace(/generator client \{ provider = "prisma-client-js" \}/,'generator client {\n  provider = "prisma-client-js"\n}');
s=s.replace(/datasource db \{ provider = "postgresql" url = env\("DATABASE_URL"\) \}/,'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}');
s=s.replace(/(@@index\([^\n]*?\))\s+(?=@@index)/g,'$1\n');
fs.writeFileSync(path,s);
