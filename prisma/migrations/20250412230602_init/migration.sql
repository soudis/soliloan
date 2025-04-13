-- CreateEnum
CREATE TYPE "LenderType" AS ENUM ('PERSON', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "Salutation" AS ENUM ('PERSONAL', 'FORMAL');

-- CreateEnum
CREATE TYPE "ViewType" AS ENUM ('LENDER', 'LOAN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ONLINE', 'EMAIL', 'MAIL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('UNKNOWN', 'MEMBER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "InterestPaymentType" AS ENUM ('YEARLY', 'END');

-- CreateEnum
CREATE TYPE "TerminationType" AS ENUM ('ENDDATE', 'TERMINATION', 'DURATION');

-- CreateEnum
CREATE TYPE "InterestPayoutType" AS ENUM ('MONEY', 'COUPON');

-- CreateEnum
CREATE TYPE "InterestMethod" AS ENUM ('ACT_365_NOCOMPOUND', 'E30_360_NOCOMPOUND', 'ACT_360_NOCOMPOUND', 'ACT_ACT_NOCOMPOUND', 'ACT_365_COMPOUND', 'E30_360_COMPOUND', 'ACT_360_COMPOUND', 'ACT_ACT_COMPOUND');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INTEREST', 'DEPOSIT', 'WITHDRAWAL', 'TERMINATION', 'INTERESTPAYMENT', 'NOTRECLAIMEDPARTIAL', 'NOTRECLAIMED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BANK', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('de', 'en');

-- CreateEnum
CREATE TYPE "SoliLoansTheme" AS ENUM ('default', 'dark', 'light');

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('DE', 'AT', 'CH', 'US', 'GB', 'FR', 'IT', 'ES', 'NL', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'LU', 'IE', 'PT', 'GR');

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "language" "Language" NOT NULL DEFAULT 'de',
    "theme" "SoliLoansTheme" NOT NULL DEFAULT 'default',
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAdmin" BOOLEAN,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanTemplate" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interestPaymentType" "InterestPaymentType" NOT NULL,
    "interestPayoutType" "InterestPayoutType" NOT NULL,
    "terminationType" "TerminationType" NOT NULL,
    "terminationPeriod" INTEGER,
    "terminationPeriodType" "DurationType",
    "duration" INTEGER,
    "durationType" "DurationType",
    "endDate" TIMESTAMP(3),
    "minInterestRate" DOUBLE PRECISION,
    "maxInterestRate" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,

    CONSTRAINT "LoanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "email" TEXT,
    "telNo" TEXT,
    "website" TEXT,
    "street" TEXT,
    "addon" TEXT,
    "zip" TEXT,
    "place" TEXT,
    "country" "Country",
    "iban" TEXT,
    "bic" TEXT,
    "userLanguage" "Language",
    "userTheme" "SoliLoansTheme",
    "lenderSalutation" "Salutation",
    "lenderCountry" "Country",
    "lenderNotificationType" "NotificationType",
    "lenderMembershipStatus" "MembershipStatus",
    "lenderTags" TEXT[],
    "interestMethod" "InterestMethod",
    "altInterestMethods" "InterestMethod"[],
    "defaultLoanTemplateId" TEXT,
    "customLoans" BOOLEAN,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "interestMethod" "InterestMethod" NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "lenderNumber" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "LenderType" NOT NULL,
    "salutation" "Salutation" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "organisationName" TEXT,
    "titlePrefix" TEXT,
    "titleSuffix" TEXT,
    "street" TEXT,
    "addon" TEXT,
    "zip" TEXT,
    "place" TEXT,
    "country" "Country",
    "telNo" TEXT,
    "email" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "notificationType" "NotificationType" NOT NULL,
    "membershipStatus" "MembershipStatus",
    "tag" TEXT,
    "test" TEXT,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "loanNumber" SERIAL NOT NULL,
    "lenderId" TEXT NOT NULL,
    "signDate" TIMESTAMP(3) NOT NULL,
    "interestPaymentType" "InterestPaymentType" NOT NULL,
    "interestPayoutType" "InterestPayoutType" NOT NULL,
    "terminationType" "TerminationType" NOT NULL,
    "endDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "terminationPeriod" INTEGER,
    "terminationPeriodType" "DurationType",
    "duration" INTEGER,
    "durationType" "DurationType",
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "altInterestMethod" "InterestMethod",
    "contractStatus" "ContractStatus" NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "note" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "public" BOOLEAN NOT NULL,
    "description" TEXT,
    "thumbnail" BYTEA,
    "lenderId" TEXT,
    "loanId" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL,
    "lenderId" TEXT,
    "loanId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "View" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ViewType" NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "View_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "_ProjectManager" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectManager_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_configurationId_key" ON "Project"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "Lender_lenderNumber_key" ON "Lender"("lenderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanNumber_key" ON "Loan"("loanNumber");

-- CreateIndex
CREATE INDEX "_ProjectManager_B_index" ON "_ProjectManager"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanTemplate" ADD CONSTRAINT "LoanTemplate_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lender" ADD CONSTRAINT "Lender_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lender" ADD CONSTRAINT "Lender_email_fkey" FOREIGN KEY ("email") REFERENCES "User"("email") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Lender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectManager" ADD CONSTRAINT "_ProjectManager_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectManager" ADD CONSTRAINT "_ProjectManager_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
