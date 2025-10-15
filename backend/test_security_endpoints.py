#!/usr/bin/env python
"""
Quick test script to verify security endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"


def test_endpoints():
    print("Testing Security Endpoints")
    print("=" * 50)

    # Test 1: Password Policy (public endpoint)
    print("\n1. Testing GET /security/password-policy (public)")
    try:
        response = requests.get(f"{BASE_URL}/security/password-policy")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            print("   ✅ PASS")
        else:
            print(f"   ❌ FAIL: {response.text}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

    # Test 2: Health check
    print("\n2. Testing GET /health")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            print("   ✅ PASS")
        else:
            print(f"   ❌ FAIL")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

    # Test 3: Sessions endpoint (should require auth)
    print("\n3. Testing GET /security/sessions (should require auth)")
    try:
        response = requests.get(f"{BASE_URL}/security/sessions")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ PASS - Correctly requires authentication")
        else:
            print(f"   ❌ FAIL - Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

    # Test 4: Audit logs endpoint (should require auth + admin)
    print("\n4. Testing GET /security/audit-logs (should require auth + admin)")
    try:
        response = requests.get(f"{BASE_URL}/security/audit-logs")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ PASS - Correctly requires authentication")
        else:
            print(f"   ❌ FAIL - Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

    # Test 5: Login attempts endpoint (should require auth)
    print("\n5. Testing GET /security/login-attempts (should require auth)")
    try:
        response = requests.get(f"{BASE_URL}/security/login-attempts")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ PASS - Correctly requires authentication")
        else:
            print(f"   ❌ FAIL - Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")

    print("\n" + "=" * 50)
    print("Tests completed!")
    print("\nNote: Authenticated endpoints correctly return 401")
    print("To test with authentication, login via the frontend")
    print("and use the browser's developer tools to inspect requests")


if __name__ == "__main__":
    test_endpoints()
