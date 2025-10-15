# Security Features Documentation

## Overview

This document describes the comprehensive security features implemented in the Transportation/Logistics Web Application.

## Table of Contents

1. [User Profile & Password Management](#user-profile--password-management)
2. [Session Management](#session-management)
3. [Audit Log Viewer](#audit-log-viewer)
4. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
5. [Password Policy](#password-policy)
6. [API Endpoints](#api-endpoints)

---

## User Profile & Password Management

### Location
- **Frontend Route:** `/perfil`
- **Component:** `frontend/src/pages/Profile.js`

### Features

#### Personal Information Display
- Full name and email
- User roles with visual badges
- MFA status indicator
- Last login timestamp

#### Recent Login Activity
- Displays last 5 login attempts
- Shows success/failure status
- IP address and user agent information
- Timestamps for each attempt

#### Password Change
- Current password verification
- Real-time password strength meter
- Visual password policy requirements
- Policy compliance indicators:
  - Minimum length (8+ characters)
  - Uppercase letters
  - Lowercase letters
  - Numbers
  - Special characters

#### Multi-Factor Authentication
- QR code enrollment workflow
- TOTP-based authentication
- Backup codes generation
- Step-by-step setup instructions
- Enable/disable MFA functionality

### UI Components Used
- `Toast` - Success/error notifications
- `PasswordStrength` - Real-time password strength visualization

---

## Session Management

### Location
- **Frontend Route:** `/sesiones`
- **Component:** `frontend/src/pages/Sessions.js`

### Features

#### Active Sessions List
- All active refresh tokens for the current user
- Session information displayed:
  - Browser and operating system
  - IP address
  - Creation timestamp
  - Expiration timestamp
  - Current session indicator

#### Session Actions
- **Revoke Individual Session:** Close a specific session
- **Revoke All Sessions:** Close all sessions except the current one
- **Expiration Warning:** Visual indicator for sessions expiring within 24 hours

#### Security Benefits
- Detect unauthorized access
- Remotely logout from compromised devices
- Monitor active sessions across multiple devices

### User Agent Parsing
Automatically detects:
- **Browsers:** Chrome, Firefox, Safari, Edge
- **Operating Systems:** Windows, macOS, Linux, Android, iOS

---

## Audit Log Viewer

### Location
- **Frontend Route:** `/audit-logs` (Admin Only)
- **Component:** `frontend/src/pages/AuditLogs.js`

### Features

#### Comprehensive Logging
All security-related events are logged:
- `login.success` - Successful authentication
- `logout` - User logout
- `password.change` - Password updated
- `password.reset.request` - Password reset initiated
- `password.reset.complete` - Password reset completed
- `mfa.enabled` - MFA activated
- `mfa.disabled` - MFA deactivated
- `session.revoked` - Single session closed
- `sessions.revoked_all` - All sessions closed
- `user.register` - New user created

#### Advanced Filtering
- **By Action:** Filter specific event types
- **By Level:** INFO, WARNING, ERROR, CRITICAL
- **By Date Range:** Start and end date
- **By Search:** IP address or action text search
- **By User:** Filter by user ID

#### Audit Log Information
Each log entry contains:
- Timestamp (with seconds precision)
- User email and display name
- Action type (as badge)
- Security level (with icon)
- IP address
- User agent
- Metadata (JSON expandable)

#### Export Functionality
- **CSV Export:** Download filtered logs
- Includes: ID, Date, User, Action, Level, IP

#### Pagination
- Configurable results per page (default: 20)
- Navigation between pages
- Total count display

### Security Levels

| Level | Icon | Color | Use Case |
|-------|------|-------|----------|
| INFO | ℹ️ | Blue | Normal operations |
| WARNING | ⚠️ | Yellow | Suspicious activity |
| ERROR | ❌ | Red | Failed operations |
| CRITICAL | 🔥 | Pink | Security breaches |

---

## Multi-Factor Authentication (MFA)

### Implementation
- **Method:** TOTP (Time-based One-Time Password)
- **Compatible Apps:** Google Authenticator, Authy, Microsoft Authenticator
- **Secret Encryption:** AES-256 encryption for MFA secrets
- **Backup Codes:** 10 single-use recovery codes

### MFA Enrollment Flow

1. **Initiate Enrollment**
   - POST `/api/auth/mfa/enroll`
   - Generates encrypted secret
   - Creates 10 backup codes

2. **User Setup**
   - Scan QR code or manually enter secret
   - Save backup codes in secure location

3. **Verification**
   - POST `/api/auth/mfa/verify` with 6-digit code
   - Activates MFA on account

4. **Login with MFA**
   - Enter username/password
   - If MFA enabled, provide TOTP code or backup code
   - Receive access & refresh tokens

### Backup Codes
- **Count:** 10 codes generated
- **Format:** Alphanumeric strings
- **Single Use:** Each code can only be used once
- **Hashed Storage:** Stored as salted hashes
- **Display:** One-time display during enrollment

---

## Password Policy

### Requirements (Configurable)

```python
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = True
PASSWORD_HISTORY_LIMIT = 5  # Cannot reuse last 5 passwords
PASSWORD_EXPIRATION_DAYS = 90  # Force change after 90 days
```

### Password History
- Stores hashed passwords in `password_history` table
- Prevents reuse of recent passwords
- Configurable history limit

### Password Metadata
- `password_changed_at` - Timestamp of last change
- `password_expires_at` - Calculated expiration date
- `failed_login_attempts` - Counter for rate limiting

### Account Locking
- **Threshold:** 5 failed attempts within 15 minutes
- **Lock Duration:** 15 minutes
- **Auto-unlock:** Automatic after lock period expires

---

## API Endpoints

### Security Endpoints

#### Get User Sessions
```http
GET /api/security/sessions
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "id": 123,
    "token_id": "abc123...",
    "created_at": "2024-01-15T10:30:00",
    "expires_at": "2024-01-22T10:30:00",
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "is_current": true
  }
]
```

#### Revoke Session
```http
DELETE /api/security/sessions/{session_id}
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "ok"
}
```

#### Revoke All Sessions
```http
POST /api/security/sessions/revoke-all
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "status": "ok",
  "revoked_count": 3
}
```

#### Get Audit Logs (Admin Only)
```http
GET /api/security/audit-logs?page=1&per_page=20&action=login&level=INFO
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Results per page (default: 50, max: 100)
- `user_id` - Filter by user ID
- `action` - Filter by action type
- `level` - Filter by level (INFO, WARNING, ERROR, CRITICAL)
- `start_date` - ISO 8601 date string
- `end_date` - ISO 8601 date string
- `search` - Search in action or IP

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_id": 5,
      "user_email": "user@example.com",
      "user_name": "John Doe",
      "action": "login.success",
      "level": "INFO",
      "ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "metadata": {},
      "created_at": "2024-01-15T10:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Get Available Actions
```http
GET /api/security/audit-logs/actions
Authorization: Bearer {access_token}
```

**Response:**
```json
["login.success", "logout", "password.change", "mfa.enabled", ...]
```

#### Get Login Attempts
```http
GET /api/security/login-attempts
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "id": 1,
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "success": true,
    "mfa_required": true,
    "created_at": "2024-01-15T10:30:00"
  }
]
```

#### Get Password Policy
```http
GET /api/security/password-policy
```

**Response:**
```json
{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_digit": true,
  "require_special": true,
  "history_limit": 5,
  "expiration_days": 90
}
```

### Authentication Endpoints

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

#### MFA Enrollment
```http
POST /api/auth/mfa/enroll
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "secret": "BASE32ENCODEDSECRET",
  "otpauth_url": "otpauth://totp/App:user@example.com?secret=...",
  "backup_codes": ["ABC123", "DEF456", ...]
}
```

#### MFA Verification
```http
POST /api/auth/mfa/verify
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "123456"
}
```

#### Disable MFA
```http
POST /api/auth/mfa/disable
Authorization: Bearer {access_token}
```

---

## Database Schema

### New Security Tables

#### `audit_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to usuarios |
| action | String(120) | Action identifier |
| metadata_json | JSON | Additional data |
| ip | String(45) | IP address |
| user_agent | String(255) | Browser info |
| level | String(20) | INFO/WARNING/ERROR/CRITICAL |
| created_at | DateTime | Timestamp |

#### `login_attempts`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to usuarios |
| email | String(255) | Email attempted |
| ip | String(45) | IP address |
| user_agent | String(255) | Browser info |
| success | Boolean | Login result |
| mfa_required | Boolean | MFA was required |
| created_at | DateTime | Timestamp |

#### `refresh_tokens`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to usuarios |
| token_id | String(64) | Unique token ID |
| token_hash | String(256) | Hashed token |
| created_at | DateTime | Creation time |
| expires_at | DateTime | Expiration time |
| revoked_at | DateTime | Revocation time |
| replaced_by_token_id | String(64) | Rotation tracking |
| ip | String(45) | IP address |
| user_agent | String(255) | Browser info |

#### `password_history`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to usuarios |
| password_hash | String(256) | Old password hash |
| created_at | DateTime | When password was set |

#### `backup_codes`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to usuarios |
| code_hash | String(256) | Hashed backup code |
| salt | String(128) | Unique salt |
| used | Boolean | Whether code was used |
| used_at | DateTime | When code was used |
| created_at | DateTime | Creation time |

---

## Security Best Practices Implemented

### Authentication
- ✅ JWT with short-lived access tokens (15 minutes)
- ✅ Long-lived refresh tokens (7 days)
- ✅ Refresh token rotation
- ✅ Password hashing with PBKDF2-SHA256
- ✅ MFA with TOTP
- ✅ Backup codes for MFA recovery

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Route-level permission checks
- ✅ Admin-only endpoints

### Rate Limiting
- ✅ Login attempt tracking
- ✅ Account locking after failed attempts
- ✅ IP-based rate limiting
- ✅ Exponential backoff

### Audit & Monitoring
- ✅ Comprehensive audit logging
- ✅ Login attempt tracking
- ✅ Session monitoring
- ✅ Security event levels

### Password Security
- ✅ Strong password policy
- ✅ Password complexity requirements
- ✅ Password history tracking
- ✅ Password expiration (90 days)
- ✅ Real-time password strength feedback

### Session Security
- ✅ Session management dashboard
- ✅ Remote session revocation
- ✅ Session expiration
- ✅ Device/browser tracking

---

## Future Enhancements

### Potential Improvements
1. **Email Notifications**
   - New login alerts
   - Password change confirmations
   - MFA enrollment confirmations
   - Suspicious activity alerts

2. **Advanced Analytics**
   - Security dashboard with charts
   - Failed login attempt visualization
   - Geographic login map
   - Peak activity times

3. **Enhanced MFA**
   - WebAuthn/FIDO2 support
   - SMS-based OTP
   - Email-based OTP
   - Hardware token support

4. **IP Whitelisting**
   - Trusted IP management
   - Geographic restrictions
   - VPN detection

5. **Security Policies**
   - Configurable password policies per role
   - Session timeout customization
   - Mandatory MFA for admins
   - Password reset frequency limits

---

## Configuration

All security settings are configurable in `backend/config.py`:

```python
# Password Policy
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = True
PASSWORD_HISTORY_LIMIT = 5
PASSWORD_EXPIRATION_DAYS = 90

# Session & Token
ACCESS_TOKEN_EXPIRATION_MINUTES = 15
REFRESH_TOKEN_EXPIRATION_DAYS = 7
ROTATE_REFRESH_TOKENS = True

# Account Security
LOGIN_RATE_LIMIT_PER_MINUTE = 5
ACCOUNT_LOCK_THRESHOLD = 5
ACCOUNT_LOCK_WINDOW_MINUTES = 15

# MFA
MFA_ISSUER = "Sistema Logistico"
MFA_BACKUP_CODES = 10

# Audit
ENABLE_SIEM_HOOKS = False  # Enable for external SIEM integration
AUDIT_SIEM_ENDPOINT = None
AUDIT_SIEM_TOKEN = None
```

---

## Testing

### Manual Testing Checklist

#### Profile Management
- [ ] View profile information
- [ ] See recent login attempts
- [ ] Change password with valid input
- [ ] Attempt password change with weak password
- [ ] Verify password strength meter updates

#### MFA
- [ ] Enroll in MFA
- [ ] Verify with TOTP code
- [ ] Login with MFA enabled
- [ ] Use backup code
- [ ] Disable MFA

#### Session Management
- [ ] View active sessions
- [ ] Revoke individual session
- [ ] Revoke all sessions
- [ ] Verify session expiration

#### Audit Logs (Admin)
- [ ] View audit logs
- [ ] Filter by action
- [ ] Filter by date range
- [ ] Search logs
- [ ] Export to CSV

---

## Troubleshooting

### Common Issues

**Issue:** Cannot login after enabling MFA
- **Solution:** Use backup codes provided during enrollment

**Issue:** Password policy too strict
- **Solution:** Adjust settings in `config.py` and restart backend

**Issue:** Session revoked unexpectedly
- **Solution:** Check session expiration settings, verify refresh token rotation

**Issue:** Audit logs not showing
- **Solution:** Verify user has admin role, check database migration

---

## Support

For issues or questions about security features:
1. Check this documentation
2. Review audit logs for security events
3. Verify configuration in `config.py`
4. Check browser console for frontend errors
5. Review backend logs for authentication issues

---

**Last Updated:** 2025-01-15
**Version:** 2.0
