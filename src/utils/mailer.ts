import nodemailer from "nodemailer"
import { Resend } from "resend"

export type MailPayload = {
  from?: string
  to: string
  subject: string
  html: string
  text?: string
}

export type Mailer = {
  sendMail: (payload: MailPayload) => Promise<{ id?: string }>
}

type MailTransport = "smtp" | "resend"

function isLocalSmtpHost(): boolean {
  const host = process.env.SMTP_EMAIL_HOST?.toLowerCase()
  return host === "127.0.0.1" || host === "localhost"
}

function resolveTransport(): MailTransport {
  const configured = process.env.EMAIL_TRANSPORT?.toLowerCase()

  // Local MailSlurper is the default when configured — Resend sandbox only
  // delivers to the account owner's verified address.
  if (isLocalSmtpHost() && configured !== "resend") {
    return "smtp"
  }

  if (configured === "smtp" || configured === "resend") {
    return configured
  }

  if (process.env.RESEND_API_KEY) {
    return "resend"
  }

  return "smtp"
}

function createSmtpMailer(): Mailer {
  const defaultFrom =
    process.env.SMTP_EMAIL_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    "myartverse@myartverse.com"

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_EMAIL_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_EMAIL_PORT ?? 2500),
    secure: process.env.SMTP_EMAIL_SSL === "true",
    auth:
      process.env.SMTP_EMAIL_USER && process.env.SMTP_EMAIL_PASS
        ? {
            user: process.env.SMTP_EMAIL_USER,
            pass: process.env.SMTP_EMAIL_PASS,
          }
        : undefined,
  })

  return {
    sendMail: async ({ from, to, subject, html, text }) => {
      const info = await transporter.sendMail({
        from: from ?? defaultFrom,
        to,
        subject,
        html,
        text,
      })

      return { id: info.messageId }
    },
  }
}

function createResendMailer(): Mailer {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(apiKey)
  const defaultFrom =
    process.env.RESEND_FROM_EMAIL ??
    process.env.SMTP_EMAIL_FROM ??
    "MyArtverse <onboarding@resend.dev>"

  return {
    sendMail: async ({ from, to, subject, html, text }) => {
      const { data, error } = await resend.emails.send({
        from: from ?? defaultFrom,
        to: [to],
        subject,
        html,
        text,
      })

      if (error) {
        throw new Error(error.message)
      }

      return { id: data?.id }
    },
  }
}

export function createMailer(): Mailer {
  const transport = resolveTransport()
  console.log(`Email transport: ${transport}`)

  if (transport === "smtp") {
    return createSmtpMailer()
  }

  const resendMailer = createResendMailer()

  if (!isLocalSmtpHost()) {
    return resendMailer
  }

  const smtpMailer = createSmtpMailer()

  return {
    sendMail: async (payload) => {
      try {
        return await resendMailer.sendMail(payload)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const isResendSandboxLimit =
          message.includes("only send testing emails") ||
          message.includes("verify a domain at resend.com")

        if (!isResendSandboxLimit) {
          throw error
        }

        console.warn(
          `Resend sandbox blocked delivery to ${payload.to}; falling back to local SMTP (MailSlurper).`
        )
        return smtpMailer.sendMail(payload)
      }
    },
  }
}
