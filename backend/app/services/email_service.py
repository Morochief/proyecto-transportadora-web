import smtplib
from email.message import EmailMessage
from typing import Optional

from flask import current_app


def send_email(recipient: str, subject: str, html_body: str, text_body: Optional[str] = None) -> None:
    cfg = current_app.config
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{cfg['SMTP_FROM_NAME']} <{cfg['SMTP_FROM_EMAIL']}>"
    msg['To'] = recipient
    if text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype='html')
    else:
        msg.set_content(html_body, subtype='html')

    host = cfg['SMTP_HOST']
    port = cfg['SMTP_PORT']
    username = cfg.get('SMTP_USERNAME')
    password = cfg.get('SMTP_PASSWORD')
    use_tls = cfg.get('SMTP_USE_TLS', False)

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        if use_tls:
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(msg)
