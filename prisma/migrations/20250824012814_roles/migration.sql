-- CreateTable
CREATE TABLE "public"."Rol" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRol" (
    "rolId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "UserRol_pkey" PRIMARY KEY ("rolId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_name_key" ON "public"."Rol"("name");

-- AddForeignKey
ALTER TABLE "public"."UserRol" ADD CONSTRAINT "UserRol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRol" ADD CONSTRAINT "UserRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "public"."Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
