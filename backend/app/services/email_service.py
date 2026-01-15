import smtplib
from email.message import EmailMessage
from typing import Optional

from flask import current_app


def _extract_domain(email: str) -> str:
    if "@" not in email:
        return ""
    return email.split("@", 1)[1].strip().lower()


def _default_smtp_config(cfg):
    return {
        "host": cfg["SMTP_HOST"],
        "port": cfg["SMTP_PORT"],
        "username": cfg.get("SMTP_USERNAME"),
        "password": cfg.get("SMTP_PASSWORD"),
        "use_tls": cfg.get("SMTP_USE_TLS", False),
        "from_email": cfg.get("SMTP_FROM_EMAIL"),
        "from_name": cfg.get("SMTP_FROM_NAME"),
    }


def _routed_smtp_config(cfg, recipient: str):
    routes = cfg.get("SMTP_DOMAIN_ROUTES") or {}
    domain = _extract_domain(recipient)
    profile = routes.get(domain)
    if not profile:
        return _default_smtp_config(cfg)

    profiles = cfg.get("SMTP_PROFILE_SETTINGS") or {}
    profile_key = profile.strip().upper()
    profile_cfg = profiles.get(profile_key)
    if not profile_cfg or not profile_cfg.get("host") or not profile_cfg.get("port"):
        return _default_smtp_config(cfg)

    return {
        "host": profile_cfg["host"],
        "port": profile_cfg["port"],
        "username": profile_cfg.get("username"),
        "password": profile_cfg.get("password"),
        "use_tls": profile_cfg.get("use_tls", False),
        "from_email": profile_cfg.get("from_email") or cfg.get("SMTP_FROM_EMAIL"),
        "from_name": profile_cfg.get("from_name") or cfg.get("SMTP_FROM_NAME"),
    }


def send_email(recipient: str, subject: str, html_body: str, text_body: Optional[str] = None) -> None:
    cfg = current_app.config
    smtp_cfg = _routed_smtp_config(cfg, recipient)
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{smtp_cfg['from_name']} <{smtp_cfg['from_email']}>"
    msg['To'] = recipient
    if text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype='html')
    else:
        msg.set_content(html_body, subtype='html')

    host = smtp_cfg['host']
    port = smtp_cfg['port']
    username = smtp_cfg.get('username')
    password = smtp_cfg.get('password')
    use_tls = smtp_cfg.get('use_tls', False)

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        if use_tls:
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(msg)
