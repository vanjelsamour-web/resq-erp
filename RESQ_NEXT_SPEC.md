# RESQ ERP Next Upgrade

Implement as a coherent production module, not placeholder buttons.

## Users & security
- Real roles: Doctor, Nurse, Manager, Accounting.
- Multiple roles per employee; effective permissions are the union of assigned roles.
- Profile menu: name, email, roles, My Profile, Change Password, Logout.
- Employee edit, activate/deactivate, password reset by authorized manager/admin.
- Role-based notifications and audit trail.
- Settings: organization, invoicing, VAT, inventory, users/roles, notifications, security.

## Inventory
- Edit materials/medicines and quantities.
- Stock adjustment with mandatory reason and audit log.
- Every issue records employee, patient, case, quantity, cost, billable amount.
- Material charges can flow to patient/case billing.
- Automatic stock balance.
- Purchase order and automatic purchase suggestion based on stock/minimum/usage.
- Supplier invoice/receipt can increase stock.

## Finance
- Customer invoices: Cash or Credit.
- Edit Draft invoices.
- Payment records: cash/card/bank transfer, partial/full settlement.
- Receipt generated from payment.
- Credit Note and Advance Payment as separate document types.
- PDF and print for invoices and receipts.
- VAT, revenue, expenses, case cost and profit.
- No generic approval requirement for invoices.

## OCR / imports
- Supplier invoice upload by photo/PDF with OCR extraction and mandatory review before posting.
- CSV patient import with column mapping, preview, duplicate detection and validation.

## Reports
- Real working reports, backed by PostgreSQL: financial summary, invoices/payments, case profitability, inventory, staff activity, VAT, with filters and PDF/print/export where appropriate.

## Acceptance criteria
- No UI-only report cards.
- No destructive edits to financial/stock history; use audit trail/adjustments/credit notes.
- Build must pass `npm run build`.
- Existing PostgreSQL data must remain intact; use Prisma schema sync/migrations carefully.
