export const html = (url: string) => {
  // TODO: Improve HTML Email
  return `
    <body style="background: #fff;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center"
                style="padding: 20px 0px 20px 0px; font-size: 32px; font-family: Inter, Arial, sans-serif; color: #000;">
                <strong>MyArtverse</strong>
            </td>
        </tr>
    </table>
    <table width="100%" border="0" cellspacing="20" cellpadding="0"
        style="background: #fff; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
            <td align="center"
                style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Inter, Helvetica, Arial, sans-serif; color: #000;">
                Welcome to MyArtverse! <br /><br />
                Please verify your email address to continue.
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" style="border-radius: 5px;" bgcolor="#C5B8FE">
                            <a href="${url}" target="_blank"
                                style="font-size: 18px; font-family: Inter, Helvetica, Arial, sans-serif; color: #0A031A; text-decoration: none; text-decoration: none;border-radius: 5px; padding: 10px 20px; border: 1px solid #0A031A; display: inline-block; font-weight: bold;">
                                Verify Email
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center"
                style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Inter, Helvetica, Arial, sans-serif; color: #000;">
                If you did not sign up for this account, you can ignore this email.
            </td>
        </tr>
    </table>
</body>
    `
}
