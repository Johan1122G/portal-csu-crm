-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "cr_bex_estadocliente" TEXT NOT NULL DEFAULT 'Activo',
    "industrycode" TEXT,
    "address1_city" TEXT,
    "address1_country" TEXT NOT NULL DEFAULT 'Colombia',
    "cr_bex_tamanoempresa" TEXT,
    "websiteurl" TEXT,
    "cr_bex_primernegocio" TIMESTAMP(3),
    "cr_bex_principalesretos" TEXT,
    "cr_bex_principalesdolores" TEXT,
    "cr_bex_objetivosestrategicos" TEXT,
    "cr_bex_expectativasbext" TEXT,
    "cr_bex_riesgosidentificados" TEXT,
    "cr_bex_oportunidades" TEXT,
    "cr_bex_tienebolsahoras" BOOLEAN NOT NULL DEFAULT false,
    "cr_bex_horascontratadas" INTEGER,
    "cr_bex_horasconsumidas" INTEGER,
    "cr_bex_nivelsatisfaccion" INTEGER,
    "cr_bex_principalessolicitudes" TEXT,
    "cr_bex_niveladopcion" TEXT,
    "cr_bex_clienteestrategico" BOOLEAN NOT NULL DEFAULT false,
    "cr_bex_casoexito" BOOLEAN NOT NULL DEFAULT false,
    "cr_bex_potencialcrecimiento" TEXT,
    "cr_bex_acompanamientoprioritario" BOOLEAN NOT NULL DEFAULT false,
    "cr_bex_comentarioscs" TEXT,
    "description" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cr_bex_tipocontacto" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "jobtitle" TEXT,
    "telephone1" TEXT,
    "emailaddress1" TEXT NOT NULL,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bext_relationships" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cr_bex_rolbext" TEXT NOT NULL,
    "cr_bex_nombrepersona" TEXT NOT NULL,
    "cr_bex_frecuenciacontacto" TEXT,
    "cr_bex_nivelrelacionamiento" TEXT,
    "cr_bex_ultimareunion" TIMESTAMP(3),
    "cr_bex_proximareunion" TIMESTAMP(3),
    "cr_bex_motivoultimocontacto" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bext_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_services" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cr_bex_lineanegocio" TEXT,
    "cr_bex_productoservicio" TEXT NOT NULL,
    "statecode" TEXT NOT NULL DEFAULT 'Activo',
    "activeon" TIMESTAMP(3),
    "expireson" TIMESTAMP(3),
    "cr_bex_responsablebext" TEXT,
    "cr_bex_observaciones" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_activities" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "scheduledstart" TIMESTAMP(3) NOT NULL,
    "cr_bex_tipogestion" TEXT NOT NULL,
    "cr_bex_responsablecs" TEXT,
    "cr_bex_contactocliente" TEXT,
    "cr_bex_canal" TEXT,
    "subject" TEXT,
    "description" TEXT,
    "cr_bex_oportunidad" TEXT,
    "cr_bex_areaescalar" TEXT,
    "statecode" TEXT NOT NULL DEFAULT 'Completada',
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cr_bex_origen" TEXT NOT NULL DEFAULT 'Gestión CS',
    "name" TEXT NOT NULL,
    "cr_bex_tipo" TEXT,
    "cr_bex_impacto" TEXT,
    "prioritycode" TEXT,
    "cr_bex_responsable" TEXT,
    "cr_bex_accionrequerida" TEXT,
    "estimatedclosedate" TIMESTAMP(3),
    "statecode" TEXT NOT NULL DEFAULT 'Pendiente',
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountnumber_key" ON "accounts"("accountnumber");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bext_relationships" ADD CONSTRAINT "bext_relationships_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_services" ADD CONSTRAINT "product_services_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_activities" ADD CONSTRAINT "cs_activities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
