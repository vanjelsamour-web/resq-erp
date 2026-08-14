# RESQ ERP database architecture

The application uses PostgreSQL as the system of record. Prisma is the ORM and the schema is stored in `prisma/schema.prisma`.

## Core relationships

- Patient 1 → N Cases
- Patient 1 → N Visits
- Case 1 → N Visits
- Patient 1 → N Invoices
- Case 1 → N Invoices
- Invoice 1 → N Payments
- Patient 1 → N Payments
- Patient N ↔ N Medicine through PatientMedicine

## Design rules

1. `patientNo`, `caseNo`, `visitNo`, `invoiceNo` and `paymentNo` are business identifiers and remain separate from database primary keys.
2. Money uses PostgreSQL `numeric` through Prisma `Decimal(12,2)`; JavaScript floating point is not used as the database source of truth.
3. Relationships use restrictive deletes for financial and clinical records. Cases/visits/invoices are not silently deleted when a patient is removed.
4. A visit may optionally belong to a case. An invoice may optionally belong to a case so standalone invoices remain possible.
5. Payment records belong to an invoice and patient and are never used to overwrite historical payment records.
6. Medicine assignments are modeled separately from the medicine catalogue so dosage/instructions are stored per patient assignment.

## Next database implementation steps

1. Provision a PostgreSQL database.
2. Set `DATABASE_URL` from `.env.example` in the local/runtime environment. Never commit credentials.
3. Install Prisma and generate the client.
4. Create the first migration from `prisma/schema.prisma`.
5. Add a server-side API layer. The browser must not connect directly to PostgreSQL.
6. Replace the current in-memory mock state with API calls, starting with Patients, then Cases, Visits, Invoices and Payments.
7. Add authentication and role-based authorization before exposing real patient data.
