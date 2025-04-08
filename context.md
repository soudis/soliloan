General

Soliloan is an app that allows projects that are funded via direct loans from private people (crowdinvesting) to manage their loans including:

- create new lenders with contact and banking information
- create new loans for that lenders, update the loans and delete them
- create notes or upload files to lenders or loans
- create transactions for the loans like deposits and withdrawals

The app is multi tenant, so it allows to create, update and delete projects with and administrator account, while a manager account is restricted to only manage the lenders and loans of the projects he has access to. 

The lenders themselves also have a user account, where they can view the loans that they gave to different projects. This is a separate view to the manager / admin view. 

For managers there should be a dashboard showing and overview over all projects. There should be a project selector to go into the project workspace where the manager can then manage the project data (lenders, loans, transactions, notes, uploads)

design:

the design should be very lean, similiar to material ui

The data model is as followed:

model User {
  id            String         @id @default(cuid())
  name          String
  email         String?        @unique
  emailVerified DateTime?
  language      Language       @default(de)
  theme         SoliLoansTheme @default(default)
  password      String?
  image         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  accounts      Account[]
  sessions      Session[]
  managerOf     Instance[]     @relation("ProjectManager")
  isAdmin       Boolean?
  lenders       Lender[]
  views         View[]
  notes         Note[]
  lastLogin     DateTime?
}

model LoanTemplate {
  id              String        @id @default(cuid())
  configurationId String
  configuration   Configuration @relation(fields: [configurationId], references: [id])
  name            String

  interestPaymentType   InterestPaymentType
  interestPayoutType    InterestPayoutType
  terminationType       TerminationType
  terminationPeriod     Int?
  terminationPeriodType DurationType?
  duration              Int?
  durationType          DurationType?
  endDate               DateTime?
  minInterestRate       Decimal?
  maxInterestRate       Decimal?
  minAmount             Decimal?
  maxAmount             Decimal?
}

model Configuration {
  id       String            @id @default(cuid())
  name     String
  logo     String?

  project  Project?

  // instance / project settings
  email   String?
  telNo   String?
  website String?

  street  String?
  addon   String?
  zip     String?
  place   String?
  country Country?
  iban    String?
  bic     String?

  // user defaults
  userLanguage Language?
  userTheme    SoliLoansTheme?

  // lender settings and defaults
  lenderSalutation       Salutation?
  lenderCountry          Country?
  lenderNotificationType NotificationType?
  lenderMembershipStatus MembershipStatus?
  lenderTags             String[]

  // loan settings and defaults
  interestMethod        InterestMethod?
  altInterestMethods    InterestMethod[]
  loanTemplates         LoanTemplate[]
  defaultLoanTemplateId String?
  customLoans           Boolean?
}

model Project {
  id              String         @id @default(cuid())
  slug            String         @unique
  name            String
  configurationId String         @unique
  configuration   Configuration  @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  // duplicate interestMethod on project for performance reasons  
  interestMethod  InterestMethod
  lenders         Lender[]
  changes         Change[]
}

model Lender {
  id               String            @id @default(cuid())
  lenderNumber     Int               @unique @default(autoincrement())
  projectId        String
  project          Project           @relation(fields: [projectId], references: [id])
  type             LenderType
  salutation       Salutation
  firstName        String?
  lastName         String?
  organisationName String?
  titlePrefix      String?
  titleSuffix      String?
  street           String?
  addon            String?
  zip              String?
  place            String?
  country          Country?
  telNo            String?
  email            String?
  iban             String?
  bic              String?
  notificationType NotificationType
  membershipStatus MembershipStatus?
  tag              String?
  loans            Loan[]
  test             String?
  user             User?             @relation(fields: [email], references: [email])
  files            File[]
  notes            Note[]
}

model Loan {
  id                    String              @id @default(cuid())
  loanNumber            Int                 @unique @default(autoincrement())
  lenderId              String
  lender                Lender              @relation(fields: [lenderId], references: [id])
  signDate              DateTime
  interestPaymentType   InterestPaymentType
  interestPayoutType    InterestPayoutType
  terminationType       TerminationType
  endDate               DateTime?
  terminationDate       DateTime?
  terminationPeriod     Int?
  terminationPeriodType DurationType?
  duration              Int?
  durationType          DurationType?
  amount                Decimal
  interestRate          Decimal
  altInterestMethod     InterestMethod?
  contractStatus        ContractStatus
  transactions          Transaction[]
  files                 File[]
  notes                 Note[]
}

model Transaction {
  id          String          @id @default(cuid())
  loanId      String
  loan        Loan            @relation(fields: [loanId], references: [id])
  type        TransactionType
  date        DateTime
  amount      Decimal
  paymentType PaymentType
}

model File {
  id          String  @id @default(cuid())
  mimeType    String
  name        String
  data        Bytes
  public      Boolean
  description String?
  thumbnail   Bytes?
  lenderId    String?
  lender      Lender? @relation(fields: [lenderId], references: [id])
  loanId      String?
  loan        Loan?   @relation(fields: [loanId], references: [id])
}

model Note {
  id          String   @id @default(cuid())
  text        String
  public      Boolean
  lenderId    String?
  lender      Lender?  @relation(fields: [lenderId], references: [id])
  loanId      String?
  loan        Loan?    @relation(fields: [loanId], references: [id])
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime
}


enum LenderType {
  PERSON
  ORGANISATION
}

enum Salutation {
  PERSONAL
  FORMAL
}

enum NotificationType {
  ONLINE
  EMAIL
  MAIL
}

enum MembershipStatus {
  UNKNOWN
  MEMBER
  EXTERNAL
}

enum InterestPaymentType {
  YEARLY
  END
}

enum TerminationType {
  ENDDATE
  TERMINATION
  DURATION
}

enum InterestPayoutType {
  MONEY
  COUPON
}

enum InterestMethod {
  ACT_365_NOCOMPOUND
  E30_360_NOCOMPOUND
  ACT_360_NOCOMPOUND
  ACT_ACT_NOCOMPOUND
  ACT_365_COMPOUND
  E30_360_COMPOUND
  ACT_360_COMPOUND
  ACT_ACT_COMPOUND
}

enum ContractStatus {
  PENDING
  COMPLETED
}

enum DurationType {
  MONTHS
  YEARS
}

enum TransactionType {
  INTEREST
  DEPOSIT
  WITHDRAWAL
  TERMINATION
  INTERESTPAYMENT
  NOTRECLAIMEDPARTIAL
  NOTRECLAIMED
}

enum PaymentType {
  BANK
  CASH
  OTHER
}

There is additional data that is calculated by the system for each loan:

- interest amount until today
- total loan amount (deposits - withrdrawals + interest)