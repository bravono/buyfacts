-- AlterTable
ALTER TABLE "CubiconSession" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "respondentId" TEXT,
ADD COLUMN     "sessionMode" TEXT NOT NULL DEFAULT 'trial';

-- CreateTable
CREATE TABLE "FoundingClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "registrationId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "allowedCallbackDomains" TEXT NOT NULL DEFAULT '[]',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundingClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoundingClient_clientId_key" ON "FoundingClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "FoundingClient_registrationId_key" ON "FoundingClient"("registrationId");

-- AddForeignKey
ALTER TABLE "CubiconSession" ADD CONSTRAINT "CubiconSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "FoundingClient"("clientId") ON DELETE SET NULL ON UPDATE CASCADE;
