# Invoice PDF email

The ERP sends invoice PDFs through the Resend API.

Configure these environment variables on the server/container:

- `RESEND_API_KEY` — your Resend API key.
- `MAIL_FROM` — a sender address/domain verified in Resend, for example `RESQ <invoices@yourdomain.com>`.

The Invoices screen has an Email PDF action. It opens a form for recipient, subject and message. The server generates the same invoice PDF and attaches it to the email.

Do not commit the API key to GitHub. Set it as an environment/secret on the Zima deployment.
